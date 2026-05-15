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
