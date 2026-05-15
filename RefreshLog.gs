/**
 * Milestone 8 centralized REFRESH_LOG writer and guards.
 */
const REFRESH_LOG_STATUS_VALUES = Object.freeze([
  'success',
  'failed',
  'blocked_by_validation',
  'completed_with_warning'
]);

const REFRESH_LOG_ACTION_VALUES = Object.freeze([
  'updated_master',
  'kept_existing_master_data',
  'manual_review_required'
]);

const REFRESH_LOG_SECRET_PATTERN = /(api[_-]?key|token|secret|credential|password|authorization|bearer)\s*[:=]/i;

function writeRefreshLog_(record, options) {
  var opts = options || {};
  var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
  var ensureResult = ensureRefreshLogSheetReady_(spreadsheet);
  if (!ensureResult.ok) {
    return ensureResult;
  }

  var normalizedRecord = normalizeRefreshLogRecord_(record || {});
  var validationResult = validateRefreshLogRecord_(normalizedRecord);
  if (!validationResult.ok) {
    return validationResult;
  }

  normalizedRecord.error_message = sanitizeRefreshLogMessage_(normalizedRecord.error_message);
  return appendRowsByHeader_(PHASE1_SHEETS.REFRESH_LOG, normalizedRecord, {
    spreadsheet: spreadsheet,
    required_headers: PHASE1_SCHEMAS.REFRESH_LOG
  });
}

function ensureRefreshLogSheetReady_(spreadsheet) {
  var result = ensureSheetWithHeader_(spreadsheet, PHASE1_SHEETS.REFRESH_LOG, PHASE1_SCHEMAS.REFRESH_LOG);
  var sheetResult = validateSinglePhase1Sheet_(PHASE1_SHEETS.REFRESH_LOG, result.sheet);
  if (!sheetResult.ok) {
    return failResult_(createError_('refresh_log_schema_invalid', 'REFRESH_LOG schema is invalid', { errors: sheetResult.errors }, 'critical'));
  }
  return okResult_({ sheet: result.sheet, write: result.write });
}

function normalizeRefreshLogRecord_(record) {
  return {
    log_id: record.log_id || generateLogId_(),
    source_name: cleanDisplayText_(record.source_name),
    refresh_type: cleanDisplayText_(record.refresh_type),
    started_at: record.started_at || getCurrentTimestamp_(),
    finished_at: record.finished_at || getCurrentTimestamp_(),
    status: cleanDisplayText_(record.status),
    source_row_count_before: valueOrBlank_(record.source_row_count_before),
    source_row_count_after: valueOrBlank_(record.source_row_count_after),
    staging_row_count: valueOrBlank_(record.staging_row_count),
    master_row_count_before: valueOrBlank_(record.master_row_count_before),
    master_row_count_after: valueOrBlank_(record.master_row_count_after),
    validation_pass_count: valueOrBlank_(record.validation_pass_count),
    validation_warning_count: valueOrBlank_(record.validation_warning_count),
    validation_fail_count: valueOrBlank_(record.validation_fail_count),
    needs_review_count: valueOrBlank_(record.needs_review_count),
    action_taken: cleanDisplayText_(record.action_taken),
    error_message: cleanDisplayText_(record.error_message),
    triggered_by: cleanDisplayText_(record.triggered_by || 'manual')
  };
}

function validateRefreshLogRecord_(record) {
  var missing = PHASE1_SCHEMAS.REFRESH_LOG.filter(function(fieldName) {
    return !Object.prototype.hasOwnProperty.call(record, fieldName);
  });
  if (missing.length) {
    return failResult_(createError_('refresh_log_missing_fields', 'REFRESH_LOG record missing fields', { missing_fields: missing }, 'critical'));
  }

  if (REFRESH_LOG_STATUS_VALUES.indexOf(record.status) === -1) {
    return failResult_(createError_('refresh_log_invalid_status', 'Invalid REFRESH_LOG status: ' + record.status, { status: record.status }, 'critical'));
  }

  if (REFRESH_LOG_ACTION_VALUES.indexOf(record.action_taken) === -1) {
    return failResult_(createError_('refresh_log_invalid_action', 'Invalid REFRESH_LOG action_taken: ' + record.action_taken, { action_taken: record.action_taken }, 'critical'));
  }

  if (containsRefreshLogSecret_(record.error_message)) {
    return failResult_(createError_('refresh_log_secret_detected', 'REFRESH_LOG must not store credentials or API keys', {}, 'critical'));
  }

  return okResult_({ record: record });
}

function sanitizeRefreshLogMessage_(message) {
  var text = cleanDisplayText_(message);
  if (!text) {
    return '';
  }
  return text
    .replace(/(api[_-]?key|token|secret|credential|password|authorization)\s*[:=]\s*[^\s,;]+/ig, '$1=[redacted]')
    .replace(/bearer\s+[a-z0-9._\-]+/ig, 'Bearer [redacted]')
    .slice(0, 1000);
}

function containsRefreshLogSecret_(message) {
  return REFRESH_LOG_SECRET_PATTERN.test(String(message || ''));
}

function buildRefreshLogRecord_(data) {
  return normalizeRefreshLogRecord_(data || {});
}
