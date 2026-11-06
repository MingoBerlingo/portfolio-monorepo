# Draft PR: Local curriculum editor with shared multilingual CMS content

## Problem and result

CV content was maintained separately from the portfolio. This branch adds a separate local curriculum web app that imports the same CMS profile, experience and education, allows job-specific edits to a working copy, saves named browser-only versions with dates, and downloads the edited copy as PDF.

The CMS uses its existing fields for Italian/English translations. CV-only contact/skills/language fields live inside Profile; Publications and Research are independent collections. Duplicate translation groups and the Curriculum global are removed.

## Behavior

- **🇬🇧 EN / 🇮🇹 IT** in both language selectors, with space between the CMS selector and avatar.
- Import canonical CMS fields without silently substituting a different language.
- Edit printable text directly on the CV layout; use contextual date/link controls; add/remove/reorder entries and reorder or hide sections. No separate input form or preview pane.
- Save requires a name. History stores the complete document, language, section visibility/order and timestamp in this browser; load/delete from History.
- No autosave. Unsaved changes trigger guards for reload/close, locale switch, CMS reload and history load. Failed storage writes retain edits and do not claim success.
- Delayed imports lock document-changing controls. Imports lock section controls until the new document is ready.
- PDF download prints exactly the current copy, including unsaved changes, without marking it saved or retaining it on the server.
- The local server uses a read-only Payload bridge with the checkout's CMS configuration. No browser login or Connect button; Chrome and other browsers work independently of CMS cookies. CV edits/history never write to the CMS.
- App binds to loopback and rejects cross-origin requests. The local data bridge has a fixed set of read operations and only accepts en/it. Print content is escaped, validated and printed without network access.

## Local commit sequence

The first three commits establish the original local PDF feature:

1. `8af47b3` — CMS CV content and additive translations.
2. `33eccac` — bilingual renderer, CMS reader and fixtures.
3. `128eb79` — preview/PDF workflow and initial documentation.

Three follow-up commits implement the approved editor and revised CMS design:

4. `e15dcf6` — `refactor(cms): share localized profile fields and split CV collections`
   - Replace duplicate groups with native localization, move CV fields to Profile, create collections, migrate/back up existing storage and update shared types.
5. `1582602` — `feat(curriculum): add editable working copies and named browser history`
   - Canonical document model, browser editor/live preview, local snapshots, unsaved guards and safe edited-document renderer.
6. `feat(curriculum): serve local editor and download tailored PDFs`
   - Loopback app server, CMS import, direct PDF download, browser E2E, CLI compatibility and documentation.

Additional local follow-ups:

7. `5b822fc` — load local CMS content without a browser login.
8. `4c6ed8e` — inline renderer/model support and bundled DM Sans with static PDF embedding.
9. `feat(curriculum): edit directly on the CV canvas` — minimal direct-edit interface, contextual controls, responsive zoom, browser verification and updated documentation.

## Run

```sh
pnpm dev
# or, with the CMS already running:
pnpm curriculum:dev
```

Open `http://localhost:4174`. Use that same origin for future access to saved versions. No CMS browser login is needed. MongoDB and the CMS environment configuration must be available locally. See `apps/curriculum/README.md` for setup, optional CLI export and fictional demos.

## Data preservation

The localization storage migration has been applied locally after a private BSON-preserving backup to ignored `.local/cv-before-canonical-2026-11-05.json`. Original English content remains canonical; existing locale overrides fill missing canonical translations. Legacy raw fields remain for recovery but are no longer exposed by the removed schemas. A repeat dry run reports **zero updates**, verifying idempotence. The backup is not committed.

On another checkout/database, stop the CMS and use `apps/cms/scripts/migrate-canonical-cv.ts` before editing with the new schema. Its default is a read-only dry run; `--apply` requires a new backup path. Review migrated translation rows because old textarea lines are matched by row order.

## Validation

- Full `pnpm test`: passes (44 curriculum tests, 34 CMS integration tests, 1 CMS browser test, 37 portfolio tests).
- `pnpm --filter cms test:curriculum`: 5 schema/migration-transform tests pass.
- CMS TypeScript check and portfolio Svelte check: pass (0 errors/warnings).
- Editor browser E2E passes: canonical import, all-field edits, entry add/remove/reorder, section visibility/order, named/date saves, reload and history restoration, before-unload and locale-change guards, storage quota errors, delayed CMS import, language selection, responsive layout and actual PDF download.
- Parsed downloaded PDF: all expected local edits present, hidden section omitted, text selectable; rendered pages visually inspected.
- Actual local CMS data imports in a fresh browser without a login; current English fields preserved and duplicate groups absent in CMS.
- Existing CMS browser dependency was installed locally so the previously blocked test now passes.

## Scope and practical limits

No CV route, PDF, link or editor is added to the published portfolio. Website build/publish scripts remain unchanged. No push, remote PR, merge or publication was performed.

History is browser/device/origin-specific, subject to available storage, and disappears if site data is cleared. It is not synced or automatically saved. Browsers control close-warning wording and can suppress lifecycle warnings in some environments. PDF pagination flows; long CVs may exceed two pages. Existing missing translations must be authored in the CMS or filled in the local working copy.

## Cross-browser connection fix

The original session-based importer worked only when that browser was already
signed into the CMS. It has been replaced with a one-shot, read-only Payload
bridge. The local server loads the CMS configuration and reads the five allowed
sources directly; neither browser credentials nor a browser login endpoint are
used. The worker flushes its result, closes MongoDB and exits. Public CMS access
rules are unchanged. A fresh Google Chrome session with zero cookies successfully
loads the real profile; anonymous access to the protected CMS collections remains
denied. Named browser history is unchanged.

## Inline layout and UI refinement

The form/preview interface is replaced with one editable A4 paper. Text and bullets edit in place; dates and links use compact contextual controls. Wide screens keep section controls beside the canvas; smaller screens use a section selector. Fit/100%/125% zoom is available. The header has padded locale controls, and the introductory marketing copy, footer, sidebar note and persistent success banners are removed.

The same renderer produces editable paper and print markup. Editing attributes, placeholders and controls never appear in PDFs. A same-page ShadowRoot scopes the CV stylesheet; event handlers bind once and update the same plain document model. Named history remains compatible. Browser tests cover rapid editing with delayed font loading, paste safety, bullet splitting/merging, entry operations and all existing save/unsaved guards.

DM Sans is bundled with its SIL Open Font License. The app uses a variable WOFF2; PDF output embeds official static faces for weights 400–700, uses Unicode mappings and disables ligatures for clean text extraction. Actual downloaded PDF verification confirms the expected edited text, date/link values, hidden-content omission, and embedded Type0/FontFile2 DM Sans fonts. No runtime request to Google Fonts is needed.

Verification note: an initial parallel run hit the existing `ThemeSwitch.svelte.spec.ts > expands the new theme in a circle centered on the switch` timing assertion. The isolated portfolio rerun and the subsequent clean full-suite run passed; no portfolio source or tests were changed.
