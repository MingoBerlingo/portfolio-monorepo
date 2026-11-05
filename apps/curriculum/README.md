# Curriculum Studio

A separate local web app for adapting your CMS profile into job-specific Italian or English CVs. Edit a working copy, save named versions in this browser, and download the current version as a selectable-text PDF. The app never writes your edits back to the CMS or adds CV files to the published portfolio.

## Start

From the repository root:

```sh
pnpm install
pnpm --filter curriculum exec playwright install chromium
pnpm docker:up
pnpm dev
```

`pnpm dev` starts the portfolio, CMS and curriculum app. Alternatively run the CMS and curriculum in separate terminals:

```sh
pnpm cms:dev
pnpm curriculum:dev
```

Open **http://localhost:4174**. Use the same URL consistently: browser history is scoped to the origin, so `localhost:4174` and `127.0.0.1:4174` have separate saved versions. The app binds only to loopback.

The local app reads the CMS database through this checkout's Payload configuration.
No browser login, cookie, CMS token or Connect button is needed. It uses
`apps/cms/.env`, so MongoDB must be running and the CMS dependencies installed;
the CMS web server itself does not have to be running to import a CV.

The bridge reads only Profile, Experiences, Education, Publications and Research
in the selected locale. It does not write CV data. Private field and collection
permissions on the CMS HTTP API remain unchanged. Database configuration never
reaches the browser.

If you explicitly point `CMS_API_URL` at a remote CMS, configure `CMS_TOKEN` on
the local app server. There is no interactive connection form in the editor.

## CMS content

- **Profile:** existing name, surname, professional title, rich-text presentation, email and links. Phone, location, skills, languages and additional information are also here; those CV-only fields require authenticated reads.
- **Experiences / Education:** existing records with directly localized text fields. Company/school names, dates and links remain shared. Industry and activity text is localized inside the existing array rows.
- **Publications / Research:** independent collections, with localized titles/descriptions and shared links. Research can reference an existing portfolio project. That CMS relationship is metadata; the CV prints the authored research title/description/link.
- Select **🇬🇧 EN / 🇮🇹 IT** in the CMS to author each language. There are no duplicate “CV translation” fields or Curriculum global.

The app requests the selected locale with fallback disabled. Missing translations remain blank for you to fill locally or in the CMS; they are never silently replaced by the other language. Portfolio queries continue reading English by default.

### Updating from the previous CV schema

The existing plain English storage must be converted before using the new localized fields. See **Canonical CV migration** in `apps/cms/README.md`. The migration backs up affected raw documents before any write and retains legacy raw fields for recovery. It moves old CV-only content into Profile and old publication/research arrays into collections. Original canonical English values take precedence; existing Italian overrides are carried over where canonical translations are missing. Review arrays after migration because old textarea translations are aligned by row order.

In this checkout the conversion has been applied, and a second dry run reports zero updates. The private backup is in ignored `.local/cv-before-canonical-2026-11-05.json`.

## Working on a version

1. Choose **🇬🇧 EN / 🇮🇹 IT** and load from CMS.
2. Edit Profile, Introduction, Skills & languages, Experience, Education, Publications, Research or Additional info. Add, remove or reorder list entries. Use section controls to reorder sections or omit them from the PDF.
3. The preview updates from your working copy. The CMS is unchanged.
4. Click **Save version**, provide a name and save. History records the complete copy, language, section order and save date. Load or delete saved versions from **History**.
5. Click **Download PDF** to download exactly the current edited copy. Downloading does not save an editable history version or clear the unsaved state.

There is no autosave. Closing/reloading the page, switching language, reloading the CMS or loading another version warns when there are unsaved changes. Browsers control the exact wording of close-page warnings and may suppress them on some mobile/browser lifecycle paths. Storage failures are reported, leave your edits intact and do not mark them saved.

Saved versions stay in this browser on this device until deleted or browser site data is cleared. Up to 50 versions are supported, subject to the browser's available storage. Clearing site data removes the history; the CMS is not a backup of your tailored versions.

## PDF output

The renderer uses the Figma CV's blue section labels and two-column layout. Education starts on a new page when it follows work experience. Longer content can use additional pages. Text is selectable, HTTP(S) links are clickable and the printer loads no external assets. Arial/sans-serif fonts use the local system. Preview shows the content at A4 width; the PDF adds automatic print pagination.

Web downloads are streamed directly to the browser: the server does not keep the edited documents or PDFs. For optional command-line export:

```sh
pnpm curriculum:pdf --locale it
pnpm curriculum:pdf --locale en
```

These CLI commands use the same local reader and write ignored files to `apps/curriculum/output/`. They do not access browser history. No CV command participates in `build:site` or `publish:static`.

## Verification and fictional samples

```sh
pnpm curriculum:test
pnpm --filter curriculum test:e2e
pnpm --filter cms test:int
```

The editor browser test uses a temporary local server and fictional fixtures. It verifies editing, entry and section controls, exact named snapshots, reopening history, date metadata, unsaved-change guards, storage-quota failures, delayed imports, language switching, responsive layout and PDF download. Browser test screenshots and a sample edited PDF are written only into ignored `apps/curriculum/output/`.

For a local fictional demo with no database:

```sh
CURRICULUM_FIXTURES=1 pnpm curriculum:dev
```

Stop the ordinary curriculum server first if port 4174 is occupied. The fixture mode is opt-in and is not used by normal `pnpm dev`.
