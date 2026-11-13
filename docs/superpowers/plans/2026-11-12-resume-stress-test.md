# Resume Stress Test Implementation Plan

**Goal:** Review an uploaded PDF, CMS resume or saved version against a job description, retaining an editable copy and evidence-based report.

**Architecture:** Add a Stress Test route using the existing editor and saved-version storage. Extract PDF text locally with PDF.js, collect observable ATS signals, and use the existing server OpenAI configuration for structured analysis and PDF-to-editor transcription. Report manual suggested corrections without silently tailoring the source. Check generated PDFs for structured sources. Flag reports stale after edits and support rerunning against the latest document.

**Tech Stack:** SvelteKit, TypeScript, PDF.js, existing OpenAI Responses integration and Playwright PDF generation.

- [x] Base Resume starts with saved versions and an explicit Load master resume action.
- [x] Add bounded local PDF inspection with page-level extraction evidence and actionable malformed/scanned-file errors.
- [x] Add structured review API for ATS observations, job matches and gaps, grammar/punctuation and terminology consistency. Treat supplied content as data and never invent resume facts.
- [x] Add source selection, report and editable workspace with saving, PDF export, stale-report state and rerun.
- [x] Verify focused extraction/report validation checks, Svelte diagnostics and browser workflow. Keep provider failures recoverable.

Decisions: PDF imports use Resume Studio layout in the editable copy. Original PDF ATS evidence remains separate from subsequent generated-PDF checks. No OCR in this version, with an explicit error for PDFs without extractable text. No automatic application of model suggestions.

Verification: PDF.js extracted both pages of the supplied Jet HR PDF. Seven focused tests passed, Svelte diagnostics passed, and browser checks confirmed saved-version review, PDF import and explicit Base Resume loading. A fresh code reviewer identified original-PDF comparison persistence, which is now retained separately from rerun evidence. Production bundle verification passed. Stress Test defaults to gpt-5.4-mini for reasoning-intensive assessment, respecting OPENAI_STRESS_MODEL and OPENAI_MODEL overrides. Local checks supplement AI language findings.
