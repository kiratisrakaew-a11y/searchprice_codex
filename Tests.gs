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
