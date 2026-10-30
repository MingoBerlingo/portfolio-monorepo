# 003 — Coordinated page entrances

- **Status**: DONE
- **Commit**: 97705f7
- **Severity**: LOW
- **Category**: Motion craft, accessibility and cohesion
- **Estimated scope**: new entrance action; homepage; project page; app.css

## Problem

Pages currently appear immediately; description has a user-approved scroll reveal.
All implementation paths are relative to `apps/web/src/`.

## Target

Use shared easing cubic-bezier(0.23,1,0.32,1), 450ms portfolio entrance and 50ms group stagger. Homepage presentation and ASCII enter as two blocks; project intro and cover enter as two blocks. Use WAAPI opacity and translateY(12px) to none, cancel cleanly on unmount. Reduced motion uses 200ms opacity only, no stagger. Header persists unchanged, case-study body readable, no global loading overlay, do not animate every section or modify the description reveal.

## Repo conventions to follow

Svelte 5, TypeScript, Tailwind 4. Shared motion tokens are in `apps/web/src/app.css:279` (`--motion-duration-interactive`, `--motion-ease-interactive`). Extend them, do not introduce a library. Browser tests use Vitest browser mode and Playwright; use installed Chrome via a temporary config if bundled Chromium is absent.

## Steps

- [x] Add meaningful browser regression coverage for lifecycle, interaction interruption and reduced motion where applicable; run before implementing.
- [x] Implement the target in the named files, keeping existing visual layout and media sizing.
- [x] Run `pnpm --filter web check`, relevant browser tests, changed-file ESLint and Prettier checks.
- [x] Inspect browser desktop/mobile and live reduced motion, and check rapid pointer/menu interaction. For entrances inspect slowed playback.
- [x] Commit this change independently with its tests; update plan status.

## Boundaries

No dependencies, deployment, CMS content edits, blanket animation removal, word rotation changes, or changes to page widths/type sizes. Existing work is already saved as independent CMS and homepage commits. This plan authorizes extending implementation details for safe cleanup, Svelte routing and explicit user playback; report scope changes.

## Verification

Test reduced motion on load and toggled live; unmount during animation; route navigation; touch/keyboard interactions; repeated pointer entry/exit. Confirm no width/height/padding animation and no invisible interactive elements held behind long delays. Verify exact link accessible names and unchanged destinations. Check no horizontal overflow at 390px. No screenshot-only assertions.
