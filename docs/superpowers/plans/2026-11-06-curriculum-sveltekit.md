# Curriculum SvelteKit migration

**Goal:** Replace the standalone JavaScript editor with Svelte 5, TypeScript, SvelteKit and Tailwind, preserving its local-only workflow and improving block manipulation.

**Approved scope:** User requested the stack migration and dnd-kit Svelte reference, with handles and deletion options on hover/selection. Existing behavior remains: CMS reads, inline text editing, Italian/English, named browser history, dirty guards, DM Sans and PDF export.

**Implementation decisions:** Keep the curriculum as a separate app on port 4174. Use adapter-node with loopback-only launcher; CMS and Playwright stay server-only. Use Svelte components for the canvas, editable text, sortable blocks and dialogs. Shared TypeScript model/render modules retain the legacy saved-document schema. Section deletion hides a section in the working document and offers restore; entry deletion removes that entry from this working document. Profile is pinned. Drag only by handle, provide keyboard sorting, live transitions and cancel restoration. All block tools excluded from PDF.

- [x] Convert shared model, history, renderer and inline transforms to typed modules, preserve schema compatibility and unit coverage.
- [x] Add SvelteKit configuration, Tailwind build and typed read/PDF routes; port security checks and local startup.
- [x] Replace imperative DOM app with reactive Svelte components. Implement stable sortable identities, selected/hover tools, deletion/restore, nested entry ordering, and text/IME-safe editing.
- [x] Exercise language loading, legacy/named history, dirty guards, safe paste, editing, pointer/keyboard/cancel drag, delete/restore, responsive layout, and real PDF export through SvelteKit.
- [x] Run typecheck, build, unit and browser tests, visually inspect app and PDF, update local PR and create local commits. No push/publish.
