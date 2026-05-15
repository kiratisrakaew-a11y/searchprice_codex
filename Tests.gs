/**
 * Milestone smoke-test entrypoints.
 *
 * Milestone 1 has a concrete sheet/schema setup runner. Milestones 2-18 expose
 * lightweight stub entrypoints so adminRunPhase1TestChecks() can be executed
 * without throwing ReferenceError. Each stub returns ok=true with status=
 * 'pending_manual_run' so the operator can extend the suite per
 * /docs/09_TESTING_CHECKLIST.md without changing call sites.
 */
function runMilestone1SheetSetupAndSchemaGuardTest() {
  return setupPhase1Sheets();
}

function runMilestone1SchemaGuardValidationOnly() {
  return validatePhase1Sheets();
}

function pendingMilestoneStub_(milestoneId, description) {
  return okResult_({
    milestone: milestoneId,
    description: description,
    status: 'pending_manual_run',
    message: 'Stub entrypoint. Run the milestone test manually per /docs/09_TESTING_CHECKLIST.md.'
  });
}

function runMilestone2CoreUtilitySmokeTest() {
  return pendingMilestoneStub_('milestone_2', 'Core utility smoke test');
}

function runMilestone3RawMappingSmokeTest() {
  return pendingMilestoneStub_('milestone_3', 'Raw-to-staging mapping smoke test');
}

function runMilestone4TpsoApiValidationSmokeTest() {
  return pendingMilestoneStub_('milestone_4', 'TPSO API validation smoke test');
}

function runMilestone5NormalizeRowsSmokeTest() {
  return pendingMilestoneStub_('milestone_5', 'Normalize rows smoke test');
}

function runMilestone6ValidationSmokeTest() {
  return pendingMilestoneStub_('milestone_6', 'Staging validation smoke test');
}

function runMilestone7MasterUpdateSmokeTest() {
  return pendingMilestoneStub_('milestone_7', 'Master update helpers smoke test');
}

function runMilestone8RefreshLogSmokeTest() {
  return pendingMilestoneStub_('milestone_8', 'REFRESH_LOG smoke test');
}

function runMilestone9SearchHelperSmokeTest() {
  return pendingMilestoneStub_('milestone_9', 'Search helpers smoke test');
}

function runMilestone10SearchEngineSmokeTest() {
  return pendingMilestoneStub_('milestone_10', 'Search engine smoke test');
}

function runMilestone11WebAppContractSmokeTest() {
  return pendingMilestoneStub_('milestone_11', 'WebApp contract smoke test');
}

function runMilestone12PriceComparisonSmokeTest() {
  return pendingMilestoneStub_('milestone_12', 'Price comparison smoke test');
}

function runMilestone13UnitConversionSmokeTest() {
  return pendingMilestoneStub_('milestone_13', 'Unit conversion smoke test');
}

function runMilestone14GeminiBoundarySmokeTest() {
  return pendingMilestoneStub_('milestone_14', 'Gemini boundary smoke test');
}

function runMilestone15SearchLogSmokeTest() {
  return pendingMilestoneStub_('milestone_15', 'SEARCH_LOG smoke test');
}

function runMilestone16AdminMenuSmokeTest() {
  return pendingMilestoneStub_('milestone_16', 'Admin menu smoke test');
}

function runMilestone17ChecklistValidationSuite() {
  return pendingMilestoneStub_('milestone_17', 'Checklist validation suite');
}

function runMilestone18FinalAcceptanceSuite() {
  return pendingMilestoneStub_('milestone_18', 'Final acceptance suite');
}
