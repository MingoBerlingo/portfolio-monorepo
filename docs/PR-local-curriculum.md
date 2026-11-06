# Draft PR: Local SvelteKit CV studio with shared multilingual CMS content

CV content was maintained separately from the portfolio. This branch adds a separate local app that reads the same CMS, lets the user tailor a CV directly on its layout, saves named versions in the browser and downloads the current working copy as PDF.

## Implementation

- Svelte 5 components, strict TypeScript, SvelteKit server routes and Tailwind CSS. The standalone imperative JavaScript editor/server are removed.
- dnd-kit Svelte sortable primitives provide handle-only section and entry dragging, live sorting transitions, pointer/touch/keyboard support and cancellation. Profile stays pinned; entries stay within their own sections. Hovering or selecting a block reveals drag/delete controls. Deleted sections can be restored; entry deletion requires confirmation. These changes affect the working copy only.
- Canonical localized CMS fields supply 🇬🇧 EN / 🇮🇹 IT without cross-language fallback. CV-only information lives in Profile; Publications and Research are dedicated collections. Duplicate translation groups and the Curriculum global are removed.
- Italian Figma content is populated locally: profile, six separate experience records, two education records, one publication and two research projects. Original English work/education text, dates and row identifiers are preserved. Location comes from the existing Hero introduction; portfolio URL comes from the configured Pages repository.
- Save requires a name and records the entire document, language, order, visibility and date. Existing browser versions remain compatible. No autosave: close/reload, language/CMS refresh and history loading guard unsaved changes; storage failure keeps edits and does not mark them saved.
- PDF downloads include current unsaved edits. The print renderer embeds DM Sans, escapes text, validates bounded documents and makes no network requests. UI controls are excluded; longer content paginates naturally. Web downloads are not retained on the server.

## Local-only boundaries

The Node adapter launcher binds to loopback. Static assets and server routes reject external Host/cross-origin requests; development has equivalent request checks and denies private environment/CMS/backup paths. PDF requests have a streamed 1 MB limit and a single-print guard. Unexpected errors are sanitized. The local reader performs fixed read-only Payload operations using `apps/cms/.env`; credentials never enter client code and no browser CMS login is needed. The curriculum app is separate from portfolio publication.

Raw BSON-preserving backups and import source data remain in ignored `.local/`. The canonical migration retains legacy storage for recovery; its education/research collection names match Mongo storage. On another database, review the migration's dry run before applying it with a new backup path.

## Run and verify

```sh
pnpm curriculum:dev
# http://127.0.0.1:4174/

pnpm --filter curriculum check
pnpm curriculum:test
pnpm --filter curriculum build
pnpm --filter curriculum test:e2e
# Production-style local run after building:
pnpm curriculum:preview
```

Use the same origin consistently: `localhost:4174` and `127.0.0.1:4174` have separate browser histories. MongoDB and the CMS environment configuration must be available; the CMS HTTP server itself need not run. `CURRICULUM_FIXTURES=1` opts into fictional demo data. CLI export remains available through `pnpm curriculum:pdf --locale it|en`.

Validation covers strict Svelte/TypeScript checks with no warnings, the production build, 47 curriculum unit tests, native CMS schema checks, and the real adapter-node browser flow. Browser tests exercise pointer/touch/keyboard reordering and cancellation, deletion/restoration, section navigation, text/bullet/IME/paste editing, dates/links, legacy/named history, unsaved guards, storage failure, loading locks, responsive layout and PDF download. Real HTTP assertions cover static-asset origin/Host guards, invalid locale and oversized requests. Actual downloaded and real CMS PDFs were checked for selectable current text, omitted hidden content and DM Sans; the Italian export remains two A4 pages.

The dependency lock reuses existing workspace versions for shared tools. Work remains local: no remote PR, push, merge or publication.
