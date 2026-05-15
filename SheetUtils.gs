/**
 * Utilities for safe sheet lookup, creation, and schema/header checks.
 */
function getActiveSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetByName_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName);
}

function getExpectedSchema_(sheetName) {
  return PHASE1_SCHEMAS[sheetName] || null;
}

function ensureSheetWithHeader_(spreadsheet, sheetName, headers) {
  var sheet = getSheetByName_(spreadsheet, sheetName);
  var created = false;

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    created = true;
  }

  var existingHeader = getRowValues_(sheet, 1, headers.length);
  if (isBlankRow_(existingHeader)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return {
    sheet: sheet,
    created: created
  };
}

function getRowValues_(sheet, rowNumber, width) {
  if (!sheet || width < 1) {
    return [];
  }

  return sheet.getRange(rowNumber, 1, 1, width).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
}

function getHeaderValues_(sheet) {
  if (!sheet) {
    return [];
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(value) {
    return String(value || '').trim();
  });
  return trimTrailingBlanks_(values);
}

function trimTrailingBlanks_(values) {
  var copy = values.slice();
  while (copy.length && copy[copy.length - 1] === '') {
    copy.pop();
  }
  return copy;
}

function isBlankRow_(values) {
  return values.every(function(value) {
    return String(value || '').trim() === '';
  });
}

function arraysEqual_(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  for (var i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}

function findMissingValues_(expected, actual) {
  var actualSet = actual.reduce(function(map, value) {
    map[value] = true;
    return map;
  }, {});

  return expected.filter(function(value) {
    return !actualSet[value];
  });
}

function findUnexpectedValues_(expected, actual) {
  var expectedSet = expected.reduce(function(map, value) {
    map[value] = true;
    return map;
  }, {});

  return actual.filter(function(value) {
    return value && !expectedSet[value];
  });
}

function getMergedRangeA1Notations_(sheet) {
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return [];
  }

  return sheet.getDataRange().getMergedRanges().map(function(range) {
    return range.getA1Notation();
  });
}

function assertNoMergedCells_(sheet, errors) {
  var mergedRanges = getMergedRangeA1Notations_(sheet);
  if (mergedRanges.length) {
    errors.push('Merged cells are not allowed: ' + mergedRanges.join(', '));
  }
}

function detectFieldDescriptionRow_(sheet, headerWidth) {
  if (!sheet || sheet.getLastRow() < 2 || headerWidth < 1) {
    return false;
  }

  var row2 = getRowValues_(sheet, 2, headerWidth);
  var nonBlank = row2.filter(function(value) {
    return value !== '';
  });

  if (!nonBlank.length) {
    return false;
  }

  var descriptionPattern = /(description|field description|คำอธิบาย|รายละเอียด|ชนิดข้อมูล|ตัวอย่าง)/i;
  return nonBlank.some(function(value) {
    return descriptionPattern.test(value);
  });
}

function detectTpsoHeaderRow_(sheet) {
  if (!sheet) {
    return 0;
  }

  var maxRowsToScan = Math.min(Math.max(sheet.getLastRow(), 1), 20);
  var maxColumns = Math.max(sheet.getLastColumn(), PHASE1_TPSO_HEADER_MARKERS.length);
  for (var row = 1; row <= maxRowsToScan; row++) {
    var values = getRowValues_(sheet, row, maxColumns);
    var missing = findMissingValues_(PHASE1_TPSO_HEADER_MARKERS, values);
    if (!missing.length) {
      return row;
    }
  }

  return 0;
}

function isExactlyBlankRow_(sheet, rowNumber) {
  if (!sheet || rowNumber < 1) {
    return false;
  }

  var width = Math.max(sheet.getLastColumn(), 1);
  return isBlankRow_(getRowValues_(sheet, rowNumber, width));
}
