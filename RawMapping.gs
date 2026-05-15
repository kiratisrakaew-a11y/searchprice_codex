/**
 * Milestone 3 raw source mapping into the common Phase 1 staging schema.
 */
const PHASE1_RAW_MAPPING_CONFIG = Object.freeze({
  laborcost_cgd: Object.freeze({
    source_name: 'laborcost_cgd',
    source_type: 'labor',
    update_frequency: 'yearly',
    price_basis: 'labor_only',
    header_row: 1,
    data_start_row: 2,
    required_headers: Object.freeze([
      'category_l1',
      'category_l2',
      'category_l3',
      'item_code',
      'item_description_clean',
      'unit',
      'labor_cost_thb',
      'row_note',
      'context_note'
    ])
  }),
  laborcost_obec: Object.freeze({
    source_name: 'laborcost_obec',
    source_type: 'labor',
    update_frequency: 'yearly',
    price_basis: 'labor_only',
    header_row: 1,
    data_start_row: 2,
    required_headers: Object.freeze([
      'category_l1',
      'category_l2',
      'category_l3',
      'item_code',
      'item_description_clean',
      'unit',
      'labor_cost_thb',
      'row_note',
      'context_note'
    ]),
    ignored_headers: Object.freeze(['material_cost_thb'])
  }),
  materialcost_obec: Object.freeze({
    source_name: 'materialcost_obec',
    source_type: 'material_labor',
    update_frequency: 'yearly',
    price_basis: 'material_plus_labor',
    header_row: 1,
    data_start_row: 2,
    required_headers: Object.freeze([
      'category_l1',
      'category_l2',
      'category_l3',
      'item_code',
      'item_description_clean',
      'unit',
      'material_cost_thb',
      'labor_cost_thb',
      'row_note',
      'context_note'
    ])
  }),
  materialcost_tpso: Object.freeze({
    source_name: 'materialcost_tpso',
    source_type: 'material',
    update_frequency: 'monthly',
    price_basis: 'material_only',
    required_headers: Object.freeze([
      'commodityCode',
      'commodityNameTH',
      'unitName',
      'priceCur',
      'curYear',
      'curMonth',
      'typeName',
      'createdAt'
    ])
  })
});

function getRawMappingConfig_(sourceName) {
  return PHASE1_RAW_MAPPING_CONFIG[sourceName] || null;
}

function normalizeRawSourceSheet_(sourceName, options) {
  var opts = options || {};
  var config = getRawMappingConfig_(sourceName);
  if (!config) {
    return failResult_(createError_('unknown_source', 'Unknown raw source: ' + sourceName, { source_name: sourceName }, 'critical'));
  }

  var headerRow = config.header_row || 1;
  var dataStartRow = config.data_start_row || headerRow + 1;
  if (sourceName === PHASE1_SHEETS.MATERIAL_TPSO) {
    var spreadsheet = opts.spreadsheet || getActiveSpreadsheet_();
    var sheet = getSheetByName_(spreadsheet, sourceName);
    if (!sheet) {
      return failResult_(createError_('sheet_not_found', 'Sheet not found: ' + sourceName, { sheet_name: sourceName }, 'critical'));
    }
    headerRow = detectTpsoHeaderRow_(sheet);
    if (!headerRow) {
      return failResult_(createError_('tpso_header_not_found', 'TPSO response header row could not be detected', { sheet_name: sourceName }, 'critical'));
    }
    dataStartRow = headerRow + 1;
  }

  var readResult = readSheetRowsByHeader_(sourceName, {
    spreadsheet: opts.spreadsheet,
    header_row: headerRow,
    data_start_row: dataStartRow,
    required_headers: config.required_headers,
    max_rows: opts.max_rows
  });
  if (!readResult.ok) {
    return readResult;
  }

  return normalizeRawSourceRows_(sourceName, readResult.data.rows, {
    header_map: readResult.data.header_map,
    staged_at: opts.staged_at,
    skip_blank_rows: opts.skip_blank_rows !== false
  });
}

function normalizeRawSourceRows_(sourceName, rawRows, options) {
  var opts = options || {};
  var config = getRawMappingConfig_(sourceName);
  if (!config) {
    return failResult_(createError_('unknown_source', 'Unknown raw source: ' + sourceName, { source_name: sourceName }, 'critical'));
  }

  var headerValidation = validateRawMappingHeaders_(config, opts.header_map, rawRows || []);
  if (!headerValidation.ok) {
    return headerValidation;
  }

  var normalizedRows = [];
  var errors = [];
  (rawRows || []).forEach(function(rawRow, rowIndex) {
    if (opts.skip_blank_rows !== false && isRawRowBlank_(rawRow, config.required_headers)) {
      return;
    }

    var rowResult = mapRawRowToCommonSchema_(sourceName, rawRow, {
      staged_at: opts.staged_at,
      row_index: rowIndex
    });
    if (rowResult.ok) {
      normalizedRows.push(rowResult.data.row);
    } else {
      errors.push(rowResult.error);
    }
  });

  if (errors.length) {
    return failResult_(createError_(
      'raw_mapping_failed',
      'One or more raw rows could not be mapped for source: ' + sourceName,
      { source_name: sourceName, errors: errors },
      'critical'
    ));
  }

  return okResult_({
    source_name: sourceName,
    row_count: normalizedRows.length,
    rows: normalizedRows
  });
}

function validateRawMappingHeaders_(config, headerMap, rawRows) {
  var missing = [];
  if (headerMap) {
    missing = config.required_headers.filter(function(headerName) {
      return !headerMap[headerName];
    });
  } else if (rawRows.length) {
    missing = config.required_headers.filter(function(headerName) {
      return !Object.prototype.hasOwnProperty.call(rawRows[0], headerName);
    });
  }

  if (missing.length) {
    return failResult_(createError_(
      'missing_raw_column',
      'Missing required raw column(s): ' + missing.join(', '),
      { source_name: config.source_name, missing_raw_columns: missing },
      'critical'
    ));
  }

  return okResult_({ source_name: config.source_name });
}

function mapRawRowToCommonSchema_(sourceName, rawRow, options) {
  var config = getRawMappingConfig_(sourceName);
  if (!config) {
    return failResult_(createError_('unknown_source', 'Unknown raw source: ' + sourceName, { source_name: sourceName }, 'critical'));
  }

  var rowValidation = validateRawRowColumns_(config, rawRow || {});
  if (!rowValidation.ok) {
    return rowValidation;
  }

  if (sourceName === PHASE1_SHEETS.LABOR_CGD || sourceName === PHASE1_SHEETS.LABOR_OBEC) {
    return okResult_({ row: mapLaborCostRow_(config, rawRow, options || {}) });
  }

  if (sourceName === PHASE1_SHEETS.MATERIAL_OBEC) {
    return okResult_({ row: mapMaterialObecRow_(config, rawRow, options || {}) });
  }

  if (sourceName === PHASE1_SHEETS.MATERIAL_TPSO) {
    return okResult_({ row: mapTpsoRow_(config, rawRow, options || {}) });
  }

  return failResult_(createError_('unsupported_source', 'Unsupported source: ' + sourceName, { source_name: sourceName }, 'critical'));
}

function validateRawRowColumns_(config, rawRow) {
  var missing = config.required_headers.filter(function(headerName) {
    return !Object.prototype.hasOwnProperty.call(rawRow, headerName);
  });

  if (missing.length) {
    return failResult_(createError_(
      'missing_raw_column',
      'Missing required raw column(s): ' + missing.join(', '),
      { source_name: config.source_name, missing_raw_columns: missing },
      'critical'
    ));
  }

  return okResult_({ source_name: config.source_name });
}

function mapLaborCostRow_(config, rawRow, options) {
  var laborCost = parseNumber_(rawRow.labor_cost_thb);
  var itemNameOriginal = cleanDisplayText_(rawRow.item_description_clean);
  var note = combineNotes_(rawRow.row_note, rawRow.context_note);

  return buildStagingRecord_({
    source_name: config.source_name,
    source_type: config.source_type,
    update_frequency: config.update_frequency,
    item_code: cleanDisplayText_(rawRow.item_code),
    item_name_original: itemNameOriginal,
    item_name_clean: cleanItemName_(itemNameOriginal),
    category_level_1: cleanDisplayText_(rawRow.category_l1),
    category_level_2: cleanDisplayText_(rawRow.category_l2),
    category_level_3: cleanDisplayText_(rawRow.category_l3),
    unit: cleanDisplayText_(rawRow.unit),
    price: laborCost,
    material_cost: '',
    labor_cost: laborCost,
    total_cost: laborCost,
    price_basis: config.price_basis,
    province: '',
    region: '',
    effective_year: '',
    effective_month: '',
    note: note,
    staged_at: options.staged_at || getCurrentTimestamp_()
  });
}

function mapMaterialObecRow_(config, rawRow, options) {
  var materialCost = parseNumber_(rawRow.material_cost_thb);
  var laborCost = parseNumber_(rawRow.labor_cost_thb);
  var totalCost = addNullableNumbers_(materialCost, laborCost);
  var itemNameOriginal = cleanDisplayText_(rawRow.item_description_clean);
  var note = combineNotes_(rawRow.row_note, rawRow.context_note);

  return buildStagingRecord_({
    source_name: config.source_name,
    source_type: config.source_type,
    update_frequency: config.update_frequency,
    item_code: cleanDisplayText_(rawRow.item_code),
    item_name_original: itemNameOriginal,
    item_name_clean: cleanItemName_(itemNameOriginal),
    category_level_1: cleanDisplayText_(rawRow.category_l1),
    category_level_2: cleanDisplayText_(rawRow.category_l2),
    category_level_3: cleanDisplayText_(rawRow.category_l3),
    unit: cleanDisplayText_(rawRow.unit),
    price: totalCost,
    material_cost: materialCost,
    labor_cost: laborCost,
    total_cost: totalCost,
    price_basis: config.price_basis,
    province: '',
    region: '',
    effective_year: '',
    effective_month: '',
    note: note,
    staged_at: options.staged_at || getCurrentTimestamp_()
  });
}

function mapTpsoRow_(config, rawRow, options) {
  var priceCur = parseNumber_(rawRow.priceCur);
  var itemNameOriginal = cleanDisplayText_(rawRow.commodityNameTH);
  var createdAtNote = cleanDisplayText_(rawRow.createdAt);

  return buildStagingRecord_({
    source_name: config.source_name,
    source_type: config.source_type,
    update_frequency: config.update_frequency,
    item_code: cleanDisplayText_(rawRow.commodityCode),
    item_name_original: itemNameOriginal,
    item_name_clean: cleanItemName_(itemNameOriginal),
    category_level_1: '',
    category_level_2: '',
    category_level_3: cleanDisplayText_(rawRow.typeName),
    unit: cleanDisplayText_(rawRow.unitName),
    price: priceCur,
    material_cost: priceCur,
    labor_cost: '',
    total_cost: priceCur,
    price_basis: config.price_basis,
    province: '',
    region: cleanDisplayText_(rawRow.typeName),
    effective_year: cleanDisplayText_(rawRow.curYear),
    effective_month: cleanDisplayText_(rawRow.curMonth),
    note: createdAtNote ? 'createdAt: ' + createdAtNote : '',
    staged_at: options.staged_at || getCurrentTimestamp_()
  });
}

function buildStagingRecord_(values) {
  var record = {
    staging_id: generateStagingId_(),
    source_name: values.source_name,
    source_type: values.source_type,
    update_frequency: values.update_frequency,
    item_code: values.item_code,
    item_name_original: values.item_name_original,
    item_name_clean: values.item_name_clean,
    category_level_1: values.category_level_1,
    category_level_2: values.category_level_2,
    category_level_3: values.category_level_3,
    unit: values.unit,
    price: valueOrBlank_(values.price),
    material_cost: valueOrBlank_(values.material_cost),
    labor_cost: valueOrBlank_(values.labor_cost),
    total_cost: valueOrBlank_(values.total_cost),
    price_basis: values.price_basis,
    province: values.province || '',
    region: values.region || '',
    effective_year: values.effective_year || '',
    effective_month: values.effective_month || '',
    note: values.note || '',
    search_keywords: '',
    alias_terms: '',
    normalized_text: '',
    validation_status: '',
    validation_issues: '',
    needs_review: '',
    review_note: '',
    staged_at: values.staged_at
  };

  record.search_keywords = buildSearchKeywords_(record);
  record.normalized_text = buildNormalizedText_(record);
  return record;
}

function buildSearchKeywords_(record) {
  return normalizeText_([
    record.item_name_clean,
    record.category_level_1,
    record.category_level_2,
    record.category_level_3,
    record.unit,
    record.note
  ].filter(function(value) {
    return value !== '' && value !== null && value !== undefined;
  }).join(' '));
}

function buildNormalizedText_(record) {
  return normalizeText_([
    record.item_code,
    record.item_name_original,
    record.item_name_clean,
    record.category_level_1,
    record.category_level_2,
    record.category_level_3,
    record.unit,
    record.note,
    record.search_keywords,
    record.alias_terms
  ].filter(function(value) {
    return value !== '' && value !== null && value !== undefined;
  }).join(' '));
}

function combineNotes_(rowNote, contextNote) {
  var notes = [cleanDisplayText_(rowNote), cleanDisplayText_(contextNote)].filter(function(value) {
    return value;
  });
  return notes.join(' | ');
}

function cleanItemName_(value) {
  return cleanDisplayText_(value);
}

function cleanDisplayText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addNullableNumbers_(left, right) {
  var leftValue = left === null || left === '' ? 0 : left;
  var rightValue = right === null || right === '' ? 0 : right;
  if ((left === null || left === '') && (right === null || right === '')) {
    return null;
  }
  return leftValue + rightValue;
}

function valueOrBlank_(value) {
  return value === null || value === undefined ? '' : value;
}

function isRawRowBlank_(rawRow, requiredHeaders) {
  return (requiredHeaders || []).every(function(headerName) {
    return cleanDisplayText_((rawRow || {})[headerName]) === '';
  });
}
