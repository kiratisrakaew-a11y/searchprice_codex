/**
 * Milestone 10 Phase 1 search engine over MASTER_PRICE_DATABASE only.
 * Gemini is intentionally not used here.
 */
const SEARCH_RESULT_LIMIT = 10;
const SEARCH_DIRECT_MATCH_THRESHOLD = 20;
const SEARCH_FIELDS = Object.freeze([
  'item_name_original',
  'item_name_clean',
  'category_level_1',
  'category_level_2',
  'category_level_3',
  'unit',
  'note',
  'search_keywords',
  'alias_terms',
  'normalized_text'
]);

const SEARCH_FIELD_WEIGHTS = Object.freeze({
  item_name_clean: 100,
  item_name_original: 90,
  search_keywords: 80,
  alias_terms: 75,
  category_level_3: 60,
  category_level_2: 50,
  category_level_1: 40,
  unit: 25,
  note: 20,
  normalized_text: 15
});

function searchMasterPriceDatabase(query, options) {
  var opts = options || {};
  var startedAt = getCurrentTimestamp_();
  var normalizedQuery = normalizeSearchQuery_(query);
  var sessionId = opts.session_id || generateSearchId_();

  if (!normalizedQuery) {
    var emptyResult = okResult_({
      query: query || '',
      normalized_query: normalizedQuery,
      results: [],
      nearby_results: [],
      suggested_terms: [],
      no_direct_match: true,
      session_id: sessionId
    });
    writeSearchLog_({
      searched_at: startedAt,
      user_query: query || '',
      normalized_query: normalizedQuery,
      result_count: 0,
      top_match_id: '',
      top_match_score: '',
      no_result_flag: 'yes',
      suggested_terms: '',
      user_selected_master_id: '',
      feedback: '',
      session_id: sessionId
    }, opts);
    return emptyResult;
  }

  var readResult = readSheetRowsByHeader_(PHASE1_SHEETS.MASTER, {
    spreadsheet: opts.spreadsheet,
    required_headers: PHASE1_SCHEMAS.MASTER_PRICE_DATABASE
  });
  if (!readResult.ok) {
    return readResult;
  }

  var scoredResults = readResult.data.rows.map(function(row) {
    return scoreMasterRowForQuery_(row, normalizedQuery);
  }).filter(function(scored) {
    return scored.match_score > 0;
  }).sort(function(left, right) {
    return right.match_score - left.match_score;
  });

  var directResults = scoredResults.filter(function(scored) {
    return scored.match_score >= SEARCH_DIRECT_MATCH_THRESHOLD;
  });
  var chosenResults = (directResults.length ? directResults : scoredResults).slice(0, SEARCH_RESULT_LIMIT);
  var resultCards = chosenResults.map(toSearchResultCard_);
  var suggestions = buildSuggestedTerms_(scoredResults, normalizedQuery);
  var noDirectMatch = directResults.length === 0;

  var topResult = resultCards[0] || null;
  writeSearchLog_({
    searched_at: startedAt,
    user_query: query || '',
    normalized_query: normalizedQuery,
    result_count: resultCards.length,
    top_match_id: topResult ? topResult.master_id : '',
    top_match_score: topResult ? topResult.match_score : '',
    no_result_flag: resultCards.length ? 'no' : 'yes',
    suggested_terms: suggestions.join(', '),
    user_selected_master_id: '',
    feedback: '',
    session_id: sessionId
  }, opts);

  return okResult_({
    query: query || '',
    normalized_query: normalizedQuery,
    results: resultCards,
    nearby_results: noDirectMatch ? resultCards : [],
    suggested_terms: suggestions,
    no_direct_match: noDirectMatch,
    session_id: sessionId
  });
}

function normalizeSearchQuery_(query) {
  return normalizeTextPreservingSpecs_(query);
}

function scoreMasterRowForQuery_(row, normalizedQuery) {
  var queryTokens = tokenizeSearchText_(normalizedQuery);
  var bestScore = 0;

  SEARCH_FIELDS.forEach(function(fieldName) {
    var fieldValue = row[fieldName] || '';
    var normalizedField = normalizeTextPreservingSpecs_(fieldValue);
    if (!normalizedField) {
      return;
    }

    var baseWeight = SEARCH_FIELD_WEIGHTS[fieldName] || 10;
    var fieldScore = calculateFieldMatchScore_(normalizedField, normalizedQuery, queryTokens, baseWeight, fieldName);
    bestScore = Math.max(bestScore, fieldScore);
  });

  return {
    row: row,
    match_score: Math.round(bestScore * 100) / 100
  };
}

function calculateFieldMatchScore_(normalizedField, normalizedQuery, queryTokens, baseWeight, fieldName) {
  if (normalizedField === normalizedQuery) {
    return baseWeight;
  }

  if (normalizedField.indexOf(normalizedQuery) !== -1) {
    return baseWeight * 0.85;
  }

  var fieldTokens = tokenizeSearchText_(normalizedField);
  var tokenScore = calculateTokenMatchScore_(fieldTokens, queryTokens, baseWeight);
  var aliasBonus = fieldName === 'alias_terms' && tokenScore > 0 ? 10 : 0;
  var fuzzyScore = calculateSimpleFuzzyScore_(fieldTokens, queryTokens, baseWeight);
  return Math.max(tokenScore + aliasBonus, fuzzyScore);
}

function calculateTokenMatchScore_(fieldTokens, queryTokens, baseWeight) {
  if (!fieldTokens.length || !queryTokens.length) {
    return 0;
  }

  var fieldSet = fieldTokens.reduce(function(map, token) {
    map[token] = true;
    return map;
  }, {});
  var matched = queryTokens.filter(function(token) {
    return fieldSet[token] || fieldTokens.some(function(fieldToken) {
      return fieldToken.indexOf(token) !== -1 || token.indexOf(fieldToken) !== -1;
    });
  }).length;

  if (!matched) {
    return 0;
  }
  return baseWeight * 0.65 * (matched / queryTokens.length);
}

function calculateSimpleFuzzyScore_(fieldTokens, queryTokens, baseWeight) {
  if (!fieldTokens.length || !queryTokens.length) {
    return 0;
  }

  var fuzzyMatches = 0;
  queryTokens.forEach(function(queryToken) {
    if (queryToken.length < 3) {
      return;
    }
    var matched = fieldTokens.some(function(fieldToken) {
      if (Math.abs(fieldToken.length - queryToken.length) > 2) {
        return false;
      }
      return calculateLevenshteinDistance_(fieldToken, queryToken) <= Math.max(1, Math.floor(queryToken.length * 0.25));
    });
    if (matched) {
      fuzzyMatches += 1;
    }
  });

  if (!fuzzyMatches) {
    return 0;
  }
  return baseWeight * 0.45 * (fuzzyMatches / queryTokens.length);
}

function calculateLevenshteinDistance_(left, right) {
  var a = String(left || '');
  var b = String(right || '');
  var matrix = [];
  for (var i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (var j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (var rowIndex = 1; rowIndex <= b.length; rowIndex++) {
    for (var colIndex = 1; colIndex <= a.length; colIndex++) {
      if (b.charAt(rowIndex - 1) === a.charAt(colIndex - 1)) {
        matrix[rowIndex][colIndex] = matrix[rowIndex - 1][colIndex - 1];
      } else {
        matrix[rowIndex][colIndex] = Math.min(
          matrix[rowIndex - 1][colIndex - 1] + 1,
          matrix[rowIndex][colIndex - 1] + 1,
          matrix[rowIndex - 1][colIndex] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function toSearchResultCard_(scored) {
  var row = scored.row;
  return {
    master_id: row.master_id,
    item_name: row.item_name_clean || row.item_name_original,
    unit: row.unit,
    material_cost: row.material_cost,
    labor_cost: row.labor_cost,
    total_cost: row.total_cost,
    price_basis: row.price_basis,
    note: row.note,
    match_score: scored.match_score,
    needs_review: row.data_status === 'needs_review' ? 'yes' : ''
  };
}

function buildSuggestedTerms_(scoredResults, normalizedQuery) {
  var suggestions = [];
  scoredResults.slice(0, 5).forEach(function(scored) {
    ['item_name_clean', 'category_level_3', 'category_level_2', 'alias_terms'].forEach(function(fieldName) {
      tokenizeSearchText_(scored.row[fieldName] || '').forEach(function(token) {
        if (token && token !== normalizedQuery && suggestions.indexOf(token) === -1 && suggestions.length < 8) {
          suggestions.push(token);
        }
      });
    });
  });
  return suggestions;
}

function writeSearchLog_(record, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var ensureResult = ensureSearchLogSheetReady_(spreadsheet);
  if (!ensureResult.ok) {
    return ensureResult;
  }

  var normalizedRecord = normalizeSearchLogRecord_(record || {});
  return appendRowsByHeader_(PHASE1_SHEETS.SEARCH_LOG, normalizedRecord, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.SEARCH_LOG
  });
}

function ensureSearchLogSheetReady_(spreadsheet) {
  var result = ensureSheetWithHeader_(spreadsheet, PHASE1_SHEETS.SEARCH_LOG, PHASE1_SCHEMAS.SEARCH_LOG);
  var sheetResult = validateSinglePhase1Sheet_(PHASE1_SHEETS.SEARCH_LOG, result.sheet);
  if (!sheetResult.ok) {
    return failResult_(createError_('search_log_schema_invalid', 'SEARCH_LOG schema is invalid', { errors: sheetResult.errors }, 'critical'));
  }
  return okResult_({ sheet: result.sheet, write: result.write });
}

function normalizeSearchLogRecord_(record) {
  return {
    search_id: record.search_id || generateSearchId_(),
    searched_at: record.searched_at || getCurrentTimestamp_(),
    user_query: cleanDisplayText_(record.user_query),
    normalized_query: cleanDisplayText_(record.normalized_query),
    result_count: valueOrBlank_(record.result_count),
    top_match_id: cleanDisplayText_(record.top_match_id),
    top_match_score: valueOrBlank_(record.top_match_score),
    no_result_flag: cleanDisplayText_(record.no_result_flag || 'no'),
    suggested_terms: cleanDisplayText_(record.suggested_terms),
    user_selected_master_id: cleanDisplayText_(record.user_selected_master_id),
    feedback: cleanDisplayText_(record.feedback),
    session_id: cleanDisplayText_(record.session_id)
  };
}

function updateSearchLogSelection_(sessionId, selectedMasterId, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var sheet = getSheetByName_(spreadsheet, PHASE1_SHEETS.SEARCH_LOG);
  if (!sheet) {
    return failResult_(createError_('search_log_missing', 'SEARCH_LOG sheet not found', {}, 'warning'));
  }
  var headerMap = getHeaderMapForSheet_(sheet);
  var sessionColumn = getColumnNumberByHeader_(headerMap, 'session_id');
  var selectedColumn = getColumnNumberByHeader_(headerMap, 'user_selected_master_id');
  if (!sessionColumn || !selectedColumn) {
    return failResult_(createError_('search_log_header_missing', 'SEARCH_LOG selection headers missing', {}, 'warning'));
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return okResult_({ updated: false });
  }
  var sessions = sheet.getRange(2, sessionColumn, lastRow - 1, 1).getDisplayValues();
  for (var index = sessions.length - 1; index >= 0; index--) {
    if (sessions[index][0] === sessionId) {
      var rowNumber = index + 2;
      sheet.getRange(rowNumber, selectedColumn).setValue(selectedMasterId);
      return okResult_({ updated: true, row_number: rowNumber });
    }
  }
  return okResult_({ updated: false });
}
