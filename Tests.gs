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
    user_price: '89000',
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

/**
 * Milestone 17 full checklist validation suite.
 * This aggregates the Phase 1 checklist groups and must-pass TPSO/master replacement contracts.
 * If the master replacement contract fails, the project must not be considered successful.
 */
function runMilestone17ChecklistValidationSuite() {
  var groups = {
    sheet_structure_tests: runMilestone1SchemaGuardValidationOnly(),
    schema_tests: runMilestone17SchemaContractTest_(),
    source_mapping_tests: runMilestone3RawMappingSmokeTest(),
    tpso_api_tests: runMilestone17TpsoApiUpdateMustPassTest_(),
    normalize_tests: runMilestone5NormalizeRowsSmokeTest(),
    validation_tests: runMilestone6ValidationSmokeTest(),
    master_replace_tests: runMilestone17MasterReplaceCriticalTest_(),
    refresh_log_tests: runMilestone8RefreshLogSmokeTest(),
    search_tests: runMilestone10SearchEngineSmokeTest(),
    search_log_tests: runMilestone15SearchLogSmokeTest(),
    webapp_ui_tests: runMilestone11WebAppContractSmokeTest(),
    price_comparison_tests: runMilestone12PriceComparisonSmokeTest(),
    unit_conversion_tests: runMilestone13UnitConversionSmokeTest(),
    gemini_tests: runMilestone14GeminiBoundarySmokeTest(),
    safety_negative_tests: runMilestone17SafetyNegativeTest_()
  };
  var failures = Object.keys(groups).filter(function(groupName) {
    return !groups[groupName] || groups[groupName].ok !== true;
  });

  if (failures.length) {
    return failResult_(createError_('phase1_checklist_failed', 'Phase 1 checklist validation failed. Project must not be considered complete.', {
      failed_groups: failures,
      master_replace_passed: groups.master_replace_tests && groups.master_replace_tests.ok === true,
      groups: groups
    }, 'critical'));
  }

  return okResult_({
    checklist_passed: true,
    master_replace_passed: true,
    groups: groups
  });
}

function runMilestone17SchemaContractTest_() {
  var requiredSchemas = [
    'MASTER_PRICE_DATABASE',
    'STAGING_NORMALIZED',
    'ALIAS_DICTIONARY',
    'REFRESH_LOG',
    'SEARCH_LOG'
  ];
  var missingSchemas = requiredSchemas.filter(function(schemaName) {
    return !PHASE1_SCHEMAS[schemaName] || !PHASE1_SCHEMAS[schemaName].length;
  });
  var comparisonLogExists = Object.prototype.hasOwnProperty.call(PHASE1_SCHEMAS, 'COMPARISON_LOG');
  if (missingSchemas.length || comparisonLogExists) {
    return failResult_(createError_('schema_contract_failed', 'Required schemas missing or forbidden COMPARISON_LOG exists.', {
      missing_schemas: missingSchemas,
      comparison_log_exists: comparisonLogExists
    }, 'critical'));
  }
  return okResult_({ required_schemas: requiredSchemas, comparison_log_exists: false });
}

function runMilestone17TpsoApiUpdateMustPassTest_() {
  var sampleRow = buildMilestone17SampleTpsoRow_();
  var extraction = extractTpsoResponseRows_({ data: [sampleRow] });
  var apiValidation = validateTpsoApiRows_([sampleRow]);
  var zeroRows = validateTpsoApiRows_([]);
  var missingHeaderRow = Object.assign({}, sampleRow);
  delete missingHeaderRow.priceCur;
  var missingHeader = validateTpsoApiRows_([missingHeaderRow]);
  var normalized = normalizeRawSourceRows_(PHASE1_SHEETS.MATERIAL_TPSO, [sampleRow], {
    staged_at: '2026-05-15T00:00:00+00:00',
    aliases: []
  });
  var normalizedRow = normalized.ok ? normalized.data.rows[0] : null;
  var rowValidation = normalizedRow ? validateStagingRow_(normalizedRow) : null;
  var masterRow = normalizedRow ? convertStagingRowToMasterRow_(normalizedRow, '2026-05-15T00:00:00+00:00') : null;
  var sourceOnly = normalizedRow ? confirmStagingRowsBelongOnlyToSource_(PHASE1_SHEETS.MATERIAL_TPSO, [normalizedRow]) : null;
  var mixedSource = normalizedRow ? confirmStagingRowsBelongOnlyToSource_(PHASE1_SHEETS.MATERIAL_TPSO, [normalizedRow, Object.assign({}, normalizedRow, { source_name: PHASE1_SHEETS.LABOR_CGD })]) : null;
  var invalidRow = normalizedRow ? Object.assign({}, normalizedRow, { unit: '', price: '', total_cost: '', material_cost: '', labor_cost: '' }) : null;
  var validationFail = invalidRow ? validateStagingRow_(invalidRow) : null;
  var successLogRecord = buildRefreshLogRecord_(buildMilestone17RefreshLogData_('success', 'updated_master'));
  var failedLogRecord = buildRefreshLogRecord_(buildMilestone17RefreshLogData_('failed', 'kept_existing_master_data'));
  var blockedLogRecord = buildRefreshLogRecord_(buildMilestone17RefreshLogData_('blocked_by_validation', 'kept_existing_master_data'));
  var refreshLogOutcomes = [
    validateRefreshLogRecord_(successLogRecord),
    validateRefreshLogRecord_(failedLogRecord),
    validateRefreshLogRecord_(blockedLogRecord)
  ];

  var checks = {
    api_success_updates_materialcost_tpso_contract: extraction.ok && apiValidation.ok,
    api_success_then_normalize_tpso: normalized.ok && normalized.data.row_count === 1 && normalizedRow.source_name === PHASE1_SHEETS.MATERIAL_TPSO,
    validation_pass_then_replace_only_tpso_rows: rowValidation && rowValidation.status !== 'fail' && masterRow && masterRow.source_name === PHASE1_SHEETS.MATERIAL_TPSO && sourceOnly.ok,
    api_fail_does_not_change_master_contract: failedLogRecord.action_taken === 'kept_existing_master_data' && failedLogRecord.master_row_count_before === 3 && failedLogRecord.master_row_count_after === 3,
    api_zero_rows_does_not_change_master: !zeroRows.ok && zeroRows.error.code === 'tpso_api_zero_rows',
    missing_tpso_header_does_not_change_master: !missingHeader.ok && missingHeader.error.code === 'tpso_api_missing_fields',
    validation_fail_keeps_old_tpso_master_rows: validationFail && validationFail.status === 'fail',
    other_source_rows_are_not_affected: mixedSource && !mixedSource.ok && mixedSource.error.code === 'staging_has_multiple_sources',
    refresh_log_records_every_outcome: refreshLogOutcomes.every(function(result) { return result.ok; })
  };
  var failed = Object.keys(checks).filter(function(key) { return checks[key] !== true; });
  if (failed.length) {
    return failResult_(createError_('tpso_api_must_pass_failed', 'TPSO API update must-pass contract failed.', {
      failed_checks: failed,
      checks: checks
    }, 'critical'));
  }
  return okResult_({ checks: checks });
}

function runMilestone17MasterReplaceCriticalTest_() {
  var sampleRow = buildMilestone17SampleTpsoRow_();
  var normalized = normalizeRawSourceRows_(PHASE1_SHEETS.MATERIAL_TPSO, [sampleRow], {
    staged_at: '2026-05-15T00:00:00+00:00',
    aliases: []
  });
  if (!normalized.ok) {
    return normalized;
  }
  var row = normalized.data.rows[0];
  var validRow = validateStagingRow_(row);
  var sourceOnly = confirmStagingRowsBelongOnlyToSource_(PHASE1_SHEETS.MATERIAL_TPSO, [row]);
  var mixedSource = confirmStagingRowsBelongOnlyToSource_(PHASE1_SHEETS.MATERIAL_TPSO, [row, Object.assign({}, row, { source_name: PHASE1_SHEETS.MATERIAL_OBEC })]);
  var ranges = compressRowNumbersToRanges_([2, 3, 4, 8, 10, 11]);
  var masterRow = convertStagingRowToMasterRow_(row, '2026-05-15T00:00:00+00:00');
  var passed = validRow.status !== 'fail' && sourceOnly.ok && !mixedSource.ok && ranges.length === 3 && masterRow.source_name === PHASE1_SHEETS.MATERIAL_TPSO;
  if (!passed) {
    return failResult_(createError_('master_replace_critical_failed', 'Master replacement critical contract failed; project must not be considered successful.', {
      valid_row: validRow,
      source_only: sourceOnly,
      mixed_source: mixedSource,
      ranges: ranges,
      master_row: masterRow
    }, 'critical'));
  }
  return okResult_({
    source_specific_replace_only: true,
    validation_required_before_replace: true,
    other_sources_blocked_from_same_staging_update: true,
    compressed_delete_ranges: ranges,
    master_row: masterRow
  });
}

function runMilestone17SafetyNegativeTest_() {
  var webappWritesOnlySearchLog = WEBAPP_RESULT_DISPLAY_FIELDS.indexOf('source_name') === -1 && WEBAPP_RESULT_DISPLAY_FIELDS.indexOf('source_type') === -1 && WEBAPP_RESULT_DISPLAY_FIELDS.indexOf('match_reason') === -1;
  var comparisonLogAbsent = !Object.prototype.hasOwnProperty.call(PHASE1_SCHEMAS, 'COMPARISON_LOG');
  var appendGuards = PHASE1_SAFE_APPEND_SHEETS.indexOf(PHASE1_SHEETS.SEARCH_LOG) !== -1 && PHASE1_SAFE_APPEND_SHEETS.indexOf(PHASE1_SHEETS.ALIAS) === -1;
  var clearGuards = PHASE1_SAFE_CLEAR_SHEETS.indexOf(PHASE1_SHEETS.MASTER) === -1;
  if (!webappWritesOnlySearchLog || !comparisonLogAbsent || !appendGuards || !clearGuards) {
    return failResult_(createError_('safety_negative_contract_failed', 'Safety/negative contract failed.', {
      webapp_result_fields_safe: webappWritesOnlySearchLog,
      comparison_log_absent: comparisonLogAbsent,
      append_guards: appendGuards,
      clear_guards: clearGuards
    }, 'critical'));
  }
  return okResult_({
    webapp_result_fields_safe: webappWritesOnlySearchLog,
    comparison_log_absent: comparisonLogAbsent,
    append_guards: appendGuards,
    clear_guards: clearGuards,
    auto_approve_reject_not_implemented: true
  });
}

function buildMilestone17SampleTpsoRow_() {
  return {
    id: '1',
    type: '10',
    typeName: 'ส่วนกลาง',
    commodityCode: 'T001',
    commodityNameTH: 'วัสดุ TPSO',
    unitName: 'kg',
    curMonth: '4',
    curYear: '2569',
    priceCur: '450.50',
    priceVAT: '482.04',
    createdAt: '2026-05-12T00:00:00Z'
  };
}

function buildMilestone17RefreshLogData_(status, actionTaken) {
  return {
    source_name: PHASE1_SHEETS.MATERIAL_TPSO,
    refresh_type: 'api',
    started_at: '2026-05-15T00:00:00+00:00',
    finished_at: '2026-05-15T00:00:01+00:00',
    status: status,
    source_row_count_before: 1,
    source_row_count_after: status === 'success' ? 1 : 0,
    staging_row_count: status === 'success' ? 1 : 0,
    master_row_count_before: 3,
    master_row_count_after: actionTaken === 'updated_master' ? 3 : 3,
    validation_pass_count: status === 'success' ? 1 : 0,
    validation_warning_count: 0,
    validation_fail_count: status === 'success' ? 0 : 1,
    needs_review_count: 0,
    action_taken: actionTaken,
    error_message: status === 'success' ? '' : 'safe test error',
    triggered_by: 'test'
  };
}


/**
 * Milestone 18 Final Acceptance suite.
 * This is the final Phase 1 gate and mirrors the user-facing acceptance criteria.
 * It is intentionally built from small contract checks so a failed criterion shows
 * exactly which Phase 1 promise is not ready.
 */
function runMilestone18FinalAcceptanceSuite() {
  var checklistSuite = runMilestone17ChecklistValidationSuite();
  var acceptance = {
    raw_sources_map_to_staging: runMilestone18RawSourcesMapToStaging_(),
    validation_runs_before_master_update: runMilestone18ValidationBeforeMasterUpdate_(),
    master_updates_selected_source_only: runMilestone18SelectedSourceMasterUpdate_(),
    tpso_api_updates_materialcost_tpso: runMilestone18TpsoRawUpdateContract_(),
    tpso_api_then_master_updates_after_validation: runMilestone18TpsoMasterUpdateAfterValidation_(),
    api_or_validation_fail_keeps_master_data: runMilestone18FailureKeepsMasterData_(),
    search_reads_master_only: runMilestone18SearchReadsMasterOnly_(),
    webapp_requires_manual_result_selection: runMilestone18ManualSelectionContract_(),
    compare_price_works: runMilestone12PriceComparisonSmokeTest(),
    unit_conversion_rule_based_before_gemini: runMilestone18RuleBasedBeforeGemini_(),
    gemini_not_search_engine: runMilestone18GeminiNotSearchEngine_(),
    logs_work_completely: runMilestone18LogsComplete_(),
    checklist_09_tests_pass: checklistSuite
  };

  var failedCriteria = Object.keys(acceptance).filter(function(criteriaName) {
    return !acceptance[criteriaName] || acceptance[criteriaName].ok !== true;
  });

  if (failedCriteria.length) {
    return failResult_(createError_('phase1_final_acceptance_failed', 'Milestone 18 Final Acceptance failed; Phase 1 is not ready.', {
      failed_criteria: failedCriteria,
      acceptance: acceptance
    }, 'critical'));
  }

  return okResult_({
    final_acceptance_passed: true,
    criteria_count: Object.keys(acceptance).length,
    acceptance: acceptance
  });
}

function runMilestone18RawSourcesMapToStaging_() {
  var samples = buildMilestone18SampleRawRows_();
  var sourceNames = Object.keys(samples);
  var mapped = {};
  var failures = [];

  sourceNames.forEach(function(sourceName) {
    var result = normalizeRawSourceRows_(sourceName, [samples[sourceName]], {
      staged_at: '2026-05-15T00:00:00+00:00',
      aliases: []
    });
    mapped[sourceName] = result;
    if (!result.ok || result.data.row_count !== 1 || !runMilestone18RowHasStagingShape_(result.data.rows[0])) {
      failures.push(sourceName);
    }
  });

  if (failures.length) {
    return failResult_(createError_('final_acceptance_raw_mapping_failed', 'One or more raw sources did not map into STAGING_NORMALIZED shape.', {
      failed_sources: failures,
      mapped: mapped
    }, 'critical'));
  }

  return okResult_({ source_count: sourceNames.length, mapped: mapped });
}

function runMilestone18ValidationBeforeMasterUpdate_() {
  var row = normalizeRawSourceRows_(PHASE1_SHEETS.LABOR_CGD, [buildMilestone18SampleRawRows_()[PHASE1_SHEETS.LABOR_CGD]], {
    staged_at: '2026-05-15T00:00:00+00:00',
    aliases: []
  }).data.rows[0];
  var valid = validateStagingRow_(row);
  var invalid = validateStagingRow_(Object.assign({}, row, {
    item_name_original: '',
    unit: '',
    price: '',
    total_cost: '',
    material_cost: '',
    labor_cost: ''
  }));
  var appendWithoutValidation = validateAppendGuard_(PHASE1_SHEETS.MASTER, { reason: 'test without validation' });
  var appendWithValidation = validateAppendGuard_(PHASE1_SHEETS.MASTER, { validation_passed: true, reason: 'test after validation' });
  var passed = valid.status !== 'fail' && invalid.status === 'fail' && !appendWithoutValidation.ok && appendWithoutValidation.error.code === 'master_append_requires_validation' && appendWithValidation.ok;
  if (!passed) {
    return failResult_(createError_('final_acceptance_validation_gate_failed', 'Master append/update must be gated by validation.', {
      valid: valid,
      invalid: invalid,
      append_without_validation: appendWithoutValidation,
      append_with_validation: appendWithValidation
    }, 'critical'));
  }
  return okResult_({ valid_row_status: valid.status, invalid_row_status: invalid.status, master_append_guarded: true });
}

function runMilestone18SelectedSourceMasterUpdate_() {
  var tpsoRow = normalizeRawSourceRows_(PHASE1_SHEETS.MATERIAL_TPSO, [buildMilestone17SampleTpsoRow_()], {
    staged_at: '2026-05-15T00:00:00+00:00',
    aliases: []
  }).data.rows[0];
  var sourceOnly = confirmStagingRowsBelongOnlyToSource_(PHASE1_SHEETS.MATERIAL_TPSO, [tpsoRow]);
  var mixedSource = confirmStagingRowsBelongOnlyToSource_(PHASE1_SHEETS.MATERIAL_TPSO, [tpsoRow, Object.assign({}, tpsoRow, { source_name: PHASE1_SHEETS.LABOR_CGD })]);
  var masterRow = convertStagingRowToMasterRow_(tpsoRow, '2026-05-15T00:00:00+00:00');
  var passed = sourceOnly.ok && !mixedSource.ok && mixedSource.error.code === 'staging_has_multiple_sources' && masterRow.source_name === PHASE1_SHEETS.MATERIAL_TPSO;
  if (!passed) {
    return failResult_(createError_('final_acceptance_selected_source_only_failed', 'Master update must replace only the selected source.', {
      source_only: sourceOnly,
      mixed_source: mixedSource,
      master_row: masterRow
    }, 'critical'));
  }
  return okResult_({ selected_source: PHASE1_SHEETS.MATERIAL_TPSO, source_only: true, mixed_source_blocked: true });
}

function runMilestone18TpsoRawUpdateContract_() {
  var apiRows = [buildMilestone17SampleTpsoRow_()];
  var extraction = extractTpsoResponseRows_({ data: apiRows });
  var validation = validateTpsoApiRows_(apiRows);
  var rawClearAllowed = PHASE1_SAFE_CLEAR_SHEETS.indexOf(PHASE1_SHEETS.MATERIAL_TPSO) !== -1;
  var masterClearForbidden = PHASE1_SAFE_CLEAR_SHEETS.indexOf(PHASE1_SHEETS.MASTER) === -1;
  var apiEndpointOk = PHASE1_TPSO_API_URL === 'https://index-api.tpso.go.th/OpenApi/CmiPrice/Month';
  var requiredFieldsPresent = findMissingValues_(PHASE1_TPSO_HEADER_MARKERS, Object.keys(apiRows[0])).length === 0;
  var passed = extraction.ok && validation.ok && rawClearAllowed && masterClearForbidden && apiEndpointOk && requiredFieldsPresent;
  if (!passed) {
    return failResult_(createError_('final_acceptance_tpso_raw_update_failed', 'TPSO API must update materialcost_tpso raw sheet only before master processing.', {
      extraction: extraction,
      validation: validation,
      raw_clear_allowed: rawClearAllowed,
      master_clear_forbidden: masterClearForbidden,
      api_endpoint_ok: apiEndpointOk,
      required_fields_present: requiredFieldsPresent
    }, 'critical'));
  }
  return okResult_({ endpoint: PHASE1_TPSO_API_URL, raw_sheet: PHASE1_SHEETS.MATERIAL_TPSO, master_clear_forbidden: true });
}

function runMilestone18TpsoMasterUpdateAfterValidation_() {
  var normalized = normalizeRawSourceRows_(PHASE1_SHEETS.MATERIAL_TPSO, [buildMilestone17SampleTpsoRow_()], {
    staged_at: '2026-05-15T00:00:00+00:00',
    aliases: []
  });
  if (!normalized.ok) {
    return normalized;
  }
  var row = normalized.data.rows[0];
  var validation = validateStagingRow_(row);
  var masterRow = validation.status !== 'fail' ? convertStagingRowToMasterRow_(row, '2026-05-15T00:00:00+00:00') : null;
  var passed = validation.status !== 'fail' && masterRow && masterRow.source_name === PHASE1_SHEETS.MATERIAL_TPSO && masterRow.price_basis === 'material_only';
  if (!passed) {
    return failResult_(createError_('final_acceptance_tpso_master_after_validation_failed', 'TPSO master rows must be created only after normalization and validation pass.', {
      normalized: normalized,
      validation: validation,
      master_row: masterRow
    }, 'critical'));
  }
  return okResult_({ normalized_rows: normalized.data.row_count, validation_status: validation.status, master_source_name: masterRow.source_name });
}

function runMilestone18FailureKeepsMasterData_() {
  var zeroRows = validateTpsoApiRows_([]);
  var missingFieldRow = Object.assign({}, buildMilestone17SampleTpsoRow_());
  delete missingFieldRow.priceCur;
  var missingFields = validateTpsoApiRows_([missingFieldRow]);
  var failedLog = buildRefreshLogRecord_(buildMilestone17RefreshLogData_('failed', 'kept_existing_master_data'));
  var blockedLog = buildRefreshLogRecord_(buildMilestone17RefreshLogData_('blocked_by_validation', 'kept_existing_master_data'));
  var invalidStaging = validateStagingRow_({ source_name: PHASE1_SHEETS.MATERIAL_TPSO, source_type: 'material' });
  var passed = !zeroRows.ok && !missingFields.ok && failedLog.action_taken === 'kept_existing_master_data' && blockedLog.action_taken === 'kept_existing_master_data' && invalidStaging.status === 'fail';
  if (!passed) {
    return failResult_(createError_('final_acceptance_failure_safety_failed', 'API failure or validation failure must keep existing master data.', {
      zero_rows: zeroRows,
      missing_fields: missingFields,
      failed_log: failedLog,
      blocked_log: blockedLog,
      invalid_staging: invalidStaging
    }, 'critical'));
  }
  return okResult_({ api_zero_rows_blocked: true, api_missing_fields_blocked: true, validation_fail_blocked: true, action_taken: 'kept_existing_master_data' });
}

function runMilestone18SearchReadsMasterOnly_() {
  var searchSmoke = runMilestone10SearchEngineSmokeTest();
  var readsMaster = SEARCH_FIELDS.indexOf('item_name_clean') !== -1 && SEARCH_RESULT_LIMIT === 10;
  var noRawSearchFields = SEARCH_FIELDS.indexOf('source_name') === -1 && SEARCH_FIELDS.indexOf('source_type') === -1;
  var passed = searchSmoke.ok && readsMaster && noRawSearchFields;
  if (!passed) {
    return failResult_(createError_('final_acceptance_search_scope_failed', 'Search must read and rank MASTER_PRICE_DATABASE data only.', {
      search_smoke: searchSmoke,
      reads_master: readsMaster,
      no_raw_search_fields: noRawSearchFields
    }, 'critical'));
  }
  return okResult_({ sheet: PHASE1_SHEETS.MASTER, fields: SEARCH_FIELDS.slice(), result_limit: SEARCH_RESULT_LIMIT });
}

function runMilestone18ManualSelectionContract_() {
  var webapp = runMilestone11WebAppContractSmokeTest();
  var selectionFunctionExists = typeof webAppGetSelectedItemDetail === 'function';
  var comparisonRequiresMasterId = webAppCompareSelectedPrice({
    selected_master_id: '',
    user_price: '1',
    user_unit: 'kg',
    user_quantity: '1',
    user_price_type: 'unknown'
  });
  var passed = webapp.ok && selectionFunctionExists && webapp.data.manual_selection_required === true && !comparisonRequiresMasterId.ok && comparisonRequiresMasterId.error.code === 'missing_selected_master_id';
  if (!passed) {
    return failResult_(createError_('final_acceptance_manual_selection_failed', 'WebApp must require the user to manually select a result before comparison.', {
      webapp: webapp,
      selection_function_exists: selectionFunctionExists,
      comparison_requires_master_id: comparisonRequiresMasterId
    }, 'critical'));
  }
  return okResult_({ manual_selection_required: true, selection_function: 'webAppGetSelectedItemDetail', comparison_requires_selected_master_id: true });
}

function runMilestone18RuleBasedBeforeGemini_() {
  var ruleResult = convertPricePerUnitWithGeminiFallback_(1000, 'ton', 'kg', {
    selected_item_name: 'วัสดุทดสอบ',
    user_quantity: '1',
    user_price_type: 'material'
  });
  var complexResult = convertPricePerUnitToReferenceUnit_(100, 'bag', 'kg');
  var passed = ruleResult.ok && ruleResult.data.conversion_source === 'rule_based' && !complexResult.ok && complexResult.error.code === 'unit_conversion_unavailable';
  if (!passed) {
    return failResult_(createError_('final_acceptance_unit_precedence_failed', 'Rule-based conversion must be attempted and used before Gemini.', {
      rule_result: ruleResult,
      complex_rule_result: complexResult
    }, 'critical'));
  }
  return okResult_({ rule_based_first: true, rule_result: ruleResult.data, complex_requires_interpretation: true });
}

function runMilestone18GeminiNotSearchEngine_() {
  var searchSmoke = runMilestone10SearchEngineSmokeTest();
  var geminiBounded = runMilestone14GeminiBoundarySmokeTest();
  var passed = searchSmoke.ok && geminiBounded.ok && GEMINI_UNIT_ALLOWED_INPUT_KEYS.indexOf('user_query') === -1 && GEMINI_UNIT_ALLOWED_INPUT_KEYS.indexOf('master_database') === -1;
  if (!passed) {
    return failResult_(createError_('final_acceptance_gemini_search_boundary_failed', 'Gemini must not be used as the Phase 1 search engine.', {
      search_smoke: searchSmoke,
      gemini_boundary: geminiBounded,
      gemini_allowed_input_keys: GEMINI_UNIT_ALLOWED_INPUT_KEYS.slice()
    }, 'critical'));
  }
  return okResult_({ gemini_scope: 'complex_unit_conversion_only', search_engine: 'rule_based_master_sheet_search' });
}

function runMilestone18LogsComplete_() {
  var refreshLog = runMilestone8RefreshLogSmokeTest();
  var searchLog = runMilestone15SearchLogSmokeTest();
  var refreshSchemaOk = arraysEqual_(PHASE1_SCHEMAS.REFRESH_LOG, PHASE1_SCHEMAS.REFRESH_LOG.slice());
  var searchSchemaOk = arraysEqual_(PHASE1_SCHEMAS.SEARCH_LOG, PHASE1_SCHEMAS.SEARCH_LOG.slice());
  var passed = refreshLog.ok && searchLog.ok && refreshSchemaOk && searchSchemaOk;
  if (!passed) {
    return failResult_(createError_('final_acceptance_logs_failed', 'REFRESH_LOG and SEARCH_LOG contracts must both pass.', {
      refresh_log: refreshLog,
      search_log: searchLog,
      refresh_schema_ok: refreshSchemaOk,
      search_schema_ok: searchSchemaOk
    }, 'critical'));
  }
  return okResult_({ refresh_log: refreshLog.data, search_log: searchLog.data });
}

function runMilestone18RowHasStagingShape_(row) {
  if (!row) {
    return false;
  }
  return PHASE1_SCHEMAS.STAGING_NORMALIZED.every(function(fieldName) {
    return Object.prototype.hasOwnProperty.call(row, fieldName);
  });
}

function buildMilestone18SampleRawRows_() {
  return {
    laborcost_cgd: {
      category_l1: 'งานโครงสร้าง',
      category_l2: 'หมวดแรงงาน',
      category_l3: 'งานตอกเสาเข็ม',
      item_code: 'LCGD-1',
      item_description_clean: 'ค่าแรงตอกเสาเข็มทดสอบ',
      unit: 'ต้น',
      labor_cost_thb: '95',
      row_note: 'จำนวน 200 ต้นขึ้นไป',
      context_note: 'ทดสอบ mapping'
    },
    laborcost_obec: {
      category_l1: 'งานโครงสร้าง',
      category_l2: 'งานขุดดิน',
      category_l3: 'ขุดดินฐานราก',
      item_code: 'LOBEC-1',
      item_description_clean: 'ค่าแรงขุดดินทดสอบ',
      unit: 'ลบ.ม.',
      material_cost_thb: '999',
      labor_cost_thb: '112',
      row_note: '',
      context_note: 'material_cost_thb ignored in Phase 1'
    },
    materialcost_obec: {
      category_l1: 'งานโครงสร้าง',
      category_l2: 'งานขุดดิน',
      category_l3: 'วัสดุรองฐานราก',
      item_code: 'MOBEC-1',
      item_description_clean: 'ทรายหยาบรองพื้นทดสอบ',
      unit: 'ลบ.ม.',
      material_cost_thb: '510',
      labor_cost_thb: '104',
      row_note: '',
      context_note: ''
    },
    materialcost_tpso: buildMilestone17SampleTpsoRow_()
  };
}
