# Lazy-load portfolio media with blurred previews and shimmer

Local branch: `codex/lazy-media-shimmer`
Base: `codex/local-curriculum` (`cd85af6`)
Status: local only; no remote pull request or push.

Offscreen videos previously received their source immediately. Portfolio images
and videos now share a stable loading frame: a tiny blurred preview with a subtle
shimmer, followed by the decoded image or video's first available frame. Images
use native lazy loading; video sources activate within 300px of the viewport.
The project hero loads eagerly.

Payload generates 32px JPEG previews on upload and replacement. An idempotent
backfill fills missing previews for existing media. Previews are embedded in CMS
data and static exports. Cards, covers, inline introduction images and CMS rich
text use the same readiness handling. Existing visibility playback policy is
preserved, reduced motion disables loading animation, and failures stop shimmer.
Videos have a manual no-JavaScript fallback.

Validation:

- 45 web tests across 19 files; 28 targeted CMS tests, including real uploads,
  replacement preview refresh, and FFmpeg frame extraction.
- Web and CMS type checks, changed-file lint/format, and whitespace check passed.
- Static production build passed.
- Browser smoke passed at 1440px and 390px, including held media requests,
  reduced motion, deferred video sources, no CMS requests from the export, and
  native controls with JavaScript disabled.
- Independent review findings fixed with regression tests.

Local CMS backfill completed for all 65 existing media records. Other CMS
environments need `pnpm --filter cms backfill:media-previews` to add previews to
existing uploads; new uploads and replacements generate previews automatically.
There is a neutral shimmer fallback until backfill runs. No database migration
is required for the optional MongoDB field.

Follow-up: remove project cover fade/slide entrances and opacity reveal. Fix
pre-hydration video layout: the no-JavaScript hiding rule now lives in a
`noscript` stylesheet, so deferred videos reserve space before hydration while
still presenting only one native fallback when scripts are disabled.

At 763×988, delaying JavaScript while viewing a video reproduced a 0px → 412px
height change and a layout-shift entry of 0.134. After the fix the same video
remains 412px high and the same experiment records CLS 0.00. The reported 0.46
was not reproduced exactly; ordinary fresh page loads also measured 0.00.
Regression suite now has 47 passing web tests. Svelte check, changed-file lint,
formatting, and desktop/mobile/no-JavaScript static smoke checks pass.

Loading sequence / hover follow-up: emit `data-media-state="loading"` in the
initial component, inline-image and rich-text HTML. This prevents progressively
painted high-res bytes from appearing before hydration hides them. Placeholders
and shimmer now start together, and the high-res image is exposed only after
decode. Preserve the card's 300ms scale/transform transitions alongside the
200ms opacity transition. The project cover retains its immediate reveal.
No-JavaScript styles reveal native images and suppress placeholders/shimmer.

Validation: 50 web tests passed; Svelte check, changed-file lint/format and static
build passed. A browser smoke held JavaScript and media separately, confirmed
high-res opacity stays zero until decode, measured intermediate hover scale
1.05362 on its way to 1.1, and verified native no-JavaScript image/video fallback.
