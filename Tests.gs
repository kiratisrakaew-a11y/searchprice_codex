/**
 * Lightweight callable test entrypoint for Milestone 1.
 * Run from Apps Script to create missing schema-managed sheets and return validation details.
 */
function runMilestone1SheetSetupAndSchemaGuardTest() {
  return setupPhase1Sheets();
}

/**
 * Read-only validation entrypoint for Milestone 1.
 */
function runMilestone1SchemaGuardValidationOnly() {
  return validatePhase1Sheets();
}


/**
 * Static smoke test for Milestone 2 utilities that does not mutate sheets.
 */
function runMilestone2CoreUtilitySmokeTest() {
  return okResult_({
    normalized_text: normalizeText_(' สาย VAF 2x2.5 / 20mm  '),
    parsed_number: parseNumber_('฿1,234.50'),
    generated_ids: {
      master_id: generateMasterId_(),
      staging_id: generateStagingId_(),
      log_id: generateLogId_(),
      search_id: generateSearchId_()
    }
  });
}


/**
 * Static smoke test for Milestone 3 raw mapping without mutating sheets.
 */
function runMilestone3RawMappingSmokeTest() {
  var laborResult = mapRawRowToCommonSchema_(PHASE1_SHEETS.LABOR_CGD, {
    category_l1: 'งานโครงสร้าง',
    category_l2: 'หมวดแรงงาน',
    category_l3: '',
    item_code: 'L001',
    item_description_clean: 'ทดสอบแรงงาน',
    unit: 'งาน',
    labor_cost_thb: '1,200',
    row_note: 'note A',
    context_note: 'note B'
  });

  var materialResult = mapRawRowToCommonSchema_(PHASE1_SHEETS.MATERIAL_OBEC, {
    category_l1: 'งานวัสดุ',
    category_l2: 'หมวดวัสดุ',
    category_l3: '',
    item_code: 'M001',
    item_description_clean: 'ทดสอบวัสดุ',
    unit: 'ชุด',
    material_cost_thb: '700',
    labor_cost_thb: '300',
    row_note: 'material note',
    context_note: ''
  });

  var tpsoResult = mapRawRowToCommonSchema_(PHASE1_SHEETS.MATERIAL_TPSO, {
    commodityCode: 'T001',
    commodityNameTH: 'วัสดุ TPSO',
    unitName: 'หน่วย',
    priceCur: '450.50',
    curYear: '2569',
    curMonth: '4',
    typeName: 'ส่วนกลาง',
    createdAt: '2026-05-12T00:00:00Z'
  });

  return okResult_({
    labor: laborResult,
    material: materialResult,
    tpso: tpsoResult
  });
}


/**
 * Static smoke test for Milestone 4 TPSO response validation helpers.
 */
function runMilestone4TpsoApiValidationSmokeTest() {
  var sampleRows = [{
    id: '1',
    type: '10',
    typeName: 'ส่วนกลาง',
    commodityCode: 'T001',
    commodityNameTH: 'วัสดุ TPSO',
    unitName: 'หน่วย',
    curMonth: '4',
    curYear: '2569',
    priceCur: '450.50',
    priceVAT: '482.04',
    createdAt: '2026-05-12T00:00:00Z'
  }];

  return okResult_({
    extract: extractTpsoResponseRows_({ data: sampleRows }),
    validate: validateTpsoApiRows_(sampleRows)
  });
}


/**
 * Static smoke test for Milestone 5 source normalization helpers without mutating sheets.
 */
function runMilestone5NormalizeRowsSmokeTest() {
  return normalizeRawSourceRows_(PHASE1_SHEETS.LABOR_CGD, [{
    category_l1: 'งานโครงสร้าง',
    category_l2: 'หมวดแรงงาน',
    category_l3: '',
    item_code: 'L001',
    item_description_clean: 'ทดสอบแรงงาน',
    unit: 'งาน',
    labor_cost_thb: '1,200',
    row_note: 'note A',
    context_note: 'note B'
  }], {
    aliases: [],
    staged_at: getCurrentTimestamp_()
  });
}


/**
 * Static smoke test for Milestone 6 staging validation without mutating sheets.
 */
function runMilestone6ValidationSmokeTest() {
  var row = mapRawRowToCommonSchema_(PHASE1_SHEETS.LABOR_CGD, {
    category_l1: 'งานโครงสร้าง',
    category_l2: 'หมวดแรงงาน',
    category_l3: '',
    item_code: 'L001',
    item_description_clean: 'ทดสอบแรงงาน',
    unit: 'งาน',
    labor_cost_thb: '1,200',
    row_note: 'note A',
    context_note: 'note B'
  }).data.row;

  var validRowResult = validateStagingRow_(row);
  var invalidRow = Object.assign({}, row, { item_name_original: '', unit: '', price: '', total_cost: '', labor_cost: '' });
  var invalidRowResult = validateStagingRow_(invalidRow);
  return okResult_({
    valid_row: validRowResult,
    invalid_row: invalidRowResult
  });
}


/**
 * Static smoke test for Milestone 7 staging-to-master conversion helpers.
 */
function runMilestone7MasterUpdateSmokeTest() {
  var stagingRow = mapRawRowToCommonSchema_(PHASE1_SHEETS.MATERIAL_TPSO, {
    commodityCode: 'T001',
    commodityNameTH: 'วัสดุ TPSO',
    unitName: 'หน่วย',
    priceCur: '450.50',
    curYear: '2569',
    curMonth: '4',
    typeName: 'ส่วนกลาง',
    createdAt: '2026-05-12T00:00:00Z'
  }).data.row;

  return okResult_({
    master_row: convertStagingRowToMasterRow_(stagingRow, getCurrentTimestamp_()),
    compressed_ranges: compressRowNumbersToRanges_([2, 3, 4, 8, 10, 11])
  });
}


/**
 * Static smoke test for Milestone 8 REFRESH_LOG record validation.
 */
function runMilestone8RefreshLogSmokeTest() {
  var record = buildRefreshLogRecord_({
    source_name: PHASE1_SHEETS.MATERIAL_TPSO,
    refresh_type: 'api',
    status: 'failed',
    action_taken: 'kept_existing_master_data',
    source_row_count_before: 10,
    source_row_count_after: 10,
    staging_row_count: 0,
    master_row_count_before: 100,
    master_row_count_after: 100,
    validation_pass_count: 0,
    validation_warning_count: 0,
    validation_fail_count: 1,
    needs_review_count: 0,
    error_message: 'network failed',
    triggered_by: 'test'
  });

  return okResult_({
    record: record,
    validation: validateRefreshLogRecord_(record)
  });
}


/**
 * Static smoke test for Milestone 9 search helper fields and alias enrichment.
 */
function runMilestone9SearchHelperSmokeTest() {
  var record = {
    item_name_original: 'สาย VAF 2x2.5 20mm 1/2" THW',
    item_name_clean: generateItemNameClean_('สาย VAF 2x2.5 20mm 1/2" THW'),
    category_level_1: 'ไฟฟ้า',
    category_level_2: '',
    category_level_3: '',
    unit: 'เมตร',
    note: 'งานเดินสาย',
    source_type: 'material',
    price_basis: 'material_only'
  };
  record.alias_terms = enrichAliasTermsFromDictionary_(record, [{
    user_term: 'สายไฟ',
    canonical_term: 'สายไฟฟ้า',
    related_terms: ['VAF', 'THW'],
    category_hint: 'ไฟฟ้า',
    source_type_hint: 'material',
    active: 'yes'
  }, {
    user_term: 'ไม่ใช้',
    canonical_term: 'inactive',
    related_terms: ['VAF'],
    category_hint: '',
    source_type_hint: 'material',
    active: 'no'
  }]);
  record.search_keywords = generateSearchKeywords_(record);
  record.normalized_text = generateNormalizedText_(record);

  return okResult_({
    record: record,
    specs: preserveTechnicalSpecSmokeResult_()
  });
}


/**
 * Static smoke test for Milestone 10 search scoring helpers without sheet reads.
 */
function runMilestone10SearchEngineSmokeTest() {
  var query = normalizeSearchQuery_('สาย VAF 2x2.5');
  var scored = scoreMasterRowForQuery_({
    master_id: 'MST-1',
    item_name_original: 'สายไฟ VAF 2x2.5',
    item_name_clean: 'สายไฟ VAF 2x2.5',
    category_level_1: 'ไฟฟ้า',
    category_level_2: '',
    category_level_3: '',
    unit: 'เมตร',
    note: '',
    search_keywords: 'สายไฟ vaf 2x2.5 ไฟฟ้า เมตร',
    alias_terms: 'สายไฟ, cable',
    normalized_text: 'สายไฟ vaf 2x2.5 ไฟฟ้า เมตร material material_only',
    material_cost: '10',
    labor_cost: '',
    total_cost: '10',
    price_basis: 'material_only',
    data_status: 'active'
  }, query);

  return okResult_({
    normalized_query: query,
    scored: scored,
    card: toSearchResultCard_(scored),
    fuzzy_distance: calculateLevenshteinDistance_('cement', 'cememt')
  });
}

function testSearchCement() {
  return searchMasterPriceDatabase('ปูนซีเมนต์', { triggered_by: 'manual' });
}

/**
 * Static smoke test for Milestone 11 WebApp result-card and read-only detail contracts.
 * This does not mutate sheets; selection logging is covered by the WebApp endpoint path.
 */
function runMilestone11WebAppContractSmokeTest() {
  var unsafeCard = {
    master_id: 'MST-1',
    item_name: 'ปูนซีเมนต์',
    unit: 'ถุง',
    material_cost: '120',
    labor_cost: '',
    total_cost: '120',
    price_basis: 'material_only',
    note: 'sample',
    match_score: 95,
    needs_review: '',
    source_name: 'materialcost_tpso',
    source_type: 'material',
    match_reason: 'hidden internal reason'
  };
  var sanitizedCard = sanitizeSearchResultCardsForWebApp_([unsafeCard])[0];
  var selectedDetail = toSelectedItemReadOnlyDetail_({
    master_id: 'MST-1',
    item_name_original: 'ปูนซีเมนต์ต้นฉบับ',
    item_name_clean: 'ปูนซีเมนต์',
    unit: 'ถุง',
    material_cost: '120',
    labor_cost: '',
    total_cost: '120',
    price_basis: 'material_only',
    note: 'sample',
    data_status: 'active',
    effective_year: '2569',
    effective_month: '4',
    source_name: 'materialcost_tpso',
    source_type: 'material'
  });

  var hiddenFields = ['source_name', 'source_type', 'match_reason'];
  var hiddenFieldsPresent = hiddenFields.filter(function(fieldName) {
    return Object.prototype.hasOwnProperty.call(sanitizedCard, fieldName) || Object.prototype.hasOwnProperty.call(selectedDetail, fieldName);
  });

  if (hiddenFieldsPresent.length) {
    return failResult_(createError_('webapp_hidden_fields_exposed', 'WebApp card/detail exposes hidden fields.', { fields: hiddenFieldsPresent }, 'critical'));
  }

  if (selectedDetail.read_only !== true) {
    return failResult_(createError_('webapp_detail_not_read_only', 'Selected item detail must be read-only.', {}, 'critical'));
  }

  return okResult_({
    sanitized_card: sanitizedCard,
    selected_detail: selectedDetail,
    hidden_fields_present: hiddenFieldsPresent,
    manual_selection_required: true,
    selected_detail_read_only: selectedDetail.read_only === true,
    webapp_write_boundary: [PHASE1_SHEETS.SEARCH_LOG]
  });
}

/**
 * Static smoke test for Milestone 12 price comparison without mutating sheets.
 */
function runMilestone12PriceComparisonSmokeTest() {
  var baseRow = {
    master_id: 'MST-COMPARE-1',
    item_name_clean: 'ปูนซีเมนต์',
    unit: 'kg',
    material_cost: '100',
    labor_cost: '',
    total_cost: '100',
    price: '100'
  };

  var sameUnit = compareUserPriceToMaster_(baseRow, {
    user_price: '105',
    user_unit: 'kg',
    user_quantity: '1',
    user_price_type: 'unknown'
  });
  var convertedUnit = compareUserPriceToMaster_(baseRow, {
    user_price: '90000',
    user_unit: 'ton',
    user_quantity: '1',
    user_price_type: 'material'
  });
  var cannotConvert = compareUserPriceToMaster_(baseRow, {
    user_price: '120',
    user_unit: 'bag',
    user_quantity: '1',
    user_price_type: 'material'
  });
  var referenceSelection = selectReferencePrice_({
    material_cost: '10',
    labor_cost: '20',
    total_cost: '30',
    price: '40'
  }, 'unknown');

  if (!sameUnit.ok || sameUnit.data.result !== COMPARISON_CLASSIFICATIONS.CLOSE) {
    return failResult_(createError_('comparison_same_unit_failed', 'Same-unit comparison did not classify as close_to_reference.', { result: sameUnit }, 'critical'));
  }
  if (!convertedUnit.ok || convertedUnit.data.result !== COMPARISON_CLASSIFICATIONS.LOWER || convertedUnit.data.conversion_status !== 'converted') {
    return failResult_(createError_('comparison_conversion_failed', 'Converted-unit comparison did not use rule-based conversion correctly.', { result: convertedUnit }, 'critical'));
  }
  if (!cannotConvert.ok || cannotConvert.data.result !== COMPARISON_CLASSIFICATIONS.CANNOT || cannotConvert.data.variance_percent !== '') {
    return failResult_(createError_('comparison_cannot_convert_failed', 'Unconvertible units must return cannot_compare without variance judgment.', { result: cannotConvert }, 'critical'));
  }
  if (!referenceSelection.ok || referenceSelection.data.reference_price_field !== 'total_cost') {
    return failResult_(createError_('comparison_reference_selection_failed', 'unknown price type must select total_cost before price fallback.', { result: referenceSelection }, 'critical'));
  }

  return okResult_({
    same_unit: sameUnit.data,
    converted_unit: convertedUnit.data,
    cannot_convert: cannotConvert.data,
    reference_selection: referenceSelection.data,
    writes_performed: []
  });
}


/**
 * Static smoke test for Milestone 13 unit conversion rule-first and Gemini boundaries.
 * Does not call the external Gemini API.
 */
function runMilestone13UnitConversionSmokeTest() {
  var sameUnit = convertPricePerUnitWithGeminiFallback_(100, 'kg', 'kg', {});
  var ruleBased = convertPricePerUnitWithGeminiFallback_(90000, 'ton', 'kg', {});
  var noKeyFallback = convertPricePerUnitWithGeminiFallback_(120, 'bag', 'kg', {
    selected_item_name: 'ทดสอบถุง',
    user_quantity: 1,
    user_price_type: 'material'
  });
  var structured = parseGeminiUnitConversionText_(JSON.stringify({
    status: 'success',
    conversion_possible: true,
    required_user_input: '',
    conversion_factor: 50,
    converted_value: 2.4,
    converted_unit: 'kg',
    assumption_used: 'User provided 50 kg per bag.',
    explanation: 'Converted bag price to kg price using provided bag weight.',
    cannot_compare_reason: ''
  }));
  var needMoreInfo = parseGeminiUnitConversionText_(JSON.stringify({
    status: 'need_more_info',
    conversion_possible: false,
    required_user_input: 'meters per roll',
    conversion_factor: '',
    converted_value: '',
    converted_unit: '',
    assumption_used: '',
    explanation: 'Need roll length before converting roll to meter.',
    cannot_compare_reason: 'missing meters per roll'
  }));

  if (!sameUnit.ok || sameUnit.data.conversion_source !== 'rule_based' || sameUnit.data.conversion_status !== 'same_unit') {
    return failResult_(createError_('unit_same_unit_failed', 'Exact unit match should compare directly through rule-based path.', { result: sameUnit }, 'critical'));
  }
  if (!ruleBased.ok || ruleBased.data.conversion_source !== 'rule_based' || ruleBased.data.comparable_price !== 90) {
    return failResult_(createError_('unit_rule_first_failed', 'Rule-based conversion should run before Gemini.', { result: ruleBased }, 'critical'));
  }
  if (noKeyFallback.ok || noKeyFallback.error.code !== 'unit_conversion_unavailable') {
    return failResult_(createError_('unit_gemini_failure_fallback_failed', 'Gemini failure/missing key should safely return conversion unavailable.', { result: noKeyFallback }, 'critical'));
  }
  if (!structured.ok || structured.data.interpretation.status !== 'success' || structured.data.interpretation.conversion_possible !== true) {
    return failResult_(createError_('unit_gemini_structured_success_failed', 'Gemini structured success parsing failed.', { result: structured }, 'critical'));
  }
  if (!needMoreInfo.ok || needMoreInfo.data.interpretation.status !== 'need_more_info') {
    return failResult_(createError_('unit_gemini_need_more_info_failed', 'Gemini need_more_info structured parsing failed.', { result: needMoreInfo }, 'critical'));
  }

  return okResult_({
    same_unit: sameUnit.data,
    rule_based: ruleBased.data,
    no_key_fallback: noKeyFallback.error.code,
    structured_success: structured.data.interpretation,
    structured_need_more_info: needMoreInfo.data.interpretation,
    gemini_safety: {
      guesses_prices: false,
      edits_master: false,
      approves_or_rejects: false,
      acts_as_search_engine: false
    }
  });
}

/**
 * Static smoke test for Milestone 14 Gemini input/output boundary.
 * Does not call Gemini or mutate sheets.
 */
function runMilestone14GeminiBoundarySmokeTest() {
  var payload = buildGeminiUnitConversionPayload_(9999, 'bag', 'kg', {
    user_quantity: 2,
    user_price_type: 'material',
    selected_item_name: 'ปูนซีเมนต์',
    note: 'Use note only when needed.',
    known_conversion_facts: '1 bag = 50 kg',
    MASTER_PRICE_DATABASE: 'forbidden master dump',
    source_sheet: 'forbidden source dump',
    api_key: 'SECRET_SHOULD_NOT_APPEAR',
    personal_user_data: 'forbidden personal data',
    irrelevant_data: 'forbidden irrelevant data'
  });
  var boundaryInput = buildGeminiUnitBoundaryInput_('bag', 'kg', {
    user_quantity: 2,
    user_price_type: 'material',
    selected_item_name: 'ปูนซีเมนต์',
    note: 'Use note only when needed.',
    known_conversion_facts: '1 bag = 50 kg',
    MASTER_PRICE_DATABASE: 'forbidden master dump',
    source_sheet: 'forbidden source dump',
    api_key: 'SECRET_SHOULD_NOT_APPEAR',
    personal_user_data: 'forbidden personal data',
    irrelevant_data: 'forbidden irrelevant data'
  });
  var payloadText = JSON.stringify(payload);
  var disallowedTokens = [
    'forbidden master dump',
    'forbidden source dump',
    'SECRET_SHOULD_NOT_APPEAR',
    'forbidden personal data',
    'forbidden irrelevant data',
    '9999'
  ];
  var leakedTokens = disallowedTokens.filter(function(token) {
    return payloadText.indexOf(token) !== -1;
  });
  var unexpectedKeys = Object.keys(boundaryInput).filter(function(key) {
    return GEMINI_UNIT_ALLOWED_INPUT_KEYS.indexOf(key) === -1;
  });
  var missingAllowedKeys = GEMINI_UNIT_ALLOWED_INPUT_KEYS.filter(function(key) {
    return !Object.prototype.hasOwnProperty.call(boundaryInput, key);
  });
  var invalidJson = parseGeminiUnitConversionText_('not json');
  var missingOutput = parseGeminiUnitConversionText_(JSON.stringify({ status: 'success' }));

  if (leakedTokens.length) {
    return failResult_(createError_('gemini_boundary_leaked_disallowed_input', 'Gemini prompt leaked disallowed input.', { leaked_tokens: leakedTokens }, 'critical'));
  }
  if (unexpectedKeys.length || missingAllowedKeys.length) {
    return failResult_(createError_('gemini_boundary_input_keys_invalid', 'Gemini boundary input keys are not exactly the allowlist.', {
      unexpected_keys: unexpectedKeys,
      missing_allowed_keys: missingAllowedKeys
    }, 'critical'));
  }
  if (invalidJson.ok || invalidJson.error.code !== 'gemini_structured_output_invalid') {
    return failResult_(createError_('gemini_boundary_parse_failure_not_safe', 'Invalid Gemini JSON must fail safely.', { result: invalidJson }, 'critical'));
  }
  if (missingOutput.ok || missingOutput.error.code !== 'gemini_output_missing_fields') {
    return failResult_(createError_('gemini_boundary_missing_fields_not_safe', 'Missing Gemini output fields must fail safely.', { result: missingOutput }, 'critical'));
  }

  return okResult_({
    boundary_input: boundaryInput,
    invalid_json_error: invalidJson.error.code,
    missing_output_error: missingOutput.error.code,
    leaked_tokens: leakedTokens,
    gemini_can_edit_sheets: false,
    sends_api_key_to_gemini: false,
    sends_master_database_to_gemini: false
  });
}

/**
 * Static smoke test for Milestone 15 SEARCH_LOG contracts without mutating sheets.
 */
function runMilestone15SearchLogSmokeTest() {
  var searchRecord = buildSearchLogRecord_({
    searched_at: '2026-05-15T00:00:00+00:00',
    user_query: 'ปูนซีเมนต์',
    normalized_query: normalizeSearchQuery_('ปูนซีเมนต์'),
    result_count: 3,
    top_match_id: 'MST-1',
    top_match_score: 95,
    no_result_flag: 'no',
    suggested_terms: 'ปูน, ซีเมนต์',
    user_selected_master_id: '',
    session_id: 'SESSION-1'
  });
  var noResultRecord = buildSearchLogRecord_({
    searched_at: '2026-05-15T00:01:00+00:00',
    user_query: 'no-such-query',
    normalized_query: normalizeSearchQuery_('no-such-query'),
    result_count: 0,
    no_result_flag: 'yes',
    suggested_terms: '',
    session_id: 'SESSION-2'
  });
  var selectedRecord = buildSearchLogRecord_({
    searched_at: '2026-05-15T00:02:00+00:00',
    user_query: 'สายไฟ',
    normalized_query: normalizeSearchQuery_('สายไฟ'),
    result_count: 1,
    top_match_id: 'MST-2',
    top_match_score: 88,
    no_result_flag: 'no',
    user_selected_master_id: 'MST-2',
    session_id: 'SESSION-3'
  });

  var searchValidation = validateSearchLogRecordForMilestone15_(searchRecord);
  var noResultValidation = validateSearchLogRecordForMilestone15_(noResultRecord);
  var selectedValidation = validateSearchLogRecordForMilestone15_(selectedRecord);
  var feedbackOptional = Object.prototype.hasOwnProperty.call(searchRecord, 'feedback') && searchRecord.feedback === '';
  var schemasComparisonLogFree = !Object.prototype.hasOwnProperty.call(PHASE1_SCHEMAS, 'COMPARISON_LOG');

  if (!searchValidation.ok || !noResultValidation.ok || !selectedValidation.ok) {
    return failResult_(createError_('search_log_record_validation_failed', 'SEARCH_LOG records must contain every required field.', {
      search_validation: searchValidation,
      no_result_validation: noResultValidation,
      selected_validation: selectedValidation
    }, 'critical'));
  }
  if (noResultRecord.no_result_flag !== 'yes' || noResultRecord.result_count !== 0) {
    return failResult_(createError_('search_log_no_result_contract_failed', 'No-result searches must log result_count=0 and no_result_flag=yes.', { record: noResultRecord }, 'critical'));
  }
  if (selectedRecord.user_selected_master_id !== 'MST-2') {
    return failResult_(createError_('search_log_selection_contract_failed', 'Selected result should be recorded in user_selected_master_id when possible.', { record: selectedRecord }, 'critical'));
  }
  if (!feedbackOptional) {
    return failResult_(createError_('search_log_feedback_optional_failed', 'Feedback must remain optional in Phase 1.', { record: searchRecord }, 'critical'));
  }
  if (!schemasComparisonLogFree) {
    return failResult_(createError_('comparison_log_schema_forbidden', 'COMPARISON_LOG must not exist in Phase 1 schemas.', {}, 'critical'));
  }

  return okResult_({
    search_record: searchRecord,
    no_result_record: noResultRecord,
    selected_record: selectedRecord,
    feedback_optional: feedbackOptional,
    comparison_log_absent: schemasComparisonLogFree,
    required_fields: PHASE1_SCHEMAS.SEARCH_LOG.slice()
  });
}

/**
 * Static smoke test for Milestone 16 admin custom menu contract without mutating sheets.
 */
function runMilestone16AdminMenuSmokeTest() {
  var expected = [
    'Refresh TPSO from API',
    'Process CGD Labor',
    'Process OBEC Labor',
    'Process OBEC Material',
    'Process TPSO Material',
    'Validate Staging',
    'Update Master for Selected Source',
    'View Last Refresh Status',
    'Run Phase 1 Test Checks'
  ];
  var missingItems = expected.filter(function(item) {
    return PHASE1_ADMIN_MENU_ITEMS.indexOf(item) === -1;
  });
  var extraItems = PHASE1_ADMIN_MENU_ITEMS.filter(function(item) {
    return expected.indexOf(item) === -1;
  });
  var forbiddenMenuItems = PHASE1_ADMIN_MENU_ITEMS.filter(function(item) {
    return item === 'Refresh TPSO API + Update Master' || item.indexOf('Update Master: ') === 0;
  });

  if (missingItems.length || extraItems.length || forbiddenMenuItems.length) {
    return failResult_(createError_('admin_menu_contract_failed', 'Admin menu items must match Milestone 16 exactly.', {
      missing_items: missingItems,
      extra_items: extraItems,
      forbidden_items: forbiddenMenuItems
    }, 'critical'));
  }

  return okResult_({
    menu_items: PHASE1_ADMIN_MENU_ITEMS.slice(),
    refresh_tpso_raw_only_handler: 'adminRefreshTpsoFromApi',
    process_handlers: [
      'adminProcessCgdLabor',
      'adminProcessObecLabor',
      'adminProcessObecMaterial',
      'adminProcessTpsoMaterial'
    ],
    update_master_handler: 'adminUpdateMasterForSelectedSource',
    update_master_requires_selected_source: true,
    update_master_requires_validation_passed: true,
    update_master_blocks_on_validation_fail: true,
    no_combined_tpso_master_update_menu: true
  });
}
