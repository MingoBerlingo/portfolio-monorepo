# Lazy media and shimmer implementation plan

Goal: defer offscreen media downloads and show a blurred tiny preview with a subtle shimmer until the full media is ready.

Base: codex/local-curriculum at cd85af6. Work locally; do not push or open a remote PR.

Approved design: native lazy images, eager project hero, deferred video sources within 300px of the viewport, existing playback policy, reduced-motion static placeholders, stable aspect ratios, and error states without endless shimmer. Tiny JPEG data URLs are stored in CMS records and embedded in static output. Existing records fall back gracefully until backfilled.

- [x] CMS: generate preview data on upload/replacement using Sharp and existing FFmpeg frame extraction; expose read-only preview field; add explicit backfill command and tests.
- [x] Rendering: reusable Svelte media frame and equivalent CMS HTML wrappers; query previews, preserve sanitizer security, and export static video sources correctly.
- [x] Loading: shared action for image decode/video first-frame readiness, near-viewport video activation, failures, cached loads, navigation teardown, no-JS fallback, and reduced motion. Add behavior tests.
- [x] Verification: targeted CMS tests, web tests, Svelte check, changed-file lint/format, static build, desktop/mobile browser inspection; final branch review and local PR description.

Dependencies: CMS previewDataURL is consumed by the web queries and renderers. data-src must be localized before sanitization; data-autoplay is consumed by the existing mediaPlayback policy. Both action lifecycles must tolerate client navigation.

## Completion evidence

- CMS preview/poster/grid unit tests: 18 passed; real local database upload/replacement tests: 10 passed.
- Web server and browser suite: 45 passed across 19 files.
- Svelte check: 0 errors/warnings. CMS TypeScript: exit 0.
- Changed-file ESLint/Prettier and git diff --check: pass.
- Static production build: pass. Playwright static smoke: desktop/mobile loading previews, reduced-motion shimmer suppression, deferred videos, no CMS network calls, and JavaScript-disabled video controls pass.
- Backfill: all 65 local media records received previews, no failures.
- Fresh read-only review identified source-child error events and no-JS hiding gaps. Both reproduced with failing tests, fixed, and verified in the green suite.
- Review's untested browser/layout/backfill concerns were verified in the checks above; no deferred findings.

Implementation call: reused the clean current checkout on a dedicated local branch rather than creating another worktree. Base is the existing local-curriculum branch so its earlier 19 commits remain outside this change's diff. Tiny previews are embedded in CMS records instead of separate low-resolution files; this avoids preview fetches and static asset versioning problems.
