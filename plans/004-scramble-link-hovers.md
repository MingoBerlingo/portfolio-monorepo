# 004 — Scrambled link hover feedback

- **Status**: TODO
- **Commit**: 97705f7
- **Severity**: LOW
- **Category**: Motion craft, accessibility and cohesion
- **Estimated scope**: new ScrambleLinkText.svelte and scrambleHover action; Header; Info; Contact; Project detail

## Problem

Navigation labels and external text links have no scramble hover.
All implementation paths are relative to `apps/web/src/`.

## Target

Add 200ms max left-to-right ASCII glyph scramble only on genuine fine-pointer hover. Preserve exact original text, measured/fixed original label dimensions, href/target/rel, accessible name and icon. Use CSS generated content overlay with original text retained for accessibility; never mutate live anchor text or URLs. Pointer leave, keyboard focus, reduced-motion change and cleanup restore immediately. No animation on focus/keyboard or touch. Rapid re-entry reuses current effect or settles; avoid a queue. Scope Header navigation (not brand), explicit external/email links in info/contact/project page, and sanitized rich-text external links; project card titles excluded.

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
