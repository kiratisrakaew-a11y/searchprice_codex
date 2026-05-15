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
  PHASE1_SHEETS.SEARCH_LOG
]);

const PHASE1_OPTIONAL_SHEETS = Object.freeze([
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


const PHASE1_SAFE_APPEND_SHEETS = Object.freeze([
  PHASE1_SHEETS.STAGING,
  PHASE1_SHEETS.MASTER,
  PHASE1_SHEETS.REFRESH_LOG,
  PHASE1_SHEETS.SEARCH_LOG
]);

const PHASE1_SAFE_CLEAR_SHEETS = Object.freeze([
  PHASE1_SHEETS.STAGING,
  PHASE1_SHEETS.MATERIAL_TPSO
]);

const PHASE1_TPSO_API_URL_PROPERTY = 'PHASE1_TPSO_API_URL';
const PHASE1_DEFAULT_TPSO_API_URL = 'https://index-api.tpso.go.th/OpenApi/CmiPrice/Month';
const PHASE1_TPSO_API_URL = getPhase1TpsoApiUrl_();

const PHASE1_TPSO_REQUIRED_RESPONSE_FIELDS = Object.freeze([
  'typeName',
  'commodityCode',
  'commodityNameTH',
  'unitName',
  'curMonth',
  'curYear',
  'priceCur'
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

const PHASE1_ADMIN_SELECTED_SOURCE_PROPERTY = 'PHASE1_ADMIN_SELECTED_SOURCE';
const PHASE1_ADMIN_VALIDATED_SOURCE_PROPERTY = 'PHASE1_ADMIN_VALIDATED_SOURCE';
const PHASE1_ADMIN_VALIDATION_PASSED_PROPERTY = 'PHASE1_ADMIN_VALIDATION_PASSED';
const PHASE1_ADMIN_VALIDATION_AT_PROPERTY = 'PHASE1_ADMIN_VALIDATION_AT';

const PHASE1_ADMIN_MENU_ITEMS = Object.freeze([
  'Refresh TPSO from API',
  'Process CGD Labor',
  'Process OBEC Labor',
  'Process OBEC Material',
  'Process TPSO Material',
  'Validate Staging',
  'Update Master for Selected Source',
  'View Last Refresh Status',
  'Run Phase 1 Test Checks'
]);


function getPhase1TpsoApiUrl_() {
  try {
    var configuredUrl = PropertiesService.getScriptProperties().getProperty(PHASE1_TPSO_API_URL_PROPERTY);
    return String(configuredUrl || '').trim() || PHASE1_DEFAULT_TPSO_API_URL;
  } catch (error) {
    return PHASE1_DEFAULT_TPSO_API_URL;
  }
}
