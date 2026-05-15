/**
 * Adds a small Phase 1 setup menu for schema initialization and validation.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Phase 1 Price DB')
    .addItem('Setup / Validate Sheets', 'setupPhase1Sheets')
    .addItem('Validate Sheet Schema', 'validatePhase1Sheets')
    .addSeparator()
    .addItem('Refresh TPSO API (Manual)', 'refreshTpsoFromApiManual')
    .addSeparator()
    .addItem('Process laborcost_cgd to Staging', 'processLaborCostCgdToStaging')
    .addItem('Process laborcost_obec to Staging', 'processLaborCostObecToStaging')
    .addItem('Process materialcost_obec to Staging', 'processMaterialCostObecToStaging')
    .addItem('Process materialcost_tpso to Staging', 'processMaterialCostTpsoToStaging')
    .addSeparator()
    .addItem('Validate Staging', 'validateCurrentStagingForMasterUpdate')
    .addToUi();
}


/**
 * Checks only whether every Phase 1 required sheet exists.
 */
function checkRequiredSheets() {
  var spreadsheet = getActiveSpreadsheet_();
  var missingSheets = PHASE1_REQUIRED_SHEETS.filter(function(sheetName) {
    return !getSheetByName_(spreadsheet, sheetName);
  });

  return {
    ok: missingSheets.length === 0,
    required_sheets: PHASE1_REQUIRED_SHEETS.slice(),
    missing_sheets: missingSheets
  };
}

/**
 * Creates missing schema-managed Phase 1 sheets and installs row-1 headers.
 */
function createMissingPhase1SchemaSheets() {
  var spreadsheet = getActiveSpreadsheet_();
  var createdSheets = [];
  var writes = [];

  PHASE1_SCHEMA_MANAGED_SHEETS.forEach(function(sheetName) {
    var schema = getExpectedSchema_(sheetName);
    var result = ensureSheetWithHeader_(spreadsheet, sheetName, schema);
    if (result.created) {
      createdSheets.push(sheetName);
    }
    if (result.write) {
      writes.push(result.write);
    }
  });

  return {
    created_sheets: createdSheets,
    writes: writes
  };
}

/**
 * Creates schema-managed Phase 1 sheets when missing and validates all required sheets.
 * Raw source sheets and CHECKLIST_2_SCHEMA are existence-checked only and are not auto-created.
 */
function setupPhase1Sheets() {
  var creation = createMissingPhase1SchemaSheets();
  var validation = validatePhase1Sheets();
  validation.created_sheets = creation.created_sheets;
  validation.writes = creation.writes;
  return validation;
}

/**
 * Validates required Phase 1 sheet presence, exact schema headers, row-1 header rules,
 * field-description row guard, merged-cell guard, and raw header requirements.
 */
function validatePhase1Sheets() {
  var spreadsheet = getActiveSpreadsheet_();
  var result = {
    ok: true,
    missing_sheets: [],
    sheet_results: [],
    errors: [],
    warnings: []
  };

  PHASE1_REQUIRED_SHEETS.forEach(function(sheetName) {
    var sheet = getSheetByName_(spreadsheet, sheetName);
    if (!sheet) {
      result.ok = false;
      result.missing_sheets.push(sheetName);
      result.errors.push('Missing required sheet: ' + sheetName);
      result.sheet_results.push({
        sheet_name: sheetName,
        ok: false,
        errors: ['Missing required sheet']
      });
      return;
    }

    var sheetResult = validateSinglePhase1Sheet_(sheetName, sheet);
    result.sheet_results.push(sheetResult);
    if (!sheetResult.ok) {
      result.ok = false;
      Array.prototype.push.apply(result.errors, sheetResult.errors.map(function(error) {
        return sheetName + ': ' + error;
      }));
    }
    Array.prototype.push.apply(result.warnings, sheetResult.warnings.map(function(warning) {
      return sheetName + ': ' + warning;
    }));
  });

  if (getSheetByName_(spreadsheet, 'COMPARISON_LOG')) {
    result.ok = false;
    result.errors.push('COMPARISON_LOG must not be created in Phase 1');
  }

  return result;
}

function validateSinglePhase1Sheet_(sheetName, sheet) {
  var errors = [];
  var warnings = [];
  var schema = getExpectedSchema_(sheetName);

  if (schema) {
    var header = getHeaderValues_(sheet);
    if (!arraysEqual_(header, schema)) {
      errors.push('Header row must exactly match schema columns: ' + schema.join(', '));
      var missing = findMissingValues_(schema, header);
      var unexpected = findUnexpectedValues_(schema, header);
      if (missing.length) {
        errors.push('Missing columns: ' + missing.join(', '));
      }
      if (unexpected.length) {
        errors.push('Unexpected columns: ' + unexpected.join(', '));
      }
    }

    if (detectFieldDescriptionRow_(sheet, schema.length)) {
      errors.push('Field description row detected in row 2; only row 1 may contain headers');
    }

    assertNoMergedCells_(sheet, errors);
  } else if (PHASE1_RAW_HEADERS[sheetName]) {
    assertNoMergedCells_(sheet, errors);
    validateRawSheetHeader_(sheetName, sheet, errors, warnings);
  } else if (sheetName === PHASE1_SHEETS.CHECKLIST) {
    var checklistMergedRanges = getMergedRangeA1Notations_(sheet);
    if (checklistMergedRanges.length) {
      warnings.push('CHECKLIST_2_SCHEMA has merged cells: ' + checklistMergedRanges.join(', '));
    }
  }

  return {
    sheet_name: sheetName,
    ok: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

function validateRawSheetHeader_(sheetName, sheet, errors, warnings) {
  var expected = PHASE1_RAW_HEADERS[sheetName];
  if (sheetName === PHASE1_SHEETS.MATERIAL_TPSO) {
    var tpsoHeaderRow = detectTpsoHeaderRow_(sheet);
    if (!tpsoHeaderRow) {
      errors.push('TPSO response header row could not be detected');
      return;
    }

    var tpsoHeader = getRowValues_(sheet, tpsoHeaderRow, Math.max(sheet.getLastColumn(), expected.length));
    var tpsoMissing = findMissingValues_(expected, tpsoHeader);
    if (tpsoMissing.length) {
      errors.push('TPSO response header row is missing columns: ' + tpsoMissing.join(', '));
    }
    validateTpsoRequestLayout_(sheet, errors);
    if (tpsoHeaderRow !== 4) {
      errors.push('TPSO response header detected on row ' + tpsoHeaderRow + '; expected preserved layout row 4');
    }
    return;
  }

  var header = getHeaderValues_(sheet);
  if (!arraysEqual_(header, expected)) {
    errors.push('Raw header row must exactly match expected columns: ' + expected.join(', '));
    var missing = findMissingValues_(expected, header);
    var unexpected = findUnexpectedValues_(expected, header);
    if (missing.length) {
      errors.push('Missing raw columns: ' + missing.join(', '));
    }
    if (unexpected.length) {
      errors.push('Unexpected raw columns: ' + unexpected.join(', '));
    }
  }
}

function validateTpsoRequestLayout_(sheet, errors) {
  var expectedRequestHeader = ['year', 'month', 'type'];
  var requestHeader = getRowValues_(sheet, 1, expectedRequestHeader.length);
  if (!arraysEqual_(requestHeader, expectedRequestHeader)) {
    errors.push('TPSO request parameter header row 1 must be: ' + expectedRequestHeader.join(', '));
  }

  if (!isExactlyBlankRow_(sheet, 3)) {
    errors.push('TPSO row 3 must remain blank between request parameters and response headers');
  }
}
