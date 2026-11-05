# Local curriculum

Generate Italian and English CVs from the portfolio CMS. This private Node app has no website routes and does not participate in `build:site` or `publish:static`. PDFs and HTML are written exclusively to ignored `apps/curriculum/output/`. The template follows the Figma reference's blue section labels and two-column layout. Education starts on a new printed page after work experience; longer content can use additional pages.

## Setup

From the repository root:

```sh
pnpm install
pnpm --filter curriculum exec playwright install chromium
pnpm docker:up
pnpm cms:dev
```

Restart the CMS after pulling these schema changes. No migration or export command writes to your existing records. Existing English portfolio fields stay in their original format; only newly added fields use Payload localization. If your existing source fields are not English, translate those before using the English export.

## Edit content

- **Profile**: shared name, role, introduction, email, LinkedIn and GitHub.
- **Experiences**: shared company, dates, industries and activities.
- **Education**: shared school, dates and qualification. New optional `details` is English text with one bullet per line.
- Select **Italian** in the CMS locale selector and fill **CV translation** on each shared record. Translate the role/introduction, experience roles/industries/activities, and education titles/details. One activity or industry per line. Names, companies, dates and links stay shared.
- **Curriculum (local export)**: CV-only phone, location, skills, languages, additional information, publications and research. Skills/languages/additional information/publications/research are localized; fill each locale you want to export. Location and phone are shared. Research can optionally reference an existing project; its title and description are deliberately concise CV copy rather than a full portfolio case study.
- English CV translation overrides are optional. Without an override the renderer uses the original English portfolio fields. Italian shared text requires a translation whenever the source field has content; missing translations fail with the record and field to edit.
- New CV-only sections are optional and omitted when empty in the requested locale. They do not fall back to the other language. Check that you have filled both locales if you want the same optional sections in both PDFs.

Translation fields can support a future multilingual portfolio, but the current portfolio still reads its existing source fields. No automatic translation service is called.

## Authenticate

Curriculum contains contact information and is readable only by a logged-in CMS user. Obtain a JWT using the existing Payload login endpoint. This reads your password without putting it into shell history and keeps the returned token in the environment:

```sh
read 'CMS_EMAIL?CMS email: '
read -s 'CMS_PASSWORD?CMS password: '; echo
export CMS_EMAIL CMS_PASSWORD
export CMS_TOKEN="$(node --input-type=module <<'JS'
const response = await fetch(`${process.env.CMS_API_URL || 'http://localhost:3000'}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.CMS_EMAIL, password: process.env.CMS_PASSWORD }),
});
if (!response.ok) throw new Error(`CMS login failed (${response.status})`);
const { token } = await response.json();
if (!token) throw new Error('CMS returned no token');
process.stdout.write(token);
JS
)"
unset CMS_PASSWORD
```

The prompts above use the repository's macOS/zsh environment. `CMS_API_URL` defaults to `http://localhost:3000`. Use HTTPS for a remote CMS. JWT expiry follows your CMS settings; log in again if it expires. Do not commit tokens or contact data into fixtures.

## Preview and export

```sh
pnpm curriculum:preview --locale it
pnpm curriculum:pdf --locale it
pnpm curriculum:pdf --locale en
```

Preview is available at `http://127.0.0.1:4174`; it binds only to loopback and keeps data in memory. Restart it after editing CMS content. Use `--port 4175` to change its port.

PDF export writes `cv-it.pdf` or `cv-en.pdf`, plus the corresponding HTML snapshot, into `apps/curriculum/output/`. Running an export again replaces that locale's files. These are local files; neither export nor preview publishes or uploads them.

The HTML uses semantic text, not screenshots, so text is selectable in the PDF. HTTP(S) links are clickable. CMS strings are escaped, executable URLs are excluded, and no remote fonts or images are loaded. Fonts use the local Arial/sans-serif stack; line wrapping can vary across operating systems. This is a flowing recreation of the reference, not a fixed-position Figma export.

## Verify without the CMS

The fixtures contain fictional content:

```sh
pnpm curriculum:test
pnpm --filter curriculum test:smoke  # requires Chromium; tests preview and long-content printing
pnpm curriculum:preview --locale it --fixture test/fixtures/it.json
pnpm curriculum:pdf --locale it --fixture test/fixtures/it.json
pnpm curriculum:pdf --locale en --fixture test/fixtures/en.json
```

Fixture paths are resolved from the app directory when using these pnpm commands. Never save your real CV into committed fixtures. Local artifacts are ignored but still contain personal data; remove them when no longer needed.
