/**
 * Phase 1 configuration constants for sheet setup and schema guard.
 */
const PHASE1_SHEETS = Object.freeze({
  LABOR_CGD: 'laborcost_cgd',
  LABOR_OBEC: 'laborcost_obec',
  MATERIAL_OBEC: 'materialcost_obec',
  MATERIAL_TPSO: 'materialcost_tpso',
  STAGING: 'STAGING_NORMALIZED',
  MASTER: 'MASTER_PRICE_DATABASE',
  ALIAS: 'ALIAS_DICTIONARY',
  REFRESH_LOG: 'REFRESH_LOG',
  SEARCH_LOG: 'SEARCH_LOG',
  CHECKLIST: 'CHECKLIST_2_SCHEMA'
});

const PHASE1_REQUIRED_SHEETS = Object.freeze([
  PHASE1_SHEETS.LABOR_CGD,
  PHASE1_SHEETS.LABOR_OBEC,
  PHASE1_SHEETS.MATERIAL_OBEC,
  PHASE1_SHEETS.MATERIAL_TPSO,
  PHASE1_SHEETS.STAGING,
  PHASE1_SHEETS.MASTER,
  PHASE1_SHEETS.ALIAS,
  PHASE1_SHEETS.REFRESH_LOG,
  PHASE1_SHEETS.SEARCH_LOG,
  PHASE1_SHEETS.CHECKLIST
]);

const PHASE1_SCHEMA_MANAGED_SHEETS = Object.freeze([
  PHASE1_SHEETS.STAGING,
  PHASE1_SHEETS.MASTER,
  PHASE1_SHEETS.ALIAS,
  PHASE1_SHEETS.REFRESH_LOG,
  PHASE1_SHEETS.SEARCH_LOG
]);

const PHASE1_RAW_SHEETS = Object.freeze([
  PHASE1_SHEETS.LABOR_CGD,
  PHASE1_SHEETS.LABOR_OBEC,
  PHASE1_SHEETS.MATERIAL_OBEC,
  PHASE1_SHEETS.MATERIAL_TPSO
]);

const PHASE1_TPSO_HEADER_MARKERS = Object.freeze([
  'id',
  'type',
  'typeName',
  'commodityCode',
  'commodityNameTH',
  'unitName',
  'curMonth',
  'curYear',
  'priceCur',
  'priceVAT',
  'createdAt'
]);

/**
 * TPSO public API endpoint (docs/08_TPSO_API_SPEC.md).
 * Public API; no credential required.
 */
const PHASE1_TPSO_API_URL = 'https://index-api.tpso.go.th/OpenApi/CmiPrice/Month';

/**
 * Allowlist of sheets that appendRowsByHeader_ may write to.
 * MASTER is allowed but additionally gated by validation_passed=true.
 */
const PHASE1_SAFE_APPEND_SHEETS = Object.freeze([
  PHASE1_SHEETS.STAGING,
  PHASE1_SHEETS.MASTER,
  PHASE1_SHEETS.REFRESH_LOG,
  PHASE1_SHEETS.SEARCH_LOG
]);

/**
 * Allowlist of sheets that safeClearRange_ may clear.
 * MASTER is explicitly forbidden inside validateClearGuard_ regardless.
 * TPSO response area (rows 4+) is cleared during refresh; rows 1-3 are protected by row guard.
 */
const PHASE1_SAFE_CLEAR_SHEETS = Object.freeze([
  PHASE1_SHEETS.STAGING,
  PHASE1_SHEETS.MATERIAL_TPSO
]);

/**
 * Document property keys used by the admin menu workflow to remember the
 * currently selected source and the most recent validation state.
 */
const PHASE1_ADMIN_SELECTED_SOURCE_PROPERTY = 'PHASE1_ADMIN_SELECTED_SOURCE';
const PHASE1_ADMIN_VALIDATED_SOURCE_PROPERTY = 'PHASE1_ADMIN_VALIDATED_SOURCE';
const PHASE1_ADMIN_VALIDATION_PASSED_PROPERTY = 'PHASE1_ADMIN_VALIDATION_PASSED';
const PHASE1_ADMIN_VALIDATION_AT_PROPERTY = 'PHASE1_ADMIN_VALIDATION_AT';
