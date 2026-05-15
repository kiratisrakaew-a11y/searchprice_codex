/**
 * Milestone 6 validation engine. This is the required gate before any master update.
 */
const VALIDATION_WARNING_THRESHOLD_RATIO = 0.30;
const VALIDATION_IMPORTANT_BLANK_THRESHOLD_RATIO = 0.20;

function validateStagingBeforeMasterUpdate(sourceName, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var schemaResult = validateStagingSheetSchema_(spreadsheet);
  if (!schemaResult.ok) {
    return schemaResult;
  }

  var readResult = readSheetRowsByHeader_(PHASE1_SHEETS.STAGING, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.STAGING_NORMALIZED
  });
  if (!readResult.ok) {
    return readResult;
  }

  var rows = filterStagingRowsForSource_(readResult.data.rows, sourceName);
  var rowCount = rows.length;
  var rowResults = rows.map(function(row) {
    return validateStagingRow_(row);
  });
  var summary = buildValidationSummary_(sourceName || '', rowCount, rowResults);
  applyValidationWarnings_(summary, rows, opts);

  if (rowCount === 0) {
    addValidationSummaryIssue_(summary, 'critical', 'row_count_zero', 'Staging row count is 0');
  }

  summary.ready_for_master_update = summary.block_master_update === false;

  // Write per-row validation_status / validation_issues / needs_review back to
  // STAGING_NORMALIZED so the operator can see results in the sheet immediately
  // after running Validate Staging, not only after Update Master.
  if (opts.write_results_to_sheet !== false && rowCount > 0) {
    var markResult = markStagingValidationResults_(spreadsheet, sourceName || '', summary);
    summary.staging_marked = markResult.ok ? markResult.data : null;
  }

  return okResult_(summary);
}

function validateStagingSheetSchema_(spreadsheet) {
  var sheet = getSheetByName_(spreadsheet, PHASE1_SHEETS.STAGING);
  if (!sheet) {
    return failResult_(createError_('staging_sheet_missing', 'STAGING_NORMALIZED sheet not found', {}, 'critical'));
  }

  var sheetResult = validateSinglePhase1Sheet_(PHASE1_SHEETS.STAGING, sheet);
  if (!sheetResult.ok) {
    return okResult_({
      source_name: '',
      row_count: 0,
      pass_count: 0,
      warning_count: 0,
      fail_count: 1,
      needs_review_count: 0,
      block_master_update: true,
      ready_for_master_update: false,
      critical_issues: [{ code: 'staging_schema_invalid', message: 'STAGING_NORMALIZED required header missing or schema invalid', details: sheetResult.errors }],
      warning_issues: [],
      row_results: []
    });
  }

  return okResult_({ sheet: sheet });
}

function filterStagingRowsForSource_(rows, sourceName) {
  if (!sourceName) {
    return rows;
  }

  return rows.filter(function(row) {
    return cleanDisplayText_(row.source_name) === sourceName;
  });
}

function validateStagingRow_(row) {
  var issues = [];
  addCriticalIfBlank_(issues, row, 'source_name', 'source_name_blank');
  addCriticalIfBlank_(issues, row, 'source_type', 'source_type_blank');
  addCriticalIfBlank_(issues, row, 'item_name_original', 'item_name_original_blank');
  addCriticalIfBlank_(issues, row, 'unit', 'unit_blank');
  addCriticalIfBlank_(issues, row, 'price', 'price_blank');
  addCriticalIfBlank_(issues, row, 'total_cost', 'total_cost_blank');

  var materialCost = parseNumber_(row.material_cost);
  var laborCost = parseNumber_(row.labor_cost);
  if (isBlankValue_(row.material_cost) && isBlankValue_(row.labor_cost)) {
    issues.push(createValidationIssue_('critical', 'material_and_labor_blank', 'Both material_cost and labor_cost are blank'));
  }
  if (materialCost !== null && materialCost < 0) {
    issues.push(createValidationIssue_('critical', 'material_cost_negative', 'material_cost is negative'));
  }
  if (laborCost !== null && laborCost < 0) {
    issues.push(createValidationIssue_('critical', 'labor_cost_negative', 'labor_cost is negative'));
  }

  addWarningIfBlank_(issues, row, 'item_code', 'item_code_blank');
  addWarningIfBlank_(issues, row, 'item_name_clean', 'item_name_clean_blank');
  addWarningIfBlank_(issues, row, 'search_keywords', 'search_keywords_blank');
  addWarningIfBlank_(issues, row, 'normalized_text', 'normalized_text_blank');

  var price = parseNumber_(row.price);
  var totalCost = parseNumber_(row.total_cost);
  if (price !== null && totalCost !== null && Math.abs(price - totalCost) > 0.0001) {
    issues.push(createValidationIssue_('warning', 'price_total_mismatch', 'price and total_cost differ'));
  }

  var criticalIssues = issues.filter(function(issue) { return issue.severity === 'critical'; });
  var warningIssues = issues.filter(function(issue) { return issue.severity === 'warning'; });
  return {
    row_number: row._row_number || '',
    source_name: row.source_name || '',
    item_code: row.item_code || '',
    item_name_original: row.item_name_original || '',
    status: criticalIssues.length ? 'fail' : (warningIssues.length ? 'warning' : 'pass'),
    needs_review: warningIssues.length ? 'yes' : 'no',
    issues: issues
  };
}

function buildValidationSummary_(sourceName, rowCount, rowResults) {
  var failCount = rowResults.filter(function(result) { return result.status === 'fail'; }).length;
  var warningCount = rowResults.filter(function(result) { return result.status === 'warning'; }).length;
  var needsReviewCount = rowResults.filter(function(result) { return result.needs_review === 'yes'; }).length;
  var criticalIssues = collectValidationIssues_(rowResults, 'critical');
  var warningIssues = collectValidationIssues_(rowResults, 'warning');

  return {
    source_name: sourceName,
    row_count: rowCount,
    pass_count: rowResults.filter(function(result) { return result.status === 'pass'; }).length,
    warning_count: warningCount,
    fail_count: failCount,
    needs_review_count: needsReviewCount,
    block_master_update: failCount > 0,
    ready_for_master_update: false,
    critical_issues: criticalIssues,
    warning_issues: warningIssues,
    row_results: rowResults
  };
}

function applyValidationWarnings_(summary, rows, options) {
  var opts = options || {};
  var previousRowCount = opts.previous_successful_row_count || getPreviousSuccessfulRowCount_(summary.source_name, opts.spreadsheet || getActiveSpreadsheet_());
  if (previousRowCount && summary.row_count < previousRowCount * (1 - VALIDATION_WARNING_THRESHOLD_RATIO)) {
    addValidationSummaryIssue_(summary, 'warning', 'row_count_drop_gt_30_percent', 'Row count dropped more than 30% from previous successful run', {
      previous_successful_row_count: previousRowCount,
      current_row_count: summary.row_count
    });
  }

  if (summary.row_count > 0) {
    var importantBlankCount = rows.filter(hasTooManyImportantBlanks_).length;
    var blankRatio = importantBlankCount / summary.row_count;
    if (blankRatio > VALIDATION_IMPORTANT_BLANK_THRESHOLD_RATIO) {
      addValidationSummaryIssue_(summary, 'warning', 'too_many_blank_important_fields', 'Too many rows have blank important fields', {
        blank_row_count: importantBlankCount,
        row_count: summary.row_count,
        ratio: blankRatio
      });
    }
  }

  if (summary.warning_count / Math.max(summary.row_count, 1) > VALIDATION_WARNING_THRESHOLD_RATIO) {
    addValidationSummaryIssue_(summary, 'warning', 'warning_threshold_breached', 'Warning threshold breached for source update');
  }
}

function addValidationSummaryIssue_(summary, severity, code, message, details) {
  var issue = createValidationIssue_(severity, code, message, details);
  if (severity === 'critical') {
    summary.critical_issues.push(issue);
    summary.fail_count += 1;
  } else {
    summary.warning_issues.push(issue);
    summary.warning_count += 1;
    summary.needs_review_count += 1;
  }
  summary.block_master_update = true;
}

function collectValidationIssues_(rowResults, severity) {
  var issues = [];
  rowResults.forEach(function(result) {
    result.issues.forEach(function(issue) {
      if (issue.severity === severity) {
        issues.push({
          row_number: result.row_number,
          item_code: result.item_code,
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
          details: issue.details || {}
        });
      }
    });
  });
  return issues;
}

function addCriticalIfBlank_(issues, row, fieldName, code) {
  if (isBlankValue_(row[fieldName])) {
    issues.push(createValidationIssue_('critical', code, fieldName + ' is blank'));
  }
}

function addWarningIfBlank_(issues, row, fieldName, code) {
  if (isBlankValue_(row[fieldName])) {
    issues.push(createValidationIssue_('warning', code, fieldName + ' is blank'));
  }
}

function createValidationIssue_(severity, code, message, details) {
  return {
    severity: severity,
    code: code,
    message: message,
    details: details || {}
  };
}

function isBlankValue_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function hasTooManyImportantBlanks_(row) {
  var fields = ['item_code', 'category_level_1', 'category_level_2', 'search_keywords', 'normalized_text'];
  var blankCount = fields.filter(function(fieldName) {
    return isBlankValue_(row[fieldName]);
  }).length;
  return blankCount >= 3;
}

function getPreviousSuccessfulRowCount_(sourceName, spreadsheet) {
  var logSheet = getSheetByName_(spreadsheet, PHASE1_SHEETS.REFRESH_LOG);
  if (!logSheet || !sourceName) {
    return 0;
  }

  var readResult = readSheetRowsByHeader_(PHASE1_SHEETS.REFRESH_LOG, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.REFRESH_LOG
  });
  if (!readResult.ok) {
    return 0;
  }

  var matchingRows = readResult.data.rows.filter(function(row) {
    return row.source_name === sourceName && row.status === 'success';
  });
  if (!matchingRows.length) {
    return 0;
  }

  var latest = matchingRows[matchingRows.length - 1];
  return parseNumber_(latest.staging_row_count) || parseNumber_(latest.source_row_count_after) || 0;
}
