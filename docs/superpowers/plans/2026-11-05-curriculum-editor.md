# Curriculum editor implementation plan

**Goal:** Replace duplicate CV fields with shared localized CMS content, and provide a local web app for job-specific CV editing, named browser-only saves and PDF download.

**Approved behavior:** User confirmed Profile holds CV contact/skills/languages/additional information; Publications and Research are independent collections. Existing Profile/Experience/Education fields are localized directly; duplicate CV translation fields and Curriculum global disappear. CMS and app selectors use 🇬🇧 EN / 🇮🇹 IT; add space before CMS avatar. Edits never update CMS. Save requires a name and stores a timestamp and snapshot in this browser. Warn before unload, locale change, reload from CMS or loading another saved version when unsaved. No automatic draft persistence. App stays separate from public website.

**Architecture:** Keep the curriculum workspace's Node/Playwright toolchain, add a loopback web server and browser modules. GET /api/cv?locale=en|it fetches canonical Profile/Experiences/Education/Publications/Research using REST; client normalizes these to an editable JSON document. POST /api/pdf renders the supplied working copy and returns a downloadable PDF; no content is persisted on the server. Client localStorage stores validated version snapshots, name, timestamp and locale. Static editor includes all sections and entry add/remove/reorder, live iframe preview, named save/load/delete and unsaved-change handling. Browser chooses locale before import; missing localized content must be visible/editable rather than silently replaced. Server uses fixed configured CMS host and read-only requests, with optional CMS_TOKEN kept on server. Profile's CV-only fields and new collections preserve authenticated-read access; browser app offers in-memory login through fixed CMS proxy to avoid requiring shell tokens.

## Commit 1: shared CMS content
- Localize existing text/richText fields (including experience industries/activities items) directly; remove cvTranslation groups and Curriculum global.
- Move CV-only fields into Profile with field-level authenticated reads; add Publications/Research collections with localized title/description.
- Safe idempotent migration preserves original English fields, prior per-locale overrides and Curriculum content. Back up raw documents before writes; support dry-run.
- Set locale labels and selector spacing. Generate shared types. Test schema, raw migration transformation and real locale/access behavior.

## Commit 2: browser editor and local history
- Normalize CMS and fixture inputs to {locale, profile:{name,surname,jobPosition,presentation,email,phone,location,skills,languages,additionalInfo,github,linkedin}, experiences:[{company,role,startDate,endDate,industries,activities}], education:[{title,school,startDate,endDate,details}], publications:[{title,description,url}], research:[{title,date,description,url,project}]}. Lists/intro are plain multiline text, links are {label,url}.
- Renderer consumes normalized document directly and optional section order. Browser module renders forms for every part and handles entry/order/visibility edits.
- History named snapshots in localStorage with timestamps; failed writes leave state dirty. Saved snapshots restore exact edits and locale; source CMS never receives writes.
- Tests cover normalization, version roundtrip, malformed storage, quota errors, dirty comparison and safe rendering.

## Commit 3: local web server, PDF endpoint and verification
- Loopback server serves app modules, fixed read-only CMS importer, optional login, preview renderer and edited-document PDF download.
- Reject cross-origin writes, request body overflow and unsafe routes; do not forward arbitrary client-supplied HTML or URLs to browser printing. Fonts and output text are local and escaped.
- Browser tests exercise import, all-field editing, add/remove/reorder, unsaved alerts, named save/reload, locale switching, exact PDF output and no CMS writes. Update CLI/fixtures/docs/local PR draft.

**Review focus:** preserve populated CMS values during localization; confidential Profile fields; browser storage failures; dirty state during asynchronous import/download; locale switch losing edits; printed content matching working copy; no website publication changes.

**Execution:** Two independent work areas, with shared API document shape above. CMS work owns apps/cms and packages/types; editor work owns apps/curriculum and docs/root scripts. Review whole branch and run appropriate tests before committing. Keep all commits local on codex/local-curriculum.
