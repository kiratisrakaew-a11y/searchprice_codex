# README for User — Phase 1 Price Reference Database

This package contains the Phase 1 Google Sheets workbook and Apps Script
WebApp source for the BOQ / construction / service / material price
reference database.

This README is for the end user / operator running the system. It is **not**
the operating spec — see `AGENTS.md` and `/docs` for the authoritative
specifications.

## What is in this repository

- `database_with_checklist_3.xlsx` — workbook authority for the Phase 1
  schema. Open this in Google Sheets to get the starting workbook.
- `*.gs`, `Index.html`, `appsscript.json` — Apps Script source bound to
  the workbook.
- `/docs` — full Phase 1 specifications (read in order, starting with
  `/docs/01_PROJECT_OVERVIEW.md`).
- `AGENTS.md` — operating rules for Codex when modifying this package.
- `.github/workflows/deploy.yml` — CI deploy workflow.

## First-time setup

1. Upload `database_with_checklist_3.xlsx` to Google Drive and open it
   as a Google Sheets file.
2. Open **Extensions → Apps Script**. Bind a new Apps Script project to
   this spreadsheet.
3. Push the contents of this repository to the script project (using
   `clasp` or the CI workflow). `appsscript.json` is included.
4. Set the Gemini API key (used **only** for unit-conversion fallback,
   never for search):

   Apps Script → **Project Settings → Script properties → Add property**

   ```text
   key   = GEMINI_API_KEY
   value = <your-api-key>
   ```

5. Reload the spreadsheet. A custom menu **Phase 1 Price DB** appears.
6. Run **Setup / Validate Sheets** once. Resolve any reported schema
   issues before continuing.

## Daily operator workflow

From the **Phase 1 Price DB** menu:

1. **Refresh TPSO from API** — pulls latest TPSO data into the raw
   `materialcost_tpso` sheet only. Master is never updated by this step.
2. **Process <source>** — normalizes the currently selected raw source
   into `STAGING_NORMALIZED`. Processing one source clears only that
   source's staging rows.
3. **Validate Staging** — runs validation rules. Master update is blocked
   if validation fails.
4. **Update Master for Selected Source** — replaces only the selected
   source's rows in `MASTER_PRICE_DATABASE` after validation passes.
5. **View Last Refresh Status** — inspects the most recent
   `REFRESH_LOG` entry plus the current admin selection / validation
   state.
6. **Run Phase 1 Checks** — runs milestone smoke tests.

## WebApp (search)

Deploy the script as a Web App (Apps Script → **Deploy → New deployment
→ Web app**).

Settings are pre-declared in `appsscript.json`:

- Execute as: user deploying
- Access: domain

The WebApp is **read-only** against `MASTER_PRICE_DATABASE`. It cannot
write to any raw, staging, or master sheet. It only writes to
`SEARCH_LOG` to record search behavior.

## Safety boundaries

- The WebApp never writes to raw sheets, `STAGING_NORMALIZED`, or
  `MASTER_PRICE_DATABASE`.
- Gemini is **not** the search engine. It is invoked only as a fallback
  when rule-based unit conversion cannot complete.
- TPSO API writes only to `materialcost_tpso`. Master is updated only
  after normalize + validation pass.
- The system never auto-selects search results, auto-approves prices,
  or auto-adds aliases.

## Troubleshooting

- **Menu items missing** — reopen the spreadsheet so `onOpen` re-runs.
- **TPSO refresh fails** — check `REFRESH_LOG` for the error code, then
  re-check `materialcost_tpso` rows 1–2 (year, month, type request
  parameters).
- **Update Master blocked** — re-run **Validate Staging** for the
  currently selected source; master update is gated by validation.

For deeper guidance, read `/docs/05_WORKFLOW.md` and
`/docs/09_TESTING_CHECKLIST.md`.
