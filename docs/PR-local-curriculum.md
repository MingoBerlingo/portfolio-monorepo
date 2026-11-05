# Draft PR: Local curriculum editor with shared multilingual CMS content

## Problem and result

CV content was maintained separately from the portfolio. This branch adds a separate local curriculum web app that imports the same CMS profile, experience and education, allows job-specific edits to a working copy, saves named browser-only versions with dates, and downloads the edited copy as PDF.

The CMS uses its existing fields for Italian/English translations. CV-only contact/skills/language fields live inside Profile; Publications and Research are independent collections. Duplicate translation groups and the Curriculum global are removed.

## Behavior

- **🇬🇧 EN / 🇮🇹 IT** in both language selectors, with space between the CMS selector and avatar.
- Import canonical CMS fields without silently substituting a different language.
- Edit all printable fields; add/remove/reorder entries; reorder or hide sections; view a live preview.
- Save requires a name. History stores the complete document, language, section visibility/order and timestamp in this browser; load/delete from History.
- No autosave. Unsaved changes trigger guards for reload/close, locale switch, CMS reload and history load. Failed storage writes retain edits and do not claim success.
- Delayed imports lock document-changing controls. Canceling sign-in invalidates its response so it cannot replace newer work.
- PDF download prints exactly the current copy, including unsaved changes, without marking it saved or retaining it on the server.
- CMS requests reuse the existing local CMS session or a memory-only login. CV edits/history never write to the CMS.
- App binds to loopback and rejects cross-origin requests. Only fixed CMS read/login routes are proxied. Print content is escaped, validated and printed without network access.

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
   - Loopback app server, session-aware CMS import/login, direct PDF download, browser E2E, CLI compatibility and documentation.

## Run

```sh
pnpm dev
# or, with the CMS already running:
pnpm curriculum:dev
```

Open `http://localhost:4174`. Use that same origin for future access to saved versions. Existing CMS login on localhost is reused; otherwise use Connect CMS. See `apps/curriculum/README.md` for setup, optional CLI export and fictional demos.

## Data preservation

The localization storage migration has been applied locally after a private BSON-preserving backup to ignored `.local/cv-before-canonical-2026-11-05.json`. Original English content remains canonical; existing locale overrides fill missing canonical translations. Legacy raw fields remain for recovery but are no longer exposed by the removed schemas. A repeat dry run reports **zero updates**, verifying idempotence. The backup is not committed.

On another checkout/database, stop the CMS and use `apps/cms/scripts/migrate-canonical-cv.ts` before editing with the new schema. Its default is a read-only dry run; `--apply` requires a new backup path. Review migrated translation rows because old textarea lines are matched by row order.

## Validation

- Full `pnpm test`: passes (28 curriculum tests, 34 CMS integration tests, 1 CMS browser test, 37 portfolio tests).
- `pnpm --filter cms test:curriculum`: 5 schema/migration-transform tests pass.
- CMS TypeScript check and portfolio Svelte check: pass (0 errors/warnings).
- Editor browser E2E passes: canonical import, all-field edits, entry add/remove/reorder, section visibility/order, named/date saves, reload and history restoration, before-unload and locale-change guards, storage quota errors, delayed CMS import, canceled sign-in, language selection, responsive layout and actual PDF download.
- Parsed downloaded PDF: all expected local edits present, hidden section omitted, text selectable; rendered pages visually inspected.
- Actual local CMS session imports the existing profile in the app; current English fields preserved and duplicate groups absent in CMS.
- Existing CMS browser dependency was installed locally so the previously blocked test now passes.

## Scope and practical limits

No CV route, PDF, link or editor is added to the published portfolio. Website build/publish scripts remain unchanged. No push, remote PR, merge or publication was performed.

History is browser/device/origin-specific, subject to available storage, and disappears if site data is cleared. It is not synced or automatically saved. Browsers control close-warning wording and can suppress lifecycle warnings in some environments. PDF pagination flows; long CVs may exceed two pages. Existing missing translations must be authored in the CMS or filled in the local working copy.
