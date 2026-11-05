# Local curriculum implementation plan

Goal: generate Italian and English CV PDFs from the portfolio CMS without adding CV files, routes, or links to the published website.

Architecture: a standalone private Node workspace renders semantic HTML and prints A4 PDFs through Playwright. Existing profile, experience, and education records remain authoritative. Additive localized translation groups preserve existing field storage and website queries; English is the source locale for existing fields. A protected Curriculum global holds CV-only contact, skills, publications and research entries. No automatic translations or database writes during generation.

## Commit 1: CMS curriculum and translations
- Add en/it localization for new fields only, translation groups on shared records and an authenticated Curriculum global.
- Regenerate shared types. Verify CMS schema/types without changing website queries.

## Commit 2: Local CV template and CMS reader
- Test first: pagination, strict missing translations, HTML escaping, safe links, blank optional sections and source-language fallback.
- Build a REST reader and Figma-inspired two-column A4 template. Translation groups override source text; Italian export must fail if required translations are missing.
- Preview binds to loopback only; no content is written into apps/web.

## Commit 3: PDF export and local PR documentation
- Add explicit PDF and preview commands and ignored local output. No PDF task is connected to site build/publish.
- Verify sample Italian/English export, selectable text, page layout and long content; run relevant tests and repository suite.
- Document authenticated CMS access, translation workflow, commands, limitations and local PR description.

Review focus: incomplete translations; multi-page CMS responses; unsafe CMS HTML/URLs; long translated entries crossing pages; accidental inclusion in website outputs.

Implementation decisions: Node HTML rather than another SvelteKit scaffold avoids a separate build/server toolchain for this local print utility. New localized groups avoid migrating populated existing fields. Existing original-language fields remain English, as in the portfolio; CV-only localized text is authored separately. PDF pagination is flowing, not a fixed two-page limit.
