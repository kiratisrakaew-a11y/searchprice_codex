/**
 * Milestone 2 core utilities for header-based access, safe IO, IDs, parsing,
 * timestamps, and consistent result/error payloads.
 */
function buildHeaderMap_(headers) {
  return headers.reduce(function(map, header, index) {
    var normalizedHeader = String(header || '').trim();
    if (normalizedHeader) {
      map[normalizedHeader] = index + 1;
    }
    return map;
  }, {});
}

function getHeaderMapForSheet_(sheet, options) {
  var opts = options || {};
  var headerRow = opts.header_row || 1;
  var headers = getRowValues_(sheet, headerRow, Math.max(sheet.getLastColumn(), 1));
  return buildHeaderMap_(trimTrailingBlanks_(headers));
}

function requireHeaders_(headerMap, requiredHeaders) {
  var missing = (requiredHeaders || []).filter(function(headerName) {
    return !headerMap[headerName];
  });

  if (missing.length) {
    return failResult_(createError_(
      'missing_header',
      'Required headers are missing: ' + missing.join(', '),
      { missing_headers: missing },
      'critical'
    ));
  }

  return okResult_({ header_map: headerMap });
}

function getColumnNumberByHeader_(headerMap, headerName) {
  return headerMap[String(headerName || '').trim()] || 0;
}

function getCellValueByHeader_(rowValues, headerMap, headerName) {
  var columnNumber = getColumnNumberByHeader_(headerMap, headerName);
  if (!columnNumber) {
    return '';
  }

  return rowValues[columnNumber - 1];
}

function readSheetRowsByHeader_(sheetName, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var sheet = getSheetByName_(spreadsheet, sheetName);
  if (!sheet) {
    return failResult_(createError_('sheet_not_found', 'Sheet not found: ' + sheetName, { sheet_name: sheetName }, 'critical'));
  }

  var headerRow = opts.header_row || 1;
  var dataStartRow = opts.data_start_row || headerRow + 1;
  var headerMap = getHeaderMapForSheet_(sheet, { header_row: headerRow });
  var requiredResult = requireHeaders_(headerMap, opts.required_headers || []);
  if (!requiredResult.ok) {
    return requiredResult;
  }

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < dataStartRow || lastColumn < 1) {
    return okResult_({
      sheet_name: sheetName,
      header_row: headerRow,
      data_start_row: dataStartRow,
      header_map: headerMap,
      rows: []
    });
  }

  var rowCount = Math.min(lastRow - dataStartRow + 1, opts.max_rows || lastRow);
  var values = sheet.getRange(dataStartRow, 1, rowCount, lastColumn).getDisplayValues();
  var headerNames = Object.keys(headerMap);
  var rows = values.map(function(rowValues, rowIndex) {
    var rowObject = {
      _row_number: dataStartRow + rowIndex
    };
    headerNames.forEach(function(headerName) {
      rowObject[headerName] = getCellValueByHeader_(rowValues, headerMap, headerName);
    });
    return rowObject;
  });

  return okResult_({
    sheet_name: sheetName,
    range_a1: sheet.getRange(dataStartRow, 1, rowCount, lastColumn).getA1Notation(),
    header_row: headerRow,
    data_start_row: dataStartRow,
    header_map: headerMap,
    rows: rows
  });
}

function appendRowsByHeader_(sheetName, records, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var sheet = getSheetByName_(spreadsheet, sheetName);
  if (!sheet) {
    return failResult_(createError_('sheet_not_found', 'Sheet not found: ' + sheetName, { sheet_name: sheetName }, 'critical'));
  }

  if (PHASE1_SAFE_APPEND_SHEETS.indexOf(sheetName) === -1) {
    return failResult_(createError_('write_not_allowed', 'Append is not allowed for sheet: ' + sheetName, { sheet_name: sheetName }, 'critical'));
  }

  var appendGuardResult = validateAppendGuard_(sheetName, opts.guard || {});
  if (!appendGuardResult.ok) {
    return appendGuardResult;
  }

  var rowsToAppend = Array.isArray(records) ? records : [records];
  if (!rowsToAppend.length) {
    return okResult_({ sheet_name: sheetName, appended_count: 0, range_a1: '' });
  }

  var headerRow = opts.header_row || 1;
  var headerMap = getHeaderMapForSheet_(sheet, { header_row: headerRow });
  var headers = Object.keys(headerMap).sort(function(left, right) {
    return headerMap[left] - headerMap[right];
  });
  var requiredResult = requireHeaders_(headerMap, opts.required_headers || headers);
  if (!requiredResult.ok) {
    return requiredResult;
  }

  var values = rowsToAppend.map(function(record) {
    var safeRecord = record || {};
    return headers.map(function(headerName) {
      return Object.prototype.hasOwnProperty.call(safeRecord, headerName) ? safeRecord[headerName] : '';
    });
  });

  var nextRow = Math.max(sheet.getLastRow() + 1, headerRow + 1);
  var targetRange = sheet.getRange(nextRow, 1, values.length, headers.length);
  targetRange.setValues(values);

  return okResult_({
    sheet_name: sheetName,
    appended_count: values.length,
    range_a1: targetRange.getA1Notation(),
    write: {
      sheet_name: sheetName,
      range_a1: targetRange.getA1Notation(),
      rows: values.length,
      columns: headers.length
    }
  });
}

function validateAppendGuard_(sheetName, guard) {
  if (sheetName === PHASE1_SHEETS.MASTER && guard.validation_passed !== true) {
    return failResult_(createError_(
      'master_append_requires_validation',
      'Appending to MASTER_PRICE_DATABASE requires validation_passed=true',
      { sheet_name: sheetName },
      'critical'
    ));
  }

  if ((sheetName === PHASE1_SHEETS.MASTER || sheetName === PHASE1_SHEETS.STAGING) && !guard.reason) {
    return failResult_(createError_(
      'missing_write_reason',
      'Append requires a reason for processing/database sheets',
      { sheet_name: sheetName },
      'critical'
    ));
  }

  return okResult_({ sheet_name: sheetName });
}

function safeClearRange_(sheetName, rangeA1, guard, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var sheet = getSheetByName_(spreadsheet, sheetName);
  if (!sheet) {
    return failResult_(createError_('sheet_not_found', 'Sheet not found: ' + sheetName, { sheet_name: sheetName }, 'critical'));
  }

  var guardResult = validateClearGuard_(sheetName, rangeA1, guard);
  if (!guardResult.ok) {
    return guardResult;
  }

  var rangeResultFromA1 = getSafeRangeByA1_(sheet, rangeA1);
  if (!rangeResultFromA1.ok) {
    return rangeResultFromA1;
  }

  var range = rangeResultFromA1.data.range;
  var rangeResult = validateClearRange_(sheetName, range);
  if (!rangeResult.ok) {
    return rangeResult;
  }

  range.clearContent();
  return okResult_({
    sheet_name: sheetName,
    cleared_range_a1: range.getA1Notation(),
    destructive_action: true,
    guard: guard
  });
}


function getSafeRangeByA1_(sheet, rangeA1) {
  try {
    return okResult_({ range: sheet.getRange(rangeA1) });
  } catch (error) {
    return failResult_(createError_(
      'invalid_range_a1',
      'Range A1 notation is invalid: ' + rangeA1,
      { sheet_name: sheet.getName(), range_a1: rangeA1, error_message: error.message },
      'critical'
    ));
  }
}

function validateClearGuard_(sheetName, rangeA1, guard) {
  var clearGuard = guard || {};
  if (PHASE1_SAFE_CLEAR_SHEETS.indexOf(sheetName) === -1) {
    return failResult_(createError_('clear_not_allowed', 'Clear is not allowed for sheet: ' + sheetName, { sheet_name: sheetName }, 'critical'));
  }

  if (sheetName === PHASE1_SHEETS.MASTER) {
    return failResult_(createError_('clear_master_forbidden', 'Clearing MASTER_PRICE_DATABASE is forbidden', { sheet_name: sheetName }, 'critical'));
  }

  if (!rangeA1) {
    return failResult_(createError_('missing_range', 'Clear range must be explicit', { sheet_name: sheetName }, 'critical'));
  }

  if (clearGuard.confirmed !== true || !clearGuard.reason) {
    return failResult_(createError_(
      'missing_destructive_guard',
      'Clear requires confirmed=true and a reason',
      { sheet_name: sheetName, range_a1: rangeA1 },
      'critical'
    ));
  }

  return okResult_({ sheet_name: sheetName, range_a1: rangeA1 });
}

function validateClearRange_(sheetName, range) {
  var startRow = range.getRow();
  var startColumn = range.getColumn();
  var rowCount = range.getNumRows();
  var columnCount = range.getNumColumns();
  var sheet = range.getSheet();

  if (startRow <= 1) {
    return failResult_(createError_('header_clear_forbidden', 'Clearing header rows is forbidden', {
      sheet_name: sheetName,
      range_a1: range.getA1Notation()
    }, 'critical'));
  }

  if (sheetName === PHASE1_SHEETS.MATERIAL_TPSO && startRow < 4) {
    return failResult_(createError_('tpso_parameter_clear_forbidden', 'Clearing TPSO parameter/layout rows 1-3 is forbidden', {
      sheet_name: sheetName,
      range_a1: range.getA1Notation()
    }, 'critical'));
  }

  if (rowCount >= sheet.getMaxRows() && columnCount >= sheet.getMaxColumns()) {
    return failResult_(createError_('whole_sheet_clear_forbidden', 'Whole-sheet clear is forbidden', {
      sheet_name: sheetName,
      range_a1: range.getA1Notation()
    }, 'critical'));
  }

  if (startColumn < 1 || rowCount < 1 || columnCount < 1) {
    return failResult_(createError_('invalid_range', 'Clear range is invalid', {
      sheet_name: sheetName,
      range_a1: range.getA1Notation()
    }, 'critical'));
  }

  return okResult_({ sheet_name: sheetName, range_a1: range.getA1Notation() });
}

function generateMasterId_() {
  return generateId_('master');
}

function generateStagingId_() {
  return generateId_('staging');
}

function generateLogId_() {
  return generateId_('log');
}

function generateSearchId_() {
  return generateId_('search');
}

function generateId_(idType) {
  var prefixes = {
    master: 'MST',
    staging: 'STG',
    log: 'LOG',
    search: 'SRCH'
  };
  var normalizedType = String(idType || '').toLowerCase();
  var prefix = prefixes[normalizedType] || 'ID';
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmssSSS');
  var uuid = Utilities.getUuid().split('-')[0].toUpperCase();
  return prefix + '-' + timestamp + '-' + uuid;
}

function normalizeText_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^0-9a-zก-๙\s\.\/\-x\"']/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber_(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }

  var text = String(value).trim();
  if (!text) {
    return null;
  }

  var isNegativeByParentheses = /^\(.*\)$/.test(text);
  var cleaned = text
    .replace(/[,%฿บาท\s]/g, '')
    .replace(/^\((.*)\)$/, '$1');

  var parsed = Number(cleaned);
  if (!isFinite(parsed)) {
    return null;
  }

  return isNegativeByParentheses ? -parsed : parsed;
}

function getCurrentTimestamp_() {
  return formatDateTime_(new Date());
}

function formatDateTime_(dateValue) {
  return Utilities.formatDate(dateValue || new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function parseDateValue_(value) {
  if (!value) {
    return null;
  }

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  var parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function createError_(code, message, details, severity) {
  return {
    code: code || 'unknown_error',
    message: message || 'Unknown error',
    severity: severity || 'error',
    details: details || {},
    timestamp: getCurrentTimestamp_()
  };
}

function okResult_(data, meta) {
  return {
    ok: true,
    data: data || {},
    meta: meta || {},
    error: null,
    timestamp: getCurrentTimestamp_()
  };
}

function failResult_(error, meta) {
  return {
    ok: false,
    data: null,
    meta: meta || {},
    error: error || createError_('unknown_error', 'Unknown error'),
    timestamp: getCurrentTimestamp_()
  };
}
