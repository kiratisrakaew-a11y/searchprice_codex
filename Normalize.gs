/**
 * Milestone 5 normalization orchestration into STAGING_NORMALIZED.
 * STAGING_NORMALIZED is an internal processing sheet only; WebApp must not read it.
 */
function processSelectedSourceToStaging(sourceName, options) {
  var opts = options || {};
  var startedAt = getCurrentTimestamp_();
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var sourceConfig = getRawMappingConfig_(sourceName);
  if (!sourceConfig) {
    return failResult_(createError_('unknown_source', 'Unknown source selected for staging: ' + sourceName, { source_name: sourceName }, 'critical'));
  }

  var setupResult = ensureStagingSheetReady_(spreadsheet);
  if (!setupResult.ok) {
    return setupResult;
  }

  var aliasResult = loadActiveAliasDictionary_(spreadsheet);
  if (!aliasResult.ok) {
    return aliasResult;
  }

  var normalizeResult = normalizeRawSourceSheet_(sourceName, {
    spreadsheet: spreadsheet,
    staged_at: startedAt,
    aliases: aliasResult.data.aliases,
    skip_blank_rows: true
  });
  if (!normalizeResult.ok) {
    return normalizeResult;
  }

  var clearResult = clearStagingDataRows_(spreadsheet);
  if (!clearResult.ok) {
    return clearResult;
  }

  var appendResult = appendRowsByHeader_(PHASE1_SHEETS.STAGING, normalizeResult.data.rows, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.STAGING_NORMALIZED,
    guard: {
      reason: 'Replace STAGING_NORMALIZED with normalized rows for source: ' + sourceName
    }
  });
  if (!appendResult.ok) {
    return appendResult;
  }

  return okResult_({
    source_name: sourceName,
    row_count: normalizeResult.data.row_count,
    staging_sheet: PHASE1_SHEETS.STAGING,
    clear: clearResult.data,
    append: appendResult.data,
    started_at: startedAt,
    finished_at: getCurrentTimestamp_()
  });
}

function processLaborCostCgdToStaging() {
  return processSelectedSourceToStaging(PHASE1_SHEETS.LABOR_CGD, { triggered_by: 'manual' });
}

function processLaborCostObecToStaging() {
  return processSelectedSourceToStaging(PHASE1_SHEETS.LABOR_OBEC, { triggered_by: 'manual' });
}

function processMaterialCostObecToStaging() {
  return processSelectedSourceToStaging(PHASE1_SHEETS.MATERIAL_OBEC, { triggered_by: 'manual' });
}

function processMaterialCostTpsoToStaging() {
  return processSelectedSourceToStaging(PHASE1_SHEETS.MATERIAL_TPSO, { triggered_by: 'manual' });
}

function ensureStagingSheetReady_(spreadsheet) {
  var result = ensureSheetWithHeader_(spreadsheet, PHASE1_SHEETS.STAGING, PHASE1_SCHEMAS.STAGING_NORMALIZED);
  var sheetResult = validateSinglePhase1Sheet_(PHASE1_SHEETS.STAGING, result.sheet);
  if (!sheetResult.ok) {
    return failResult_(createError_(
      'staging_schema_invalid',
      'STAGING_NORMALIZED schema is invalid',
      { errors: sheetResult.errors },
      'critical'
    ));
  }

  return okResult_({ sheet: result.sheet, write: result.write });
}

function clearStagingDataRows_(spreadsheet) {
  var stagingSheet = getSheetByName_(spreadsheet, PHASE1_SHEETS.STAGING);
  if (!stagingSheet) {
    return failResult_(createError_('sheet_not_found', 'Sheet not found: ' + PHASE1_SHEETS.STAGING, { sheet_name: PHASE1_SHEETS.STAGING }, 'critical'));
  }

  if (stagingSheet.getLastRow() < 2) {
    return okResult_({ sheet_name: PHASE1_SHEETS.STAGING, cleared_range_a1: '', skipped: true });
  }

  var lastRow = stagingSheet.getLastRow();
  var lastColumn = Math.max(stagingSheet.getLastColumn(), PHASE1_SCHEMAS.STAGING_NORMALIZED.length);
  var rangeA1 = 'A2:' + columnNumberToLetter_(lastColumn) + lastRow;
  return safeClearRange_(PHASE1_SHEETS.STAGING, rangeA1, {
    confirmed: true,
    reason: 'Clear staging data rows before processing selected source'
  }, { spreadsheet: spreadsheet });
}

function loadActiveAliasDictionary_(spreadsheet) {
  var aliasSheet = getSheetByName_(spreadsheet, PHASE1_SHEETS.ALIAS);
  if (!aliasSheet) {
    return okResult_({ aliases: [] });
  }

  var readResult = readSheetRowsByHeader_(PHASE1_SHEETS.ALIAS, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.ALIAS_DICTIONARY
  });
  if (!readResult.ok) {
    return readResult;
  }

  var aliases = readResult.data.rows.filter(function(row) {
    return normalizeText_(row.active) === 'yes';
  }).map(function(row) {
    return {
      user_term: cleanDisplayText_(row.user_term),
      canonical_term: cleanDisplayText_(row.canonical_term),
      related_terms: splitAliasTerms_(row.related_terms),
      category_hint: cleanDisplayText_(row.category_hint),
      source_type_hint: cleanDisplayText_(row.source_type_hint)
    };
  });

  return okResult_({ aliases: aliases });
}

function splitAliasTerms_(value) {
  return cleanDisplayText_(value).split(',').map(function(term) {
    return cleanDisplayText_(term);
  }).filter(function(term) {
    return term;
  });
}

function buildAliasTermsForRecord_(record, aliases) {
  if (!aliases || !aliases.length) {
    return '';
  }

  var searchableText = normalizeText_([
    record.item_name_original,
    record.item_name_clean,
    record.category_level_1,
    record.category_level_2,
    record.category_level_3,
    record.unit,
    record.note
  ].join(' '));
  var aliasTerms = [];

  aliases.forEach(function(alias) {
    var sourceTypeHint = normalizeText_(alias.source_type_hint);
    if (sourceTypeHint && sourceTypeHint !== normalizeText_(record.source_type)) {
      return;
    }

    var matchTerms = [alias.user_term, alias.canonical_term, alias.category_hint].concat(alias.related_terms || []);
    var matched = matchTerms.some(function(term) {
      var normalizedTerm = normalizeText_(term);
      return normalizedTerm && searchableText.indexOf(normalizedTerm) !== -1;
    });

    if (matched) {
      addUniqueAliasTerm_(aliasTerms, alias.user_term);
      addUniqueAliasTerm_(aliasTerms, alias.canonical_term);
      (alias.related_terms || []).forEach(function(term) {
        addUniqueAliasTerm_(aliasTerms, term);
      });
    }
  });

  return aliasTerms.join(', ');
}

function addUniqueAliasTerm_(terms, term) {
  var cleaned = cleanDisplayText_(term);
  if (cleaned && terms.indexOf(cleaned) === -1) {
    terms.push(cleaned);
  }
}


function validateCurrentStagingForMasterUpdate() {
  return validateStagingBeforeMasterUpdate('', { triggered_by: 'manual' });
}
