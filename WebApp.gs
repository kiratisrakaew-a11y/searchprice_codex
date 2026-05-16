/**
 * Milestone 11 WebApp endpoints for Phase 1 search and manual result selection.
 * The WebApp reads MASTER_PRICE_DATABASE and writes only SEARCH_LOG through the
 * existing search logging helpers. It must not edit raw, staging, master, or alias sheets.
 */
const WEBAPP_RESULT_DISPLAY_FIELDS = Object.freeze([
  'master_id',
  'item_name',
  'unit',
  'material_cost',
  'labor_cost',
  'total_cost',
  'price_basis',
  'note',
  'match_score',
  'needs_review'
]);

/**
 * Serves the simple Phase 1 search UI.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Phase 1 Price Search')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Searches MASTER_PRICE_DATABASE for the WebApp. This delegates to the Phase 1
 * search engine, which writes SEARCH_LOG and returns result cards without
 * source_name, source_type, or match_reason.
 */
function webAppSearchPrices(query, sessionId, priceFilter) {
  var result = searchMasterPriceDatabase(query, {
    triggered_by: 'webapp',
    session_id: sessionId || '',
    price_basis_filter: priceFilter || 'all'
  });
  if (!result.ok) {
    return result;
  }

  return okResult_({
    query: result.data.query,
    normalized_query: result.data.normalized_query,
    results: sanitizeSearchResultCardsForWebApp_(result.data.results || []),
    nearby_results: sanitizeSearchResultCardsForWebApp_(result.data.nearby_results || []),
    suggested_terms: result.data.suggested_terms || [],
    no_direct_match: result.data.no_direct_match === true,
    session_id: result.data.session_id
  });
}

/**
 * Returns a selected item detail object after the user clicks a result card.
 * This function does not update master data; it only records the selected
 * master id in SEARCH_LOG when a session id is available.
 */
function webAppGetSelectedItemDetail(selectedMasterId, sessionId) {
  var masterId = cleanDisplayText_(selectedMasterId);
  if (!masterId) {
    return failResult_(createError_('missing_selected_master_id', 'Please select a search result first.', {}, 'warning'));
  }

  var rowResult = findMasterRowById_(masterId);
  if (!rowResult.ok) {
    return rowResult;
  }

  if (sessionId) {
    updateSearchLogSelection_(cleanDisplayText_(sessionId), masterId, { triggered_by: 'webapp' });
  }

  return okResult_({
    selected_item: toSelectedItemReadOnlyDetail_(rowResult.data.row),
    read_only: true,
    writes_allowed: [PHASE1_SHEETS.SEARCH_LOG]
  });
}

function findMasterRowById_(masterId, options) {
  var readResult = readSheetRowsByHeader_(PHASE1_SHEETS.MASTER, {
    spreadsheet: options && options.spreadsheet,
    required_headers: PHASE1_SCHEMAS.MASTER_PRICE_DATABASE
  });
  if (!readResult.ok) {
    return readResult;
  }

  var found = (readResult.data.rows || []).filter(function(row) {
    return String(row.master_id || '') === String(masterId || '');
  })[0];

  if (!found) {
    return failResult_(createError_('selected_master_id_not_found', 'Selected item was not found in MASTER_PRICE_DATABASE.', { master_id: masterId }, 'warning'));
  }

  return okResult_({ row: found });
}

function toSelectedItemReadOnlyDetail_(row) {
  return {
    master_id: row.master_id,
    item_name: row.item_name_clean || row.item_name_original,
    unit: row.unit,
    material_cost: row.material_cost,
    labor_cost: row.labor_cost,
    total_cost: row.total_cost,
    price_basis: row.price_basis,
    note: row.note,
    needs_review: row.data_status === 'needs_review' ? 'yes' : '',
    effective_year: row.effective_year,
    effective_month: row.effective_month,
    read_only: true
  };
}

function sanitizeSearchResultCardsForWebApp_(cards) {
  return (cards || []).map(function(card) {
    return WEBAPP_RESULT_DISPLAY_FIELDS.reduce(function(safeCard, fieldName) {
      safeCard[fieldName] = Object.prototype.hasOwnProperty.call(card, fieldName) ? card[fieldName] : '';
      return safeCard;
    }, {});
  });
}

/**
 * Compares user-entered price against the manually selected master row.
 * This is read-only: it does not write COMPARISON_LOG or any source/staging/master sheet.
 */
function webAppCompareSelectedPrice(payload) {
  var input = payload || {};
  var masterId = cleanDisplayText_(input.selected_master_id);
  if (!masterId) {
    return failResult_(createError_('missing_selected_master_id', 'Please select a search result before comparing.', {}, 'warning'));
  }

  var rowResult = findMasterRowById_(masterId);
  if (!rowResult.ok) {
    return rowResult;
  }

  return compareUserPriceToMaster_(rowResult.data.row, {
    user_price: input.user_price,
    user_unit: input.user_unit,
    user_quantity: input.user_quantity,
    user_price_type: input.user_price_type || 'unknown',
    user_note: input.user_note
  });
}
