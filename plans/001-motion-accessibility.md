# 001 — Motion accessibility and lifecycle

- **Status**: TODO
- **Commit**: 97705f7
- **Severity**: HIGH
- **Category**: Motion craft, accessibility and cohesion
- **Estimated scope**: AsciiMorph.svelte; new mediaPlayback action; +layout.svelte

## Problem

AsciiMorph starts a 3000ms interval without checking reduced motion or visibility. Cover and CMS videos declare autoplay.
All implementation paths are relative to `apps/web/src/`.

## Target

Respect live reduced-motion changes. ASCII renders a full static frame when reduced, pauses offscreen/hidden, resumes without a burst. A shared main-container video lifecycle pauses automatic playback when reduced/offscreen/hidden, preserves explicit user playback and enables controls. Never replace existing media URLs or CMS data.

## Repo conventions to follow

Svelte 5, TypeScript, Tailwind 4. Shared motion tokens are in `apps/web/src/app.css:279` (`--motion-duration-interactive`, `--motion-ease-interactive`). Extend them, do not introduce a library. Browser tests use Vitest browser mode and Playwright; use installed Chrome via a temporary config if bundled Chromium is absent.

## Steps

- [ ] Add meaningful browser regression coverage for lifecycle, interaction interruption and reduced motion where applicable; run before implementing.
- [ ] Implement the target in the named files, keeping existing visual layout and media sizing.
- [ ] Run `pnpm --filter web check`, relevant browser tests, changed-file ESLint and Prettier checks.
- [ ] Inspect browser desktop/mobile and live reduced motion, and check rapid pointer/menu interaction. For entrances inspect slowed playback.
- [ ] Commit this change independently with its tests; update plan status.

## Boundaries

No dependencies, deployment, CMS content edits, blanket animation removal, word rotation changes, or changes to page widths/type sizes. Existing work is already saved as independent CMS and homepage commits. This plan authorizes extending implementation details for safe cleanup, Svelte routing and explicit user playback; report scope changes.

## Verification

Test reduced motion on load and toggled live; unmount during animation; route navigation; touch/keyboard interactions; repeated pointer entry/exit. Confirm no width/height/padding animation and no invisible interactive elements held behind long delays. Verify exact link accessible names and unchanged destinations. Check no horizontal overflow at 390px. No screenshot-only assertions.
