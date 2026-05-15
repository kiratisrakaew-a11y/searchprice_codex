/**
 * Milestone 4 TPSO API refresh into the raw materialcost_tpso sheet only.
 */
function refreshTpsoFromApiManual() {
  return refreshTpsoFromApi_({ triggered_by: 'manual' });
}

function refreshTpsoFromApiScheduled() {
  return refreshTpsoFromApi_({ triggered_by: 'scheduled' });
}

function refreshTpsoFromApi_(options) {
  var opts = options || {};
  var startedAt = getCurrentTimestamp_();
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var sourceName = PHASE1_SHEETS.MATERIAL_TPSO;
  var sourceSheet = getSheetByName_(spreadsheet, sourceName);
  var beforeCount = countTpsoRawDataRows_(sourceSheet);

  if (!sourceSheet) {
    var missingSheetError = createError_('sheet_not_found', 'Sheet not found: ' + sourceName, { sheet_name: sourceName }, 'critical');
    return finishTpsoRefreshFailure_(missingSheetError, startedAt, opts, beforeCount, beforeCount, spreadsheet);
  }

  var paramsResult = readTpsoRequestParams_(sourceSheet);
  if (!paramsResult.ok) {
    return finishTpsoRefreshFailure_(paramsResult.error, startedAt, opts, beforeCount, beforeCount, spreadsheet);
  }

  var fetchResult = fetchTpsoMonthlyPrice_(paramsResult.data.request_body);
  if (!fetchResult.ok) {
    return finishTpsoRefreshFailure_(fetchResult.error, startedAt, opts, beforeCount, beforeCount, spreadsheet);
  }

  var writeResult = writeTpsoRawResponse_(sourceSheet, paramsResult.data.request_body, fetchResult.data.rows);
  if (!writeResult.ok) {
    return finishTpsoRefreshFailure_(writeResult.error, startedAt, opts, beforeCount, beforeCount, spreadsheet);
  }

  var afterCount = countTpsoRawDataRows_(sourceSheet);
  var logResult = logTpsoRefreshAttempt_({
    spreadsheet: spreadsheet,
    started_at: startedAt,
    finished_at: getCurrentTimestamp_(),
    status: 'success',
    action_taken: 'kept_existing_master_data',
    source_row_count_before: beforeCount,
    source_row_count_after: afterCount,
    staging_row_count: 0,
    master_row_count_before: '',
    master_row_count_after: '',
    validation_pass_count: 0,
    validation_warning_count: 0,
    validation_fail_count: 0,
    needs_review_count: 0,
    error_message: '',
    triggered_by: opts.triggered_by || 'manual'
  });

  return okResult_({
    source_name: sourceName,
    request_body: paramsResult.data.request_body,
    row_count: fetchResult.data.rows.length,
    writes: writeResult.data.writes,
    refresh_log: logResult
  });
}

function readTpsoRequestParams_(sheet) {
  var headerValues = getRowValues_(sheet, 1, 3);
  var valueRow = getRowValues_(sheet, 2, 3);
  var headerMap = buildHeaderMap_(headerValues);
  var headerResult = requireHeaders_(headerMap, ['year', 'month', 'type']);
  if (!headerResult.ok) {
    return headerResult;
  }

  var year = parseNumber_(valueRow[headerMap.year - 1]);
  var month = parseNumber_(valueRow[headerMap.month - 1]);
  var type = parseNumber_(valueRow[headerMap.type - 1]);
  var validationErrors = [];

  if (!year) {
    validationErrors.push('year');
  }
  if (!month || month < 1 || month > 12) {
    validationErrors.push('month');
  }
  if (!type) {
    validationErrors.push('type');
  }

  if (validationErrors.length) {
    return failResult_(createError_(
      'invalid_tpso_request_params',
      'Invalid TPSO request parameter(s): ' + validationErrors.join(', '),
      { invalid_fields: validationErrors },
      'critical'
    ));
  }

  return okResult_({
    request_body: {
      year: Math.trunc(year),
      month: Math.trunc(month),
      type: Math.trunc(type)
    }
  });
}

function fetchTpsoMonthlyPrice_(requestBody) {
  var response;
  try {
    response = UrlFetchApp.fetch(PHASE1_TPSO_API_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });
  } catch (error) {
    return failResult_(createError_(
      'tpso_api_fetch_failed',
      'TPSO API fetch failed: ' + error.message,
      { endpoint: PHASE1_TPSO_API_URL, error_message: error.message },
      'critical'
    ));
  }

  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();
  if (statusCode < 200 || statusCode >= 300) {
    return failResult_(createError_(
      'tpso_api_http_error',
      'TPSO API returned HTTP status ' + statusCode,
      { endpoint: PHASE1_TPSO_API_URL, status_code: statusCode, response_text: responseText.slice(0, 500) },
      'critical'
    ));
  }

  var payload;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    return failResult_(createError_(
      'tpso_api_parse_failed',
      'TPSO API response could not be parsed as JSON',
      { endpoint: PHASE1_TPSO_API_URL, error_message: error.message },
      'critical'
    ));
  }

  var rowsResult = extractTpsoResponseRows_(payload);
  if (!rowsResult.ok) {
    return rowsResult;
  }

  var validationResult = validateTpsoApiRows_(rowsResult.data.rows);
  if (!validationResult.ok) {
    return validationResult;
  }

  return okResult_({ rows: rowsResult.data.rows, status_code: statusCode });
}

function extractTpsoResponseRows_(payload) {
  if (Array.isArray(payload)) {
    return okResult_({ rows: payload });
  }

  if (!payload || typeof payload !== 'object') {
    return failResult_(createError_('tpso_api_shape_invalid', 'TPSO API response shape is invalid', {}, 'critical'));
  }

  var candidates = [
    payload.data,
    payload.result,
    payload.items,
    payload.rows,
    payload.data && payload.data.items,
    payload.data && payload.data.rows,
    payload.data && payload.data.list,
    payload.result && payload.result.items,
    payload.result && payload.result.rows,
    payload.result && payload.result.list
  ];

  for (var index = 0; index < candidates.length; index++) {
    if (Array.isArray(candidates[index])) {
      return okResult_({ rows: candidates[index] });
    }
  }

  return failResult_(createError_(
    'tpso_api_rows_not_found',
    'TPSO API response did not contain a recognized data array',
    { top_level_keys: Object.keys(payload) },
    'critical'
  ));
}

function validateTpsoApiRows_(rows) {
  if (!rows || !rows.length) {
    return failResult_(createError_('tpso_api_zero_rows', 'TPSO API returned 0 rows', {}, 'critical'));
  }

  var requiredFields = PHASE1_TPSO_HEADER_MARKERS;
  var missingByRow = [];
  rows.forEach(function(row, rowIndex) {
    var missingFields = requiredFields.filter(function(fieldName) {
      return !row || !Object.prototype.hasOwnProperty.call(row, fieldName);
    });
    if (missingFields.length) {
      missingByRow.push({ row_index: rowIndex, missing_fields: missingFields });
    }
  });

  if (missingByRow.length) {
    return failResult_(createError_(
      'tpso_api_missing_fields',
      'TPSO API response is missing required field(s)',
      { missing_by_row: missingByRow.slice(0, 20) },
      'critical'
    ));
  }

  return okResult_({ row_count: rows.length });
}

function writeTpsoRawResponse_(sheet, requestBody, rows) {
  var responseHeaders = PHASE1_TPSO_HEADER_MARKERS.slice();
  var responseValues = rows.map(function(row) {
    return responseHeaders.map(function(headerName) {
      var value = row[headerName];
      return value === null || value === undefined ? '' : value;
    });
  });

  var lastRowToClear = Math.max(sheet.getLastRow(), 4);
  var lastColumnToClear = Math.max(sheet.getLastColumn(), responseHeaders.length);
  var clearRangeA1 = 'A4:' + columnNumberToLetter_(lastColumnToClear) + lastRowToClear;
  var clearResult = safeClearRange_(PHASE1_SHEETS.MATERIAL_TPSO, clearRangeA1, {
    confirmed: true,
    reason: 'Replace TPSO API response area after successful API validation'
  }, { spreadsheet: sheet.getParent() });
  if (!clearResult.ok) {
    return clearResult;
  }

  var requestHeaderRange = sheet.getRange(1, 1, 1, 3);
  requestHeaderRange.setValues([['year', 'month', 'type']]);
  var requestValueRange = sheet.getRange(2, 1, 1, 3);
  requestValueRange.setValues([[requestBody.year, requestBody.month, requestBody.type]]);
  var blankRowRange = sheet.getRange(3, 1, 1, responseHeaders.length);
  blankRowRange.setValues([responseHeaders.map(function() { return ''; })]);
  var responseHeaderRange = sheet.getRange(4, 1, 1, responseHeaders.length);
  responseHeaderRange.setValues([responseHeaders]);
  var dataRange = sheet.getRange(5, 1, responseValues.length, responseHeaders.length);
  dataRange.setValues(responseValues);

  return okResult_({
    sheet_name: PHASE1_SHEETS.MATERIAL_TPSO,
    row_count: rows.length,
    writes: [
      clearResult.data,
      describeRangeWrite_(PHASE1_SHEETS.MATERIAL_TPSO, requestHeaderRange),
      describeRangeWrite_(PHASE1_SHEETS.MATERIAL_TPSO, requestValueRange),
      describeRangeWrite_(PHASE1_SHEETS.MATERIAL_TPSO, blankRowRange),
      describeRangeWrite_(PHASE1_SHEETS.MATERIAL_TPSO, responseHeaderRange),
      describeRangeWrite_(PHASE1_SHEETS.MATERIAL_TPSO, dataRange)
    ]
  });
}

function finishTpsoRefreshFailure_(error, startedAt, options, beforeCount, afterCount, spreadsheet) {
  var logResult = logTpsoRefreshAttempt_({
    spreadsheet: spreadsheet,
    started_at: startedAt,
    finished_at: getCurrentTimestamp_(),
    status: 'failed',
    action_taken: 'kept_existing_master_data',
    source_row_count_before: beforeCount || 0,
    source_row_count_after: afterCount || beforeCount || 0,
    staging_row_count: 0,
    master_row_count_before: '',
    master_row_count_after: '',
    validation_pass_count: 0,
    validation_warning_count: 0,
    validation_fail_count: 1,
    needs_review_count: 0,
    error_message: error.message,
    triggered_by: (options && options.triggered_by) || 'manual'
  });

  return failResult_(error, { refresh_log: logResult });
}

function logTpsoRefreshAttempt_(data) {
  var record = {
    log_id: generateLogId_(),
    source_name: PHASE1_SHEETS.MATERIAL_TPSO,
    refresh_type: 'api',
    started_at: data.started_at,
    finished_at: data.finished_at,
    status: data.status,
    source_row_count_before: data.source_row_count_before,
    source_row_count_after: data.source_row_count_after,
    staging_row_count: data.staging_row_count,
    master_row_count_before: data.master_row_count_before,
    master_row_count_after: data.master_row_count_after,
    validation_pass_count: data.validation_pass_count,
    validation_warning_count: data.validation_warning_count,
    validation_fail_count: data.validation_fail_count,
    needs_review_count: data.needs_review_count,
    action_taken: data.action_taken,
    error_message: data.error_message,
    triggered_by: data.triggered_by
  };

  return appendRowsByHeader_(PHASE1_SHEETS.REFRESH_LOG, record, {
    spreadsheet: data.spreadsheet,
    required_headers: PHASE1_SCHEMAS.REFRESH_LOG
  });
}

function countTpsoRawDataRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 5) {
    return 0;
  }
  return sheet.getLastRow() - 4;
}

function describeRangeWrite_(sheetName, range) {
  return {
    sheet_name: sheetName,
    range_a1: range.getA1Notation(),
    rows: range.getNumRows(),
    columns: range.getNumColumns()
  };
}

function columnNumberToLetter_(columnNumber) {
  var letter = '';
  var remaining = columnNumber;
  while (remaining > 0) {
    var modulo = (remaining - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return letter;
}
