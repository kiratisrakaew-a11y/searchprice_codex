# AGENTS.md

## Project

This repository contains a Phase 1 Google Sheets + Google Apps Script WebApp for a BOQ / construction / service / material price reference database.

The purpose of this file is to control Codex behavior. Follow it strictly.

## Repository Layout Expected by Codex

Place this file at the repository root.

Required documentation files must be placed in the `/docs` folder:

```text
/AGENTS.md
/docs/01_PROJECT_OVERVIEW.md
/docs/02_REQUIREMENTS.md
/docs/03_DATA_SCHEMA.md
/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md
/docs/05_WORKFLOW.md
/docs/06_APPS_SCRIPT_SPEC.md
/docs/07_MATCHING_LOGIC.md
/docs/08_GEMINI_API_BOUNDARY.md
/docs/09_TESTING_CHECKLIST.md
/docs/10_CODEX_INSTRUCTIONS.md
```

If any required file is missing, stop and report the missing file. Do not guess.

## Required Reading Before Coding

Before writing or modifying code, read all files in this order:

1. `AGENTS.md`
2. `/docs/01_PROJECT_OVERVIEW.md`
3. `/docs/02_REQUIREMENTS.md`
4. `/docs/03_DATA_SCHEMA.md`
5. `/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md`
6. `/docs/05_WORKFLOW.md`
7. `/docs/06_APPS_SCRIPT_SPEC.md`
8. `/docs/07_MATCHING_LOGIC.md`
9. `/docs/08_GEMINI_API_BOUNDARY.md`
10. `/docs/09_TESTING_CHECKLIST.md`
11. `/docs/10_CODEX_INSTRUCTIONS.md`

After reading, summarize the implementation plan before coding.

## Phase 1 Scope

Implement only the confirmed Phase 1 system.

Allowed Phase 1 work:

- Google Sheets custom menu.
- Source refresh and process actions.
- TPSO API refresh into `materialcost_tpso` only.
- Source normalization into `STAGING_NORMALIZED`.
- Validation before updating master data.
- Source-specific replacement in `MASTER_PRICE_DATABASE`.
- `REFRESH_LOG` writing.
- Search from `MASTER_PRICE_DATABASE` only.
- `SEARCH_LOG` writing.
- Alias enrichment from reviewed `ALIAS_DICTIONARY` rows.
- Simple WebApp for search, manual result selection, and price comparison.
- Rule-based unit conversion first.
- Gemini-assisted unit interpretation only when rule-based conversion cannot handle the unit.
- Error handling and test routines.

Out of scope for Phase 1:

- Login.
- Role-based permissions.
- Approval workflow.
- Full admin panel.
- Dashboard.
- Export report.
- `COMPARISON_LOG`.
- Auto-approve price.
- Auto-reject price.
- Auto-update master prices from the WebApp.
- Auto-learn aliases directly into `ALIAS_DICTIONARY`.
- Gemini or any AI model as the search engine.
- WebApp editing of raw source sheets, staging, or master.

## Non-Negotiable Safety Rules

1. Do not rename sheets or columns unless explicitly instructed by the user.
2. Do not add features outside Phase 1.
3. Do not let the WebApp write to raw source sheets, `STAGING_NORMALIZED`, or `MASTER_PRICE_DATABASE`.
4. Do not use Gemini as the Phase 1 search engine.
5. Do not auto-select search results for the user.
6. Do not auto-approve or auto-reject prices.
7. Do not create or use `COMPARISON_LOG` in Phase 1.
8. Do not hardcode API keys or credentials.
9. Do not delete or replace existing master rows before validation passes.
10. Do not rebuild the entire `MASTER_PRICE_DATABASE` unless explicitly instructed.
11. Replace only rows for the source currently being processed.
12. Do not auto-add aliases to `ALIAS_DICTIONARY`.

## Conflict Handling

If documents conflict, stop and report:

- the conflicting files,
- the conflicting requirement text,
- the safest recommended interpretation,
- and the question that must be answered before coding.

Do not resolve conflicts silently.

## Schema Handling

Use header-name lookup whenever possible.

Do not rely on hardcoded column numbers except where unavoidable. If hardcoded indexes are unavoidable, define them in one configuration module and document why.

If the workbook schema differs from `/docs/03_DATA_SCHEMA.md`, stop and report the mismatch before changing any data.

## Coding Style

- Keep code modular by responsibility.
- Prefer separate files or modules for config, sheet utilities, normalization, validation, master update, search, comparison, unit conversion, Gemini boundary, logging, and WebApp handlers.
- Use structured return objects for WebApp calls.
- Use safe error handling.
- Log refresh/process outcomes in `REFRESH_LOG`.
- Log search behavior in `SEARCH_LOG`.
- Guard destructive operations with validation.

## First Codex Task Behavior

For the first implementation task, do not immediately code. First produce:

1. Files read.
2. Implementation modules/files to create.
3. Risks or missing workbook details.
4. Step-by-step implementation plan.
5. Tests to run from `/docs/09_TESTING_CHECKLIST.md`.

Only start coding after the user approves the plan or explicitly asks to proceed.
