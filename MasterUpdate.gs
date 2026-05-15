/**
 * Milestone 7 source-specific master replacement after validation passes.
 */

function refreshTpsoApiNormalizeValidateUpdateMasterManual() {
  return refreshTpsoApiNormalizeValidateUpdateMaster_({ triggered_by: 'manual' });
}

function refreshTpsoApiNormalizeValidateUpdateMaster_(options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var apiResult = refreshTpsoFromApi_({
    spreadsheet: spreadsheet,
    triggered_by: opts.triggered_by || 'manual',
    log_success: false
  });
  if (!apiResult.ok) {
    return apiResult;
  }

  var normalizeResult = processSelectedSourceToStaging(PHASE1_SHEETS.MATERIAL_TPSO, {
    spreadsheet: spreadsheet,
    triggered_by: opts.triggered_by || 'manual'
  });
  if (!normalizeResult.ok) {
    appendMasterUpdateLog_(spreadsheet, buildMasterUpdateLogRecord_(
      PHASE1_SHEETS.MATERIAL_TPSO,
      getCurrentTimestamp_(),
      'failed',
      'kept_existing_master_data',
      0,
      '',
      0,
      0,
      1,
      normalizeResult.error.message,
      opts.triggered_by || 'manual'
    ));
    return normalizeResult;
  }

  var masterResult = updateMasterForValidatedSource(PHASE1_SHEETS.MATERIAL_TPSO, {
    spreadsheet: spreadsheet,
    triggered_by: opts.triggered_by || 'manual'
  });
  if (!masterResult.ok) {
    return masterResult;
  }

  return okResult_({
    api_refresh: apiResult.data,
    normalize: normalizeResult.data,
    master_update: masterResult.data
  });
}

function updateMasterForValidatedSource(sourceName, options) {
  var opts = options || {};
  var startedAt = getCurrentTimestamp_();
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var config = getRawMappingConfig_(sourceName);
  if (!config) {
    return failResult_(createError_('unknown_source', 'Unknown source for master update: ' + sourceName, { source_name: sourceName }, 'critical'));
  }

  var masterReadyResult = ensureMasterSheetReady_(spreadsheet);
  if (!masterReadyResult.ok) {
    return masterReadyResult;
  }

  var stagingReadResult = readSheetRowsByHeader_(PHASE1_SHEETS.STAGING, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.STAGING_NORMALIZED
  });
  if (!stagingReadResult.ok) {
    return stagingReadResult;
  }

  var sourceCheck = confirmStagingRowsBelongOnlyToSource_(sourceName, stagingReadResult.data.rows);
  if (!sourceCheck.ok) {
    appendMasterUpdateLog_(spreadsheet, buildMasterUpdateLogRecord_(sourceName, startedAt, 'blocked_by_validation', 'kept_existing_master_data', 0, 0, 0, 0, 1, sourceCheck.error.message, opts.triggered_by));
    return sourceCheck;
  }

  var validationResult = validateStagingBeforeMasterUpdate(sourceName, {
    spreadsheet: spreadsheet,
    previous_successful_row_count: opts.previous_successful_row_count
  });
  if (!validationResult.ok) {
    appendMasterUpdateLog_(spreadsheet, buildMasterUpdateLogRecord_(sourceName, startedAt, 'blocked_by_validation', 'kept_existing_master_data', 0, 0, 0, 0, 1, validationResult.error.message, opts.triggered_by));
    return validationResult;
  }

  var validationSummary = validationResult.data;
  markStagingValidationResults_(spreadsheet, sourceName, validationSummary);
  if (validationSummary.block_master_update || !validationSummary.ready_for_master_update) {
    appendMasterUpdateLog_(spreadsheet, buildMasterUpdateLogRecord_(
      sourceName,
      startedAt,
      'blocked_by_validation',
      'kept_existing_master_data',
      validationSummary.row_count,
      0,
      validationSummary.pass_count,
      validationSummary.warning_count,
      validationSummary.fail_count,
      'Validation did not pass for source: ' + sourceName,
      opts.triggered_by
    ));
    return failResult_(createError_('validation_blocked_master_update', 'Validation did not pass; master update blocked', validationSummary, 'critical'));
  }

  var stagingRows = sourceCheck.data.rows;
  var masterRows = stagingRows.map(function(stagingRow) {
    return convertStagingRowToMasterRow_(stagingRow, getCurrentTimestamp_());
  });
  var masterSheet = masterReadyResult.data.sheet;
  var masterCountBefore = Math.max(masterSheet.getLastRow() - 1, 0);
  var deleteResult = deleteMasterRowsForSource_(masterSheet, sourceName);
  if (!deleteResult.ok) {
    return deleteResult;
  }

  var appendResult = appendRowsByHeader_(PHASE1_SHEETS.MASTER, masterRows, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.MASTER_PRICE_DATABASE,
    guard: {
      validation_passed: true,
      reason: 'Append validated rows for source-specific master replace: ' + sourceName
    }
  });
  if (!appendResult.ok) {
    return appendResult;
  }

  var masterCountAfter = Math.max(masterSheet.getLastRow() - 1, 0);
  var logResult = appendMasterUpdateLog_(spreadsheet, buildMasterUpdateLogRecord_(
    sourceName,
    startedAt,
    'success',
    'updated_master',
    validationSummary.row_count,
    masterCountBefore,
    validationSummary.pass_count,
    validationSummary.warning_count,
    validationSummary.fail_count,
    '',
    opts.triggered_by,
    masterCountAfter
  ));

  return okResult_({
    source_name: sourceName,
    validation_summary: validationSummary,
    deleted_master_rows: deleteResult.data.deleted_count,
    appended_master_rows: appendResult.data.appended_count,
    master_row_count_before: masterCountBefore,
    master_row_count_after: masterCountAfter,
    delete: deleteResult.data,
    append: appendResult.data,
    refresh_log: logResult
  });
}

function updateMasterForLaborCostCgd() {
  return updateMasterForValidatedSource(PHASE1_SHEETS.LABOR_CGD, { triggered_by: 'manual' });
}

function updateMasterForLaborCostObec() {
  return updateMasterForValidatedSource(PHASE1_SHEETS.LABOR_OBEC, { triggered_by: 'manual' });
}

function updateMasterForMaterialCostObec() {
  return updateMasterForValidatedSource(PHASE1_SHEETS.MATERIAL_OBEC, { triggered_by: 'manual' });
}

function updateMasterForMaterialCostTpso() {
  return updateMasterForValidatedSource(PHASE1_SHEETS.MATERIAL_TPSO, { triggered_by: 'manual' });
}

function ensureMasterSheetReady_(spreadsheet) {
  var result = ensureSheetWithHeader_(spreadsheet, PHASE1_SHEETS.MASTER, PHASE1_SCHEMAS.MASTER_PRICE_DATABASE);
  var sheetResult = validateSinglePhase1Sheet_(PHASE1_SHEETS.MASTER, result.sheet);
  if (!sheetResult.ok) {
    return failResult_(createError_('master_schema_invalid', 'MASTER_PRICE_DATABASE schema is invalid', { errors: sheetResult.errors }, 'critical'));
  }
  return okResult_({ sheet: result.sheet, write: result.write });
}

function confirmStagingRowsBelongOnlyToSource_(sourceName, rows) {
  var nonBlankRows = (rows || []).filter(function(row) {
    return !isStagingRowEmpty_(row);
  });
  if (!nonBlankRows.length) {
    return failResult_(createError_('staging_empty', 'STAGING_NORMALIZED has no rows for master update', { source_name: sourceName }, 'critical'));
  }

  var mixedRows = nonBlankRows.filter(function(row) {
    return cleanDisplayText_(row.source_name) !== sourceName;
  });
  if (mixedRows.length) {
    return failResult_(createError_(
      'staging_has_multiple_sources',
      'STAGING_NORMALIZED contains rows for other sources; master update blocked',
      { source_name: sourceName, mixed_row_count: mixedRows.length },
      'critical'
    ));
  }

  return okResult_({ rows: nonBlankRows });
}

function isStagingRowEmpty_(row) {
  return PHASE1_SCHEMAS.STAGING_NORMALIZED.every(function(fieldName) {
    return fieldName === 'staging_id' || isBlankValue_(row[fieldName]);
  });
}

function markStagingValidationResults_(spreadsheet, sourceName, validationSummary) {
  var stagingSheet = getSheetByName_(spreadsheet, PHASE1_SHEETS.STAGING);
  if (!stagingSheet || !validationSummary.row_results.length) {
    return okResult_({ updated_count: 0 });
  }

  var headerMap = getHeaderMapForSheet_(stagingSheet);
  var statusColumn = getColumnNumberByHeader_(headerMap, 'validation_status');
  var issuesColumn = getColumnNumberByHeader_(headerMap, 'validation_issues');
  var needsReviewColumn = getColumnNumberByHeader_(headerMap, 'needs_review');
  if (!statusColumn || !issuesColumn || !needsReviewColumn) {
    return failResult_(createError_('staging_validation_columns_missing', 'Staging validation columns missing', {}, 'critical'));
  }

  validationSummary.row_results.forEach(function(rowResult) {
    if (!rowResult.row_number) {
      return;
    }
    stagingSheet.getRange(rowResult.row_number, statusColumn).setValue(rowResult.status);
    stagingSheet.getRange(rowResult.row_number, issuesColumn).setValue(rowResult.issues.map(function(issue) { return issue.code; }).join(', '));
    stagingSheet.getRange(rowResult.row_number, needsReviewColumn).setValue(rowResult.needs_review);
  });

  return okResult_({ updated_count: validationSummary.row_results.length, source_name: sourceName });
}

function convertStagingRowToMasterRow_(stagingRow, refreshTimestamp) {
  return {
    master_id: generateMasterId_(),
    source_name: stagingRow.source_name,
    source_type: stagingRow.source_type,
    update_frequency: stagingRow.update_frequency,
    item_code: stagingRow.item_code,
    item_name_original: stagingRow.item_name_original,
    item_name_clean: stagingRow.item_name_clean,
    category_level_1: stagingRow.category_level_1,
    category_level_2: stagingRow.category_level_2,
    category_level_3: stagingRow.category_level_3,
    unit: stagingRow.unit,
    price: stagingRow.price,
    material_cost: stagingRow.material_cost,
    labor_cost: stagingRow.labor_cost,
    total_cost: stagingRow.total_cost,
    price_basis: stagingRow.price_basis,
    province: stagingRow.province,
    region: stagingRow.region,
    effective_year: stagingRow.effective_year,
    effective_month: stagingRow.effective_month,
    note: stagingRow.note,
    search_keywords: stagingRow.search_keywords,
    alias_terms: stagingRow.alias_terms,
    normalized_text: stagingRow.normalized_text,
    data_status: 'active',
    last_refresh_at: refreshTimestamp
  };
}

function deleteMasterRowsForSource_(masterSheet, sourceName) {
  var headerMap = getHeaderMapForSheet_(masterSheet);
  var sourceColumn = getColumnNumberByHeader_(headerMap, 'source_name');
  if (!sourceColumn) {
    return failResult_(createError_('master_source_header_missing', 'MASTER_PRICE_DATABASE source_name header missing', {}, 'critical'));
  }

  var lastRow = masterSheet.getLastRow();
  if (lastRow < 2) {
    return okResult_({ deleted_count: 0, deleted_ranges: [] });
  }

  var sourceValues = masterSheet.getRange(2, sourceColumn, lastRow - 1, 1).getDisplayValues();
  var rowNumbers = [];
  sourceValues.forEach(function(value, index) {
    if (cleanDisplayText_(value[0]) === sourceName) {
      rowNumbers.push(index + 2);
    }
  });

  var ranges = compressRowNumbersToRanges_(rowNumbers);
  ranges.slice().reverse().forEach(function(rowRange) {
    masterSheet.deleteRows(rowRange.start, rowRange.count);
  });

  return okResult_({ deleted_count: rowNumbers.length, deleted_ranges: ranges });
}

function compressRowNumbersToRanges_(rowNumbers) {
  if (!rowNumbers.length) {
    return [];
  }
  var sorted = rowNumbers.slice().sort(function(left, right) { return left - right; });
  var ranges = [];
  var start = sorted[0];
  var previous = sorted[0];
  for (var index = 1; index < sorted.length; index++) {
    if (sorted[index] === previous + 1) {
      previous = sorted[index];
      continue;
    }
    ranges.push({ start: start, count: previous - start + 1 });
    start = sorted[index];
    previous = sorted[index];
  }
  ranges.push({ start: start, count: previous - start + 1 });
  return ranges;
}

function buildMasterUpdateLogRecord_(sourceName, startedAt, status, actionTaken, stagingRowCount, masterBeforeCount, passCount, warningCount, failCount, errorMessage, triggeredBy, masterAfterCount) {
  return {
    log_id: generateLogId_(),
    source_name: sourceName,
    refresh_type: 'process',
    started_at: startedAt,
    finished_at: getCurrentTimestamp_(),
    status: status,
    source_row_count_before: '',
    source_row_count_after: '',
    staging_row_count: stagingRowCount,
    master_row_count_before: masterBeforeCount,
    master_row_count_after: masterAfterCount === undefined ? masterBeforeCount : masterAfterCount,
    validation_pass_count: passCount,
    validation_warning_count: warningCount,
    validation_fail_count: failCount,
    needs_review_count: warningCount,
    action_taken: actionTaken,
    error_message: errorMessage || '',
    triggered_by: triggeredBy || 'manual'
  };
}

function appendMasterUpdateLog_(spreadsheet, record) {
  return appendRowsByHeader_(PHASE1_SHEETS.REFRESH_LOG, record, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.REFRESH_LOG
  });
}
