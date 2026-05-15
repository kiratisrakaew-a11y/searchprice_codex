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
