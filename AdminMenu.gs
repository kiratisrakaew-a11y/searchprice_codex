/**
 * Milestone 16 admin custom menu workflows.
 * Menu actions keep destructive operations behind source selection and validation gates.
 */
function adminRefreshTpsoFromApi() {
  // Raw TPSO refresh only. Master update must happen separately after normalize + validation.
  return refreshTpsoFromApi_({ triggered_by: 'admin_menu' });
}

function adminProcessCgdLabor() {
  return adminProcessSourceToStaging_(PHASE1_SHEETS.LABOR_CGD);
}

function adminProcessObecLabor() {
  return adminProcessSourceToStaging_(PHASE1_SHEETS.LABOR_OBEC);
}

function adminProcessObecMaterial() {
  return adminProcessSourceToStaging_(PHASE1_SHEETS.MATERIAL_OBEC);
}

function adminProcessTpsoMaterial() {
  return adminProcessSourceToStaging_(PHASE1_SHEETS.MATERIAL_TPSO);
}

function adminProcessSourceToStaging_(sourceName) {
  var result = processSelectedSourceToStaging(sourceName, { triggered_by: 'admin_menu' });
  if (result.ok) {
    setAdminSelectedSource_(sourceName);
    clearAdminValidationState_();
  }
  return result;
}

function adminValidateStaging() {
  var selectedSource = getAdminSelectedSource_();
  if (!selectedSource) {
    return failResult_(createError_('admin_no_selected_source', 'Process a source before validating staging.', {}, 'warning'));
  }

  var validationResult = validateStagingBeforeMasterUpdate(selectedSource, { triggered_by: 'admin_menu' });
  if (validationResult.ok && validationResult.data.source_name === selectedSource && validationResult.data.ready_for_master_update === true && validationResult.data.block_master_update === false) {
    setAdminValidationState_(selectedSource, true);
  } else {
    setAdminValidationState_(selectedSource, false);
  }
  return validationResult;
}

function adminUpdateMasterForSelectedSource() {
  var selectedSource = getAdminSelectedSource_();
  if (!selectedSource) {
    return failResult_(createError_('admin_no_selected_source', 'Update Master blocked: no selected source. Process a source first.', {}, 'critical'));
  }

  var validationState = getAdminValidationState_();
  if (validationState.source_name !== selectedSource || validationState.validation_passed !== true) {
    return failResult_(createError_('admin_validation_required', 'Update Master blocked: selected source must pass validation first.', {
      selected_source: selectedSource,
      validated_source: validationState.source_name,
      validation_passed: validationState.validation_passed
    }, 'critical'));
  }

  var updateResult = updateMasterForValidatedSource(selectedSource, { triggered_by: 'admin_menu' });
  if (!updateResult.ok) {
    return updateResult;
  }
  clearAdminValidationState_();
  return updateResult;
}

function adminViewLastRefreshStatus() {
  var readResult = readSheetRowsByHeader_(PHASE1_SHEETS.REFRESH_LOG, {
    required_headers: PHASE1_SCHEMAS.REFRESH_LOG
  });
  if (!readResult.ok) {
    return readResult;
  }

  var rows = (readResult.data.rows || []).filter(function(row) {
    return cleanDisplayText_(row.log_id) !== '';
  });
  var lastRow = rows.length ? rows[rows.length - 1] : null;
  return okResult_({
    last_refresh_status: lastRow,
    selected_source: getAdminSelectedSource_(),
    validation_state: getAdminValidationState_()
  });
}

function adminRunPhase1TestChecks() {
  return okResult_({
    milestone_1_schema_validation: runMilestone1SchemaGuardValidationOnly(),
    milestone_2_core_utils: runMilestone2CoreUtilitySmokeTest(),
    milestone_3_raw_mapping: runMilestone3RawMappingSmokeTest(),
    milestone_4_tpso_validation: runMilestone4TpsoApiValidationSmokeTest(),
    milestone_5_normalize: runMilestone5NormalizeRowsSmokeTest(),
    milestone_6_validation: runMilestone6ValidationSmokeTest(),
    milestone_7_master_update_helpers: runMilestone7MasterUpdateSmokeTest(),
    milestone_8_refresh_log: runMilestone8RefreshLogSmokeTest(),
    milestone_9_search_helpers: runMilestone9SearchHelperSmokeTest(),
    milestone_10_search_engine: runMilestone10SearchEngineSmokeTest(),
    milestone_11_webapp_contract: runMilestone11WebAppContractSmokeTest(),
    milestone_12_price_comparison: runMilestone12PriceComparisonSmokeTest(),
    milestone_13_unit_conversion: runMilestone13UnitConversionSmokeTest(),
    milestone_14_gemini_boundary: runMilestone14GeminiBoundarySmokeTest(),
    milestone_15_search_log: runMilestone15SearchLogSmokeTest(),
    milestone_16_admin_menu: runMilestone16AdminMenuSmokeTest(),
    milestone_17_checklist_validation: runMilestone17ChecklistValidationSuite(),
    milestone_18_final_acceptance: runMilestone18FinalAcceptanceSuite()
  });
}

function setAdminSelectedSource_(sourceName) {
  PropertiesService.getDocumentProperties().setProperty(PHASE1_ADMIN_SELECTED_SOURCE_PROPERTY, cleanDisplayText_(sourceName));
}

function getAdminSelectedSource_() {
  return PropertiesService.getDocumentProperties().getProperty(PHASE1_ADMIN_SELECTED_SOURCE_PROPERTY) || '';
}

function setAdminValidationState_(sourceName, validationPassed) {
  var properties = PropertiesService.getDocumentProperties();
  properties.setProperty(PHASE1_ADMIN_VALIDATED_SOURCE_PROPERTY, cleanDisplayText_(sourceName));
  properties.setProperty(PHASE1_ADMIN_VALIDATION_PASSED_PROPERTY, validationPassed === true ? 'yes' : 'no');
  properties.setProperty(PHASE1_ADMIN_VALIDATION_AT_PROPERTY, getCurrentTimestamp_());
}

function clearAdminValidationState_() {
  var properties = PropertiesService.getDocumentProperties();
  properties.deleteProperty(PHASE1_ADMIN_VALIDATED_SOURCE_PROPERTY);
  properties.deleteProperty(PHASE1_ADMIN_VALIDATION_PASSED_PROPERTY);
  properties.deleteProperty(PHASE1_ADMIN_VALIDATION_AT_PROPERTY);
}

function getAdminValidationState_() {
  var properties = PropertiesService.getDocumentProperties();
  return {
    source_name: properties.getProperty(PHASE1_ADMIN_VALIDATED_SOURCE_PROPERTY) || '',
    validation_passed: properties.getProperty(PHASE1_ADMIN_VALIDATION_PASSED_PROPERTY) === 'yes',
    validated_at: properties.getProperty(PHASE1_ADMIN_VALIDATION_AT_PROPERTY) || ''
  };
}
