# Resume Studio

Built with Svelte 5, SvelteKit, strict TypeScript and Tailwind CSS. The editor uses dnd-kit’s Svelte sortable primitives; CMS/PDF operations run in server-only routes.

A separate local web app for adapting your CMS profile into job-specific Italian or English Resumes. Edit directly on the resume layout, save named versions in this browser, and download the current version as a selectable-text PDF. The app never writes your edits back to the CMS or adds Resume files to the published portfolio.

## Start

From the repository root:

```sh
pnpm install
pnpm --filter resume exec playwright install chromium
pnpm docker:up
pnpm dev
```

`pnpm dev` starts the portfolio, CMS and resume app. Alternatively run the CMS and resume in separate terminals:

```sh
pnpm cms:dev
pnpm resume:dev
```

Open **http://localhost:4174**. Use the same URL consistently: browser history is scoped to the origin, so `localhost:4174` and `127.0.0.1:4174` have separate saved versions. The app binds only to loopback.

The local app reads the CMS database through this checkout's Payload configuration.
No browser login, cookie, CMS token or Connect button is needed. It uses
`apps/cms/.env`, so MongoDB must be running and the CMS dependencies installed;
the CMS web server itself does not have to be running to import a resume.

The bridge reads only Profile, Experiences, Education, Publications and Research
in the selected locale. It does not write Resume data. Private field and collection
permissions on the CMS HTTP API remain unchanged. Database configuration never
reaches the browser.

If you explicitly point `CMS_API_URL` at a remote CMS, configure `CMS_TOKEN` on
the local app server. There is no interactive connection form in the editor.

## CMS content

- **Profile:** existing name, surname, professional title, rich-text presentation, email and links. Phone, location, skills, languages and portfolio link are also here; those Resume-only fields require authenticated reads.
- **Experiences / Education:** existing records with directly localized text fields. Company/school names, dates and links remain shared. Industry and activity text is localized inside the existing array rows.
- **Publications / Research:** independent collections, with localized titles/descriptions and shared links. Research can reference an existing portfolio project. That CMS relationship is metadata; the resume prints the authored research title/description/link.
- Select **🇬🇧 EN / 🇮🇹 IT** in the CMS to author each language. There are no duplicate “Resume translation” fields or Resume global.

The app requests the selected locale with fallback disabled. Missing translations remain blank for you to fill locally or in the CMS; they are never silently replaced by the other language. Portfolio queries continue reading English by default.

### Updating from the previous Resume schema

The existing plain English storage must be converted before using the new localized fields. See **Canonical Resume migration** in `apps/cms/README.md`. The migration backs up affected raw documents before any write and retains legacy raw fields for recovery. It moves old Resume-only content into Profile and old publication/research arrays into collections. Original canonical English values take precedence; existing Italian overrides are carried over where canonical translations are missing. Review arrays after migration because old textarea translations are aligned by row order.

In this checkout the conversion has been applied, and a second dry run reports zero updates. The private backup is in ignored `.local/cv-before-canonical-2026-11-05.json`.

## Working on a version

1. Choose **🇬🇧 EN / 🇮🇹 IT** and load from CMS.
2. Click text directly on the paper to edit it. Empty fields have faint editor-only placeholders. Paragraphs accept multiline text; each bullet can be edited separately. Enter splits a bullet and Backspace at its start merges it with the previous one.
3. Hover over dates or links for their compact editing controls. Hover or select a section, entry or contact row to reveal its controls on the left. Drag or use the up/down arrows to reorder. Main sections use an eye button to hide/show: hidden sections remain dimmed in the editor and are omitted from PDF. Entries and contacts use bin buttons; removed contact rows can be restored from the sidebar. Link details use a pen icon. Keyboard users can press Space on a drag handle, use arrow keys, then Space to drop or Escape to cancel. Use **Add entry** for new entries. On narrow screens, choose a section from the compact selector.
4. Use **Fit**, **100%** or **125%** to adjust the paper zoom. All text edits update the working copy immediately; there is no separate form and preview.
5. Click **Save version**, provide a name and save. History records the complete copy, language, section order and save date. Existing saved versions remain compatible. Load or delete saved versions from **History**.
6. Click **Download PDF** to download exactly the current edited copy. Downloading does not save an editable history version or clear the unsaved state.

There is no autosave. Closing/reloading the page, switching language, reloading the CMS or loading another version warns when there are unsaved changes. Browsers control the exact wording of close-page warnings and may suppress them on some mobile/browser lifecycle paths. Storage failures are reported, leave your edits intact and do not mark them saved.

Saved versions stay in this browser on this device until deleted or browser site data is cleared. Up to 50 versions are supported, subject to the browser's available storage. Clearing site data removes the history; the CMS is not a backup of your tailored versions.

## PDF output

The renderer uses the Figma resume's blue section labels and two-column layout. DM Sans is bundled locally for the app and editable paper; static DM Sans faces are embedded in each PDF, so no installed font or external font service is required. The bundled SIL Open Font License is in `static/fonts/OFL.txt`. Content paginates naturally; longer Resumes use additional pages. Text is selectable, HTTP(S) links are clickable and the printer loads no external assets. The editable paper uses A4 width; the PDF adds automatic print pagination. Editing outlines, placeholders and controls are excluded from PDF output. Paragraph line breaks are retained.

Web downloads are streamed directly to the browser: the server does not keep the edited documents or PDFs. For optional command-line export:

```sh
pnpm resume:pdf --locale it
pnpm resume:pdf --locale en
```

These CLI commands use the same local reader and write ignored files to `apps/resume/output/`. They do not access browser history. No Resume command participates in `build:site` or `publish:static`.

## Verification and fictional samples

```sh
pnpm --filter resume check
pnpm resume:test
pnpm --filter resume build
pnpm --filter resume test:e2e
pnpm --filter cms test:int
```

The editor browser test uses a temporary local server and fictional fixtures. It verifies inline text/multiline/bullet editing, paste safety, contextual dates/links, entry and section controls, exact named snapshots, reopening history, date metadata, unsaved-change guards, storage-quota failures, delayed imports, language switching, delayed font loading, responsive layout, embedded fonts and PDF download. Browser test screenshots and a sample edited PDF are written only into ignored `apps/resume/output/`.

For a local fictional demo with no database:

```sh
RESUME_FIXTURES=1 pnpm resume:dev
```

Stop the ordinary resume server first if port 4174 is occupied. The fixture mode is opt-in and is not used by normal `pnpm dev`.

For a production-style local run, build first (`pnpm --filter resume build`), then use `pnpm resume:preview`. The launcher binds to loopback and protects static assets as well as API routes. The separate app is never included in portfolio publication.

## Keyboard shortcuts

Use Ctrl instead of ⌘ on Windows/Linux. The `?` button opens this list in the app.

| Shortcut | Action |
| --- | --- |
| ⌘ Z | Undo |
| ⌘ Shift Z (also Ctrl Y) | Redo |
| ⌘ S | Open named Save version; submit if already in that dialog |
| ⌘ Shift S | Save as a new version with a blank name |
| ⌘ Shift E | Download the current PDF |
| Alt ↑ / ↓ | Move the selected block |
| H | Hide/show the selected main section |
| Delete / Backspace | Delete the selected entry or contact; main sections are protected |
| Space → arrows → Space | Pick up, move and drop a focused drag handle |
| Escape | Cancel dragging, close a dialog or clear selection |
| ? | Show keyboard shortcuts |

Single-key and block-movement shortcuts are disabled while typing. Undo/redo covers the current loaded document and resets on a CMS or saved-version load. Consecutive typing in one field is grouped for 750ms; an entire drag is one action, and cancellation creates no undo step. History is bounded to 100 steps and approximately 16 MiB of serialized snapshots. Named browser versions are independent. Visible undo/redo buttons mirror the shortcuts. Modal text editing retains its native undo behavior.

## Tailor Resume

Open **Tailor Resume** and choose a CMS locale or paste a plain-text Resume. Add the job description and any notes, answer or skip any follow-up questions, then review the estimated match and edit the draft. Use **Save version** to keep a named copy in this browser or **Download PDF** to export the ATS layout.

Set `OPENAI_API_KEY` in the environment that starts Resume Studio. For Vite development it can also go in the ignored `apps/resume/.env.local` file. Restart Resume Studio after changing it. The optional `OPENAI_MODEL` setting defaults to `gpt-4.1-mini` and must support Structured Outputs.

Tailoring sends the job description, notes, clarification answers, and relevant Resume content to OpenAI. CMS contact fields stay local. When you paste a resume, the app sends the text you provide, including any contact details it contains.
