# AGENTS.md

## Codex Operating Rules

This repository is for a Phase 1 Google Sheets + Google Apps Script WebApp used to build and search a BOQ / construction / service / material price reference database.

This file is for **Codex only**. Do not add Claude-specific or other assistant-specific instructions to this repository.

Codex must read this file before doing any work, then read every required file in `/docs` before implementing or modifying code.

The current workbook authority is:

```text
database_with_checklist_3.xlsx
```

The raw-to-master mapping authority is:

```text
/docs/03A_RAW_SOURCE_MAPPING.md
```

The TPSO API authority is:

```text
/docs/08_TPSO_API_SPEC.md
```

## Expected Repository Layout

```text
/AGENTS.md
/README_FOR_USER.md
/docs/01_PROJECT_OVERVIEW.md
/docs/02_REQUIREMENTS.md
/docs/03_DATA_SCHEMA.md
/docs/03A_RAW_SOURCE_MAPPING.md
/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md
/docs/05_WORKFLOW.md
/docs/06_APPS_SCRIPT_SPEC.md
/docs/07_MATCHING_LOGIC.md
/docs/08_TPSO_API_SPEC.md
/docs/08_GEMINI_API_BOUNDARY.md
/docs/09_TESTING_CHECKLIST.md
/docs/10_CODEX_INSTRUCTIONS.md
```

Do not create or use `CLAUDE.md` in this Codex-only package.

If a required documentation file is missing, stop and report the missing file. Do not guess.

## Required Reading Order Before Coding

Codex must read in this order:

1. `AGENTS.md`
2. `/docs/01_PROJECT_OVERVIEW.md`
3. `/docs/02_REQUIREMENTS.md`
4. `/docs/03_DATA_SCHEMA.md`
5. `/docs/03A_RAW_SOURCE_MAPPING.md`
6. `/docs/04_GOOGLE_SHEETS_ARCHITECTURE.md`
7. `/docs/05_WORKFLOW.md`
8. `/docs/06_APPS_SCRIPT_SPEC.md`
9. `/docs/07_MATCHING_LOGIC.md`
10. `/docs/08_TPSO_API_SPEC.md`
11. `/docs/08_GEMINI_API_BOUNDARY.md`
12. `/docs/09_TESTING_CHECKLIST.md`
13. `/docs/10_CODEX_INSTRUCTIONS.md`

After reading, Codex must summarize the plan before coding.

## Non-Negotiable Safety Rules

1. Implement Phase 1 only.
2. Do not rename sheets or columns unless explicitly instructed.
3. Use `/docs/03A_RAW_SOURCE_MAPPING.md` as the source-to-master mapping authority.
4. Do not let the WebApp write to raw source sheets, `STAGING_NORMALIZED`, or `MASTER_PRICE_DATABASE`.
5. Do not use Gemini as the Phase 1 search engine.
6. Do not auto-select search results for the user.
7. Do not auto-approve or auto-reject prices.
8. Do not create or use `COMPARISON_LOG` in Phase 1.
9. Do not hardcode API keys or credentials.
10. Do not delete or replace existing master rows before validation passes.
11. Replace only rows for the source currently being processed.
12. Do not auto-add aliases to `ALIAS_DICTIONARY`.
13. TPSO API writes only to `materialcost_tpso` first. Master update happens only after normalize and validation.
14. If requirements conflict, stop and report the conflict. Do not improvise.
15. If the workbook schema differs from these documents, stop and report the mismatch before changing anything.

## First Codex Task Behavior

For the first implementation task, do not immediately code. First produce:

1. Files read.
2. Workbook and sheet assumptions detected.
3. Raw-to-master mapping summary.
4. TPSO API update flow summary.
5. Apps Script module/file structure to create.
6. Missing details or conflicts.
7. Step-by-step implementation plan.
8. Tests to run from `/docs/09_TESTING_CHECKLIST.md`.

Only start coding after the user approves the plan or explicitly asks Codex to proceed.

## Development Style

- Use header-name lookup instead of hardcoded column numbers whenever possible.
- Keep modules separated by responsibility.
- Use safe error handling.
- Log refresh/process outcomes in `REFRESH_LOG`.
- Log search behavior in `SEARCH_LOG`.
- Keep destructive operations guarded by validation.
- Prefer small, reviewable changes over one large risky implementation.
