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
