# Media Grid Implementation Plan

> Execute inline using superpowers:executing-plans; the user approved implementation.

**Goal:** Replace manual layout rows with ordered media cards, individual Full/Half widths, bulk selection, and video frame previews throughout the CMS.
**Architecture:** Add an items array to the existing mediaLayout block. Normalize legacy lexical blocks on read and before validation without a destructive database migration. Reuse Payload array sorting/upload drawers; a custom array wrapper offers bulk selection. Render sequential items into full/half rows, leaving unpaired halves empty. Serve video JPEGs through a cached media endpoint referenced by adminThumbnail.
**Tech Stack:** Payload 3.57, React 19, TypeScript, SCSS, existing fluent-ffmpeg.
**Spec:** Approved conversation: ordered Full/Half cards, unpaired halves remain half empty; existing layouts preserve order and widths; still video frames with play badges in editor, picker and Media.

## Constraints and review focus
- Preserve other ongoing workspace changes; no new dependencies or commits.
- New arrays, empty grids and legacy blocks must be distinguishable, so clearing an item must not resurrect legacy rows.
- Bulk additions must preserve selection order and use actual Payload state.
- Video replacement must invalidate the cached frame; concurrent thumbnail requests must share one extraction.
- Poster endpoints must respect media read access, restrict paths to uploaded filenames, and return clean errors.
- Mobile stacks cards; desktop half items must not fill unpaired slots.

## Tasks
- [x] Write and run failing tests for legacy normalization, item row grouping, orphan half width and cached poster extraction.
- [x] Implement mediaGrid utilities and connect items schema, converter and Project normalization hooks; retain legacy schema hidden for compatibility.
- [x] Implement grid wrapper, bulk selection and item width buttons; replace prior row-editor SCSS with scoped grid card styles.
- [x] Implement cached posters and media endpoint/adminThumbnail with play badges. Warm existing videos via a script; future requests also backfill automatically.
- [x] Regenerate import map/types; run focused tests and TypeScript. Run broader CMS suite and report initialization blockers separately.
- [x] Verify real legacy project conversion, live width controls, batch selection, video previews, mobile and frontend spacing in the browser; save a screenshot.

## Verification and rulings
- 31 CMS integration tests pass across 7 files; CMS TypeScript check passes.
- Browser verified bulk insertion, keyboard sorting, lone half width, 390px stacking, Media library/detail frames, and frontend full/half rows. Temporary project edits were discarded.
- Preserved legacy lone two-column media at full width because the previous frontend explicitly expanded it.
- Video frames use the representative thumbnail filter over the opening frames, with a versioned cache to avoid blank first-frame previews. All 16 existing video caches were warmed successfully.
- Independent review found the legacy lone-width issue; regression test reproduced it and passes after correction. No other important findings.
