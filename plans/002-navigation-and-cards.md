# 002 — Navigation and card interaction cleanup

- **Status**: DONE
- **Commit**: 97705f7
- **Severity**: HIGH
- **Category**: Motion craft, accessibility and cohesion
- **Estimated scope**: Header.svelte; ProjectCard.svelte; app.css

## Problem

Header uses transition:slide={{ duration: 400, easing: cubicOut, axis: 'y' }}. ProjectCard uses transition-all and w-0/group-hover:w-3.
All implementation paths are relative to `apps/web/src/`.

## Target

Use explicit transform/opacity properties, 200ms UI timing, cubic-bezier(0.23,1,0.32,1). Menu uses transform and opacity, not animated height/padding. Retain link semantics, click targets and scroll locking; ensure focus and Escape behavior. Reserve indicator width, use opacity/scale, reduce image hover zoom to 1.03 and remove focus zoom. Reduced motion removes movement; pointer hover is fine-pointer-only.

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

## Accepted exception

The user explicitly preferred the original project previews after trying the audited version. Restore their 1.10 hover/focus zoom, width-expanding caption indicator, and original 300ms cubic-bezier(0,0,0.2,1) timing. Treat these as an intentional portfolio exception; do not reapply the card cleanup. Navigation fixes remain approved.
