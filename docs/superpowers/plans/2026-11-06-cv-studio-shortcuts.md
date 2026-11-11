# CV Studio controls and keyboard shortcuts

User approved the complete shortcut proposal in chat, then refined toolbars: all controls on the left, main sections use eye visibility instead of a bin, and links use a pen icon.

- [x] Add backwards-compatible contact order/deletion and legacy section deletion metadata; normalize older saved documents and honor metadata in PDF.
- [x] Add contact drag/up/down/bin controls, entry/section up/down controls, section eye with dimmed editor preview, native SVG icons and padded select arrow. Main sections have no bin. Rename to CV Studio.
- [x] Add bounded session undo/redo, typing coalescing, atomic drag transactions and cancellation. Keep named storage history independent.
- [x] Wire the approved shortcuts with modal/typing/drag guards, visible undo/redo and shortcut-help controls.
- [x] Verify typecheck, unit tests and browser workflow including shortcut interactions, geometry, history compatibility and PDF output. Review changes, update local PR and commit locally.
