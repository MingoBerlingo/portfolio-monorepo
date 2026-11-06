# Figma CV content and section ordering implementation plan

**Goal:** Populate the existing localized CMS fields from Figma and apply the annotated CV layout changes, retaining named local versions.

**Architecture:** CMS remains the source; local edits and section order stay in browser history. Shared renderer produces editing and PDF views. Legacy documents remain readable.

**Source:** Figma ge4yHfb13YNRMpSQzqf2OJ, section 1577:2, pages 1517:735 and 1522:763; user annotations in this chat.

- [x] Back up raw CMS records before importing. Preserve English text, row identifiers, dates and separate experience records. Add Italian content, missing contact/skills, publication and research records. Re-run and check idempotence.
- [x] Add a private optional portfolio link to Profile; remove Additional information from CMS UI, canvas and navigation without losing old saved versions. Generate shared CMS types and check schema tests.
- [x] Render labeled contacts, inline sectors and bold competency labels in both editor and PDF. Test old history compatibility and safe output.
- [x] Replace section order arrows with drag handles; support touch and keyboard, preserve text editing and dirty guards. Verify browser history round trip.
- [x] Run unit, schema and browser checks; inspect actual PDF and Italian CMS output. Commit locally in reviewable groups and update local PR draft. No push or publishing.
