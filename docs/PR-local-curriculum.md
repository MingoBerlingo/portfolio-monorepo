# Draft PR: Generate multilingual CV PDFs in a separate local app

## Problem and result

The CV was maintained separately in Figma, allowing its content to drift from the portfolio CMS. This adds a private `apps/curriculum` workspace that reads the same profile, work experience and education records and exports Italian or English CV PDFs on demand.

CV preview and export are independent of the portfolio app. No CV route, download link, PDF, or HTML snapshot is added to the published website. Exports stay in ignored `apps/curriculum/output/`; nothing is pushed or published by this change.

## Commit sequence

1. `feat(cms): add private curriculum content and additive translations`
   - Add Italian/English localization only to new CV translation groups and CV-only fields.
   - Keep existing portfolio fields and their storage unchanged, avoiding a data migration.
   - Add an authenticated Curriculum global for contact details, skills, languages, publications and research.
   - Regenerate shared types.
2. `feat(curriculum): render bilingual CVs from shared CMS records`
   - Read CMS collections with pagination, explicit locale and no translation fallback.
   - Recreate the Figma visual structure as semantic, escaped HTML with safe links.
   - Add fictional fixtures and renderer/reader tests.
3. `feat(curriculum): add local preview and PDF export workflow`
   - Add loopback-only preview and Chromium PDF commands.
   - Improve print pagination, preserve CMS rich-text line boundaries, and add real CMS access/translation tests.
   - Document login, translations, output locations, independent operation and the local PR draft.

## Usage

Follow `apps/curriculum/README.md` for setup and CMS authentication. Then:

```sh
pnpm curriculum:preview --locale it
pnpm curriculum:pdf --locale it
pnpm curriculum:pdf --locale en
```

The fixtures can be used before entering translations or authenticating:

```sh
pnpm curriculum:pdf --locale it --fixture test/fixtures/it.json
pnpm curriculum:pdf --locale en --fixture test/fixtures/en.json
```

## Validation

- `pnpm curriculum:test`: 2 CMS schema tests and 12 reader/renderer tests pass.
- `pnpm --filter cms test:int`: 34 integration tests pass, including translation storage preserving original text and anonymous access denial.
- `pnpm --filter cms exec tsc --noEmit`: passes.
- Existing portfolio suite: 37 tests pass, including browser tests.
- Local preview smoke check: Italian content, response headers and unknown-route handling pass; long-content PDF generation succeeds.
- Italian and English fictional fixtures: both print to two A4 pages, with education starting on page two. Rendered pages were visually inspected; selectable text and clickable links verified.
- A stress PDF preserves all 100 experience bullets across four pages.
- `pnpm test` was attempted. The existing CMS browser test `Frontend > can go on homepage` cannot launch because its Playwright 1.54.1 Chromium executable (revision 1181) is not installed. The curriculum app uses Playwright 1.55.1, matching the portfolio's installed browser. This browser failure is not a passing full-suite result.

## Draft limitations and editorial work

- These are working sample exports, not a populated translation of the user's real CV. Enter and review Italian translations and CV-only content in the CMS before generating the real CV. No real content was imported from Figma or rewritten.
- Original shared fields are treated as English. Italian uses new translation groups; English can optionally override source copy. Optional CV-only sections are independently authored per locale and omitted if blank; they never silently fall back to another language.
- Layout follows the Figma reference with blue labels and aligned content. Fonts use Arial/sans-serif from the local machine. Content flows across pages; an expanded CV can exceed two pages.
- Research entries can reference a portfolio project but use explicit concise CV text, not the full case-study content.
- Existing portfolio queries still read the original fields. Translating the entire public website is outside this PR.

## Local state

Branch: `codex/local-curriculum`. Three local commits; no remote PR, push, merge or website publication.
