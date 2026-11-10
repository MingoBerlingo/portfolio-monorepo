<script lang="ts">
  import type { Snippet } from "svelte";
  import StudioHeader from "./StudioHeader.svelte";
  import { onMount, tick } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import { normalizeResume, isDirty, defaultContactEntries } from "../../model.ts";
  import { listVersions, saveVersion, deleteVersion, importVersion, MAX_VERSION_IMPORT_BYTES } from "../../history.ts";
  import { applyTextEdit } from "../../inline-model.ts";
  import type {
    ResumeDocument,
    Locale,
    SavedVersion,
    SectionKey,
  } from "../../types.ts";
  import { UndoHistory } from "../../undo.ts";
  import { shortcutFor } from "../../shortcuts.ts";
  import Icon from "$lib/components/Icon.svelte";
  import ResumeCanvas from "$lib/components/ResumeCanvas.svelte";
  let { initialDocument, overview }: { initialDocument?: ResumeDocument; overview?: Snippet } = $props();
  let doc = $state.raw<ResumeDocument | null>(null),
    baseline = $state.raw<ResumeDocument | null>(null),
    locale = $state<Locale>("en"),
    selected = $state("profile"),
    selectedBlock = $state<string | null>(null),
    undoRevision = $state(0),
    name = $state(""),
    versionName = $state(""),
    pdfName = $state(""),
    zoom = $state("fit"),
    loading = $state(false),
    printing = $state(false),
    generation = $state(0),
    notice = $state(""),
    noticeError = $state(false),
    saveError = $state(""),
    saveVersions = $state.raw<SavedVersion[]>([]),
    historyError = $state(""),
    importError = $state(""),
    importing = $state(false),
    historyCount = $state<string | number>(0),
    versions = $state.raw<SavedVersion[]>([]),
    detailsError = $state("");
  const conflictingVersion = $derived(saveVersions.find((version) => version.name === versionName.trim()));
  let importInput: HTMLInputElement;
  let saveDialog: HTMLDialogElement,
    pdfDialog: HTMLDialogElement,
    historyDialog: HTMLDialogElement,
    detailsDialog: HTMLDialogElement,
    shortcutsDialog: HTMLDialogElement,
    sectionDialog: HTMLDialogElement,
    discardDialog: HTMLDialogElement;
  let approvedDestination: string | undefined;
  let sectionTitle = $state(""),
    sectionText = $state(""),
    sectionError = $state("");
  let undoHistory: UndoHistory | null = null;
  const canUndo = $derived.by(() => {
    void undoRevision;
    return !loading && Boolean(undoHistory?.canUndo);
  });
  const canRedo = $derived.by(() => {
    void undoRevision;
    return !loading && Boolean(undoHistory?.canRedo);
  });
  let details = $state<{
    type: "dates" | "link";
    path: string;
    fields: { name: string; label: string; type: string; value: string }[];
  } | null>(null);
  let timer: ReturnType<typeof setTimeout>;
  const dirty = $derived(Boolean(doc && isDirty(doc, baseline)));
  const baseTitles: Record<string, string> = {
    profile: "Profile & contact",
    introduction: "Introduction",
    skills: "Skills",
    languages: "Languages",
    experience: "Experience",
    education: "Education",
    publications: "Publications",
    research: "Research",
  };
  const titles = $derived({
    ...baseTitles,
    ...Object.fromEntries(
      (doc?.customSections ?? []).map((section) => [section.id, section.title]),
    ),
  });
  function openSection() {
    sectionTitle = "";
    sectionText = "";
    sectionError = "";
    sectionDialog.showModal();
  }
  async function addSection(event: SubmitEvent) {
    event.preventDefault();
    if (!doc || loading) return;
    try {
      const title = sectionTitle.trim();
      if (!title) throw Error("Enter a section title.");
      const id = `custom-${crypto.randomUUID()}` as const;
      change({
        ...doc,
        customSections: [
          ...(doc.customSections ?? []),
          { id, title, content: sectionText },
        ],
        sectionOrder: [...doc.sectionOrder, id],
      });
      sectionDialog.close();
      await tick();
      select(id, true);
    } catch (error) {
      sectionError =
        error instanceof Error ? error.message : "Could not add section.";
    }
  }
  const sections = $derived(
    doc
      ? ["profile", ...doc.sectionOrder.filter((k) => k !== "additional")]
      : [],
  );
  function notify(message: string, error = false) {
    clearTimeout(timer);
    notice = message;
    noticeError = error;
    if (message && !error) timer = setTimeout(() => (notice = ""), 2400);
  }
  function error(e: unknown) {
    return e instanceof Error ? e.message : "An unexpected error occurred";
  }
  async function confirmDiscard() {
    if (!dirty) return true;
    if (discardDialog.open) return false;
    discardDialog.returnValue = "";
    const closed = new Promise<boolean>((resolve) => {
      discardDialog.addEventListener("close", () => {
        resolve(discardDialog.returnValue === "discard");
      }, { once: true });
    });
    discardDialog.showModal();
    return closed;
  }
  function countHistory() {
    try {
      historyCount = listVersions().length;
    } catch {
      historyCount = "!";
    }
  }
  function adopt(value: ResumeDocument, version = "") {
    const normalized = normalizeResume(value, value.locale);
    doc = normalized;
    baseline = structuredClone(normalized);
    locale = normalized.locale;
    name = version;
    selected = "profile";
    selectedBlock = null;
    undoHistory = new UndoHistory(normalized);
    undoRevision++;
    generation++;
  }
  async function loadCMS(next: Locale) {
    if (loading) return;
    if (dirty && !(await confirmDiscard())) {
      locale = doc?.locale ?? "en";
      return;
    }
    loading = true;
    notice = "";
    try {
      const r = await fetch(`/api/resume?locale=${next}`);
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Unable to load CMS content.");
      adopt(normalizeResume(data, next));
    } catch (e) {
      notify(error(e), true);
      locale = doc?.locale ?? "en";
    } finally {
      loading = false;
    }
  }
  function select(key: string, scroll = false) {
    selected = key;
    selectedBlock = key === "profile" ? null : `section:${key}`;
    if (scroll) {
      const node =
        key === "profile"
          ? document.querySelector("#canvas header")
          : document.querySelector(`#canvas [data-section="${key}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  async function openSave(asNew = false) {
    versionName = asNew ? "" : name;
    saveError = "";
    refreshSaveVersions();
    saveDialog.showModal();
    await tick();
    document.getElementById("version-name")?.focus();
  }
  function save(e: SubmitEvent) {
    e.preventDefault();
    commitVersion(conflictingVersion ? { replaceId: conflictingVersion.id } : undefined);
  }
  function refreshSaveVersions() {
    try {
      saveVersions = listVersions();
    } catch {
      saveVersions = [];
    }
  }
  function commitVersion(resolution?: { replaceId: string } | "numbered") {
    if (!doc) return;
    saveError = "";
    try {
      const version = saveVersion(localStorage, doc, versionName, Date.now(), resolution);
      baseline = structuredClone(version.document);
      undoHistory?.record(doc);
      undoRevision++;
      name = version.name;
      saveDialog.close();
      countHistory();
      notify(`“${name}” saved in this browser.`);
    } catch (e) {
      refreshSaveVersions();
      saveError = `Could not save: ${error(e)}. Your current edits are still here.`;
    }
  }
  function showHistory() {
    try {
      versions = listVersions();
      historyError = "";
    } catch (e) {
      versions = [];
      historyError = `History could not be opened: ${error(e)}. Existing browser data has not been changed.`;
    }
  }
  function openHistory() {
    importError = "";
    showHistory();
    historyDialog.showModal();
  }
  async function importFromFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || importing) return;
    importing = true;
    importError = "";
    try {
      if (file.size > MAX_VERSION_IMPORT_BYTES) throw Error("The JSON file is too large");
      const version = importVersion(localStorage, await file.text());
      showHistory();
      countHistory();
      notify(`Imported “${version.name}”.`);
    } catch (e) {
      importError = `Could not import: ${error(e)}.`;
    } finally {
      importing = false;
    }
  }
  function exportVersion(version: SavedVersion) {
    const blob = new Blob([JSON.stringify(version)], { type: "application/json" });
    downloadBlob(blob, `${filenameStem(version.name) || "resume"}.json`);
  }
  async function loadVersion(version: SavedVersion) {
    if (!(await confirmDiscard())) return;
    adopt(version.document, version.name);
    historyDialog.close();
    notify(`Loaded “${version.name}”.`);
  }
  function removeVersion(id: string) {
    if (
      !confirm(
        "Delete this saved version from this browser? This cannot be undone.",
      )
    )
      return;
    try {
      deleteVersion(localStorage, id);
      showHistory();
      countHistory();
    } catch (e) {
      notify(error(e), true);
    }
  }
  function valueAt(path: string): Record<string, string> {
    let value: unknown = doc;
    for (const key of path.split(".")) {
      if (!value || typeof value !== "object") return {};
      value = (value as Record<string, unknown>)[key];
    }
    return value as Record<string, string>;
  }
  function openDetails(type: "dates" | "link", path: string) {
    const value =
      path === "contactEntries.new"
        ? { kind: "text", label: "", text: "", url: "" }
        : valueAt(path);
    const fields = path.startsWith("contactEntries.")
      ? [
          ["kind", "Entry type", "select"],
          ["label", "Label (optional)", "text"],
          ["text", "Text", "text"],
          ["url", "URL", "url"],
        ]
      : type === "link"
        ? [
            ["url", "URL", "url"],
            ...(path.startsWith("profile.")
              ? [["label", "Link text", "text"]]
              : []),
          ]
        : path.startsWith("research.")
          ? [["date", "Date", "date"]]
          : [
              ["startDate", "Start date", "date"],
              ["endDate", "End date", "date"],
            ];
    details = {
      type,
      path,
      fields: fields.map(([name, label, type]) => ({
        name,
        label,
        type,
        value:
          type === "date" ? value[name]?.slice(0, 10) || "" : value[name] || "",
      })),
    };
    detailsError = "";
    detailsDialog.showModal();
  }
  function applyDetails(e: SubmitEvent) {
    e.preventDefault();
    if (!details || !doc) return;
    try {
      if (details.path === "contactEntries.new") {
        const values = Object.fromEntries(
          details.fields.map((field) => [field.name, field.value]),
        );
        const kind =
          values.kind === "link" ? ("link" as const) : ("text" as const);
        if (kind === "link" && values.url && !/^https?:\/\//i.test(values.url))
          throw Error("Use an http or https URL.");
        const entry = {
          id: crypto.randomUUID(),
          label: values.label || "",
          text: values.text || "",
          url: values.url || "",
          kind,
        };
        change({
          ...doc,
          contactEntries: [
            ...(doc.contactEntries ?? defaultContactEntries(doc)),
            entry,
          ],
        });
        selectedBlock = `contact:${entry.id}`;
        detailsDialog.close();
        return;
      }
      let next = doc;
      for (const f of details.fields) {
        if (
          f.name === "url" &&
          f.value &&
          (!details.path.startsWith("contactEntries.") ||
            details.fields.find((field) => field.name === "kind")?.value ===
              "link") &&
          !/^https?:\/\//i.test(f.value)
        )
          throw Error("Use an http or https URL.");
        next = applyTextEdit(next, `${details.path}.${f.name}`, f.value);
      }
      change(next);
      detailsDialog.close();
    } catch (e) {
      detailsError = error(e);
    }
  }
  async function openDownload() {
    if (!doc || loading || printing || pdfDialog.open) return;
    pdfName = name || `resume-${doc.locale}`;
    pdfDialog.showModal();
    await tick();
    document.querySelector<HTMLInputElement>("#pdf-name")?.select();
  }
  function filenameStem(value: string) {
    return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_").replace(/[.\s]+$/, "");
  }
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function download(event: SubmitEvent) {
    event.preventDefault();
    if (!doc || loading || printing || !pdfName.trim()) return;
    const stem = filenameStem(pdfName.trim().replace(/\.pdf$/i, ""));
    const filename = `${stem || `resume-${doc.locale}`}.pdf`;
    const snapshot = structuredClone(doc);
    printing = true;
    pdfDialog.close();
    notify("Preparing your PDF…");
    try {
      const r = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      if (!r.ok) {
        const result = await r.json();
        throw Error(result.error || "PDF download failed.");
      }
      downloadBlob(await r.blob(), filename);
      notify("PDF downloaded.");
    } catch (e) {
      notify(error(e), true);
    } finally {
      printing = false;
    }
  }
  function change(
    next: ResumeDocument,
    meta?: { group?: string; transaction?: "begin" | "commit" | "cancel" },
  ) {
    if (loading) return;
    if (!undoHistory) undoHistory = new UndoHistory(doc ?? next);
    if (meta?.transaction === "begin") undoHistory.begin();
    else if (meta?.transaction === "cancel") {
      doc = undoHistory.cancel() ?? next;
      undoRevision++;
      return;
    } else if (meta?.transaction === "commit") undoHistory.commit(next);
    else undoHistory.record(next, meta?.group);
    doc = next;
    undoRevision++;
  }
  async function travel(redo = false) {
    if (loading || !undoHistory) return;
    const field =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const path = field?.dataset.field,
      line = field?.dataset.line;
    const next = redo ? undoHistory.redo() : undoHistory.undo();
    if (!next) return;
    doc = next;
    undoRevision++;
    generation++;
    await tick();
    if (path) {
      const node = document.querySelector<HTMLElement>(
        `#canvas [data-field="${path}"]${line === undefined ? "" : `[data-line="${line}"]`}`,
      );
      node?.focus({ preventScroll: true });
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }
  function restore(key: SectionKey) {
    if (doc)
      change({
        ...doc,
        deletedSections: (doc.deletedSections ?? []).filter((k) => k !== key),
        hiddenSections: doc.hiddenSections.filter((k) => k !== key),
      });
    selected = key;
    selectedBlock = `section:${key}`;
  }
  function keyboard(event: KeyboardEvent) {
    const target = event.target instanceof Element ? event.target : null;
    const modal = discardDialog.open ? discardDialog : document.querySelector<HTMLDialogElement>("dialog[open]");
    const action = shortcutFor(event, {
      editing: Boolean(
        target?.closest(
          'input,textarea,select,[contenteditable="plaintext-only"],[contenteditable="true"]',
        ),
      ),
      dialog: Boolean(modal),
      selected: Boolean(selectedBlock),
    });
    if (!action) return;
    if (
      document.querySelector('[data-dnd-placeholder],[aria-grabbed="true"]')
    ) {
      if (action !== "escape") event.preventDefault();
      return;
    }
    event.preventDefault();
    if (action === "escape") {
      if (modal) modal.close();
      else {
        (document.activeElement as HTMLElement)?.blur();
        selectedBlock = null;
      }
      return;
    }
    if (action === "save" || action === "save-new") {
      if (!doc || loading) return;
      if (modal && modal !== saveDialog) return;
      if (saveDialog.open && action === "save") {
        document.querySelector<HTMLFormElement>("#save-form")?.requestSubmit();
        return;
      }
      void openSave(action === "save-new");
      return;
    }
    if (action === "help") {
      shortcutsDialog.showModal();
      return;
    }
    if (loading || !doc) return;
    if (action === "undo" || action === "redo") {
      void travel(action === "redo");
      return;
    }
    if (action === "export") {
      if (!modal) void openDownload();
      return;
    }
    if (!selectedBlock) return;
    const block = document.querySelector<HTMLElement>(
      `#canvas [data-block="${selectedBlock}"]`,
    );
    const selector =
      action === "move-up"
        ? '[data-move="up"]'
        : action === "move-down"
          ? '[data-move="down"]'
          : action === "delete"
            ? "[data-delete-block]"
            : "[data-toggle-visibility]";
    const control = block?.querySelector<HTMLButtonElement>(
      `:scope > .block-tools ${selector}`,
    );
    if (control && !control.disabled) control.click();
  }
  beforeNavigate((navigation) => {
    const destination = navigation.to?.url;
    if (destination?.href === approvedDestination && approvedDestination) {
      approvedDestination = undefined;
      return;
    }
    if (navigation.willUnload || !destination || !dirty) return;
    navigation.cancel();
    void confirmDiscard().then(async (discard) => {
      if (!discard) return;
      approvedDestination = destination.href;
      if (navigation.type === "popstate") {
        history.go(navigation.delta);
      } else {
        try {
          await goto(destination);
        } catch (cause) {
          notify(error(cause), true);
        } finally {
          approvedDestination = undefined;
        }
      }
    });
  });
  onMount(() => {
    countHistory();
    if (initialDocument) {
      adopt(initialDocument);
      baseline = null;
    } else void loadCMS("en");
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const storage = () => {
      countHistory();
      if (historyDialog.open) showHistory();
      if (saveDialog.open) refreshSaveVersions();
    };
    window.addEventListener("keydown", keyboard);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("storage", storage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("storage", storage);
    };
  });
</script>

<StudioHeader>
  <div class="flex items-center gap-3 md:gap-5">
    <span
      class="flex max-w-48 items-center gap-2 truncate text-xs text-stone-500"
      ><span
        id="dirty-dot"
        class:dirty
        class="size-1.5 shrink-0 rounded-full bg-stone-300"
      ></span><span id="version-status"
        >{loading
          ? "Loading…"
          : !doc
            ? "No Resume loaded"
            : dirty
              ? "Unsaved changes"
              : name || "CMS copy"}</span
      ></span
    ><label class="sr-only" for="locale">Language</label><select
      id="locale"
      bind:value={locale}
      disabled={loading || Boolean(initialDocument)}
      onchange={() => loadCMS(locale)}
      ><option value="en">🇬🇧 EN</option><option value="it">🇮🇹 IT</option
      ></select
    >
  </div>
</StudioHeader>
{@render overview?.()}
<div
  class="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-3 py-3 backdrop-blur md:px-7"
>
  <div class="flex gap-2">
    {#if !initialDocument}
      <button id="reload" class="button" disabled={loading} onclick={() => loadCMS(locale)}>
        <Icon name="refresh" /> Load from CMS
      </button>
    {/if}
    <button
      id="history"
      class="button"
      disabled={loading}
      onclick={openHistory}
      >History <span
        id="history-count"
        class="rounded bg-stone-100 px-1.5 text-xs text-stone-500"
        >{historyCount}</span
      ></button
    >
  </div>
  <div class="ml-auto flex flex-wrap gap-2">
    <button
      id="undo"
      class="button"
      aria-label="Undo"
      title="Undo (⌘/Ctrl Z)"
      disabled={!canUndo}
      onclick={() => travel()}><Icon name="undo" /></button
    >
    <button
      id="redo"
      class="button"
      aria-label="Redo"
      title="Redo (⌘/Ctrl Shift Z)"
      disabled={!canRedo}
      onclick={() => travel(true)}><Icon name="redo" /></button
    >
    <button
      id="shortcuts"
      class="button"
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
      onclick={() => shortcutsDialog.showModal()}><Icon name="help" /></button
    >
    <label class="sr-only" for="zoom">Canvas zoom</label><select
      id="zoom"
      bind:value={zoom}
      ><option value="fit">Fit</option><option value="1">100%</option><option
        value="1.25">125%</option
      ></select
    ><button
      id="save"
      class="button"
      disabled={!doc || loading}
      onclick={() => openSave()}>Save</button
    ><button
      id="download"
      class="button primary"
      disabled={!doc || loading || printing}
      onclick={openDownload}>{#if !printing}<Icon name="download" />{/if}{printing ? "Preparing…" : "Download PDF"}</button
    >
  </div>
</div>
<p
  id="notice"
  role={noticeError ? "alert" : "status"}
  hidden={!notice}
  class:error={noticeError}
  class="notice"
>
  {notice}
</p>
<main class="mx-auto max-w-[1550px] p-3 md:p-7">
  {#if doc}<div
      id="workspace"
      class="grid min-w-0 items-start gap-5 lg:grid-cols-[160px_minmax(0,1fr)]"
    >
      <aside class="min-w-0 lg:sticky lg:top-24">
        <nav
          id="sections"
          aria-label="Resume sections"
          class="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {#each sections as key, i}<div
              class="flex shrink-0 items-center gap-1"
            >
              <button
                class="nav-button min-w-0 flex-1 whitespace-nowrap lg:whitespace-normal"
                class:active={selected === key}
                class:omitted={doc.hiddenSections.includes(key as SectionKey)}
                data-section={key}
                disabled={loading}
                onclick={() => select(key, true)}
                ><span class="w-4 text-[10px] opacity-60"
                  >{String(i + 1).padStart(2, "0")}</span
                >{titles[key]}</button
              >
            </div>{/each}
        </nav>
        <div
          id="section-controls"
          class="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 text-xs text-stone-500"
        >
          <button
            id="add-section"
            class="add-entry"
            disabled={loading}
            onclick={openSection}><Icon name="add" /> Add section</button
          >
          {#each (doc.deletedSections ?? []).filter((k) => k !== "additional") as key}<button
              class="button"
              data-restore={key}
              disabled={loading}
              onclick={() => restore(key)}>Restore {titles[key]}</button
            >{/each}
        </div>
      </aside>
      {#key generation}<ResumeCanvas
          {doc}
          disabled={loading}
          {zoom}
          {selected}
          onchange={change}
          {selectedBlock}
          onblockselect={(key) => (selectedBlock = key)}
          onselect={(k) => (selected = k)}
          ondetails={openDetails}
          onerror={(m) => notify(m, true)}
        />{/key}
    </div>{:else}<div id="empty" class="py-24 text-center">
      <h1 class="mb-6 text-2xl">Resume Studio</h1>
      <button
        class="button primary"
        id="empty-load"
        disabled={loading}
        onclick={() => loadCMS(locale)}
        >{loading ? "Loading…" : "Load from CMS"}</button
      >
    </div>{/if}
</main>
<dialog bind:this={discardDialog} aria-labelledby="discard-title" aria-describedby="discard-description">
  <h2 id="discard-title">Discard unsaved changes?</h2>
  <p id="discard-description" class="mt-2 text-sm text-stone-600">
    Save a named version to keep this draft before continuing.
  </p>
  <div class="dialog-actions">
    <button type="button" class="button" onclick={() => discardDialog.close()}>Keep editing</button>
    <button type="button" class="button border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
      onclick={() => discardDialog.close("discard")}>Discard changes</button>
  </div>
</dialog>

<dialog id="save-dialog" bind:this={saveDialog}>
  <form id="save-form" onsubmit={save}>
    <div class="dialog-top">
      <h2>Save</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close save dialog"
        onclick={() => saveDialog.close()}><Icon name="close" /></button
      >
    </div>
    <label for="version-name">Version name</label><input
      id="version-name"
      bind:value={versionName}
      oninput={() => { saveError = ""; }}
      required
      maxlength="120"
      autocomplete="off"
      placeholder="e.g. Product designer · Acme"
    />
    <p id="save-error" class="error" hidden={!saveError}>{saveError}</p>
    {#if conflictingVersion}
      <p class="mt-2 text-sm text-amber-800" role="status">“{conflictingVersion.name}” already exists. Save replaces it. Save as new keeps both versions.</p>
    {/if}
    <div class="dialog-actions">
      <button type="button" class="button" onclick={() => saveDialog.close()}
        >Cancel</button
      >
      {#if conflictingVersion}
        <button class="button" type="button" onclick={() => commitVersion("numbered")}>Save as new</button>
      {/if}
      <button class="button primary" type="submit" disabled={!versionName.trim()}>Save</button>
    </div>
  </form>
</dialog>
<dialog bind:this={pdfDialog} aria-labelledby="pdf-dialog-title">
  <form onsubmit={download}>
    <div class="dialog-top">
      <h2 id="pdf-dialog-title">Download PDF</h2>
      <button class="icon-button" type="button" aria-label="Close download dialog"
        onclick={() => pdfDialog.close()}><Icon name="close" /></button>
    </div>
    <label for="pdf-name">File name</label>
    <input id="pdf-name" bind:value={pdfName} required maxlength="124" autocomplete="off" />
    <div class="dialog-actions">
      <button class="button" type="button" onclick={() => pdfDialog.close()}>Cancel</button>
      <button class="button primary" type="submit" disabled={!pdfName.trim()}>Download</button>
    </div>
  </form>
</dialog>
<dialog id="history-dialog" class="history-dialog" bind:this={historyDialog}>
  <div class="dialog-top">
    <h2>History</h2>
    <button
      class="icon-button"
      aria-label="Close history"
      onclick={() => historyDialog.close()}><Icon name="close" /></button
    >
  </div>
  <input type="file" accept=".json,application/json" hidden bind:this={importInput} onchange={importFromFile} />
  <button type="button" class="button" disabled={importing} onclick={() => importInput.click()}>Import JSON</button>
  {#if importError}<p class="error mt-2" role="alert">{importError}</p>{/if}
  <div id="history-list">
    {#if historyError}<p class="error">
        {historyError}
      </p>{:else if !versions.length}<p class="text-sm text-stone-500">
        No saved versions yet. Use Save to keep a named copy for later.
      </p>{:else}{#each versions as version (version.id)}<article
          class="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-200 p-4"
        >
          <div class="min-w-0">
            <h3 class="break-words text-sm font-semibold">{version.name}</h3>
            <p class="mt-1 text-xs text-stone-500">
              {new Date(version.savedAt).toLocaleString()} · {version.document
                .locale === "it"
                ? "🇮🇹 IT"
                : "🇬🇧 EN"}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              class="button"
              data-load={version.id}
              onclick={() => loadVersion(version)}>Load</button
            ><button
              class="button"
              onclick={() => exportVersion(version)}>Export JSON</button
            ><button
              class="icon-button text-red-600"
              data-delete={version.id}
              aria-label={`Delete ${version.name}`}
              title={`Delete ${version.name}`}
              onclick={() => removeVersion(version.id)}
              ><Icon name="delete" /></button
            >
          </div>
        </article>{/each}{/if}
  </div>
</dialog>
<dialog id="details-dialog" bind:this={detailsDialog}>
  <form id="details-form" onsubmit={applyDetails}>
    <div class="dialog-top">
      <h2>
        {details?.path.startsWith("contactEntries.")
          ? "Main info entry"
          : details?.type === "dates"
            ? "Dates"
            : "Link"}
      </h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close details"
        onclick={() => detailsDialog.close()}><Icon name="close" /></button
      >
    </div>
    <div id="details-fields">
      {#each details?.fields || [] as field}
        {#if field.name !== "url" || !details?.path.startsWith("contactEntries.") || details.fields.find((value) => value.name === "kind")?.value === "link"}
          <label for={`detail-${field.name}`}>{field.label}</label>
          {#if field.type === "select"}<select
              id={`detail-${field.name}`}
              name={field.name}
              bind:value={field.value}
              ><option value="text">Text</option><option value="link"
                >Text + link</option
              ></select
            >
          {:else}<input
              id={`detail-${field.name}`}
              name={field.name}
              type={field.type}
              bind:value={field.value}
            />{/if}
        {/if}
      {/each}
    </div>
    <p id="details-error" class="error" hidden={!detailsError}>
      {detailsError}
    </p>
    <div class="dialog-actions">
      <button class="button" type="button" onclick={() => detailsDialog.close()}
        >Cancel</button
      ><button class="button primary" type="submit">Apply</button>
    </div>
  </form>
</dialog>

<dialog id="shortcuts-dialog" bind:this={shortcutsDialog}>
  <div class="dialog-top">
    <h2>Keyboard shortcuts</h2>
    <button
      class="icon-button"
      aria-label="Close shortcuts"
      onclick={() => shortcutsDialog.close()}><Icon name="close" /></button
    >
  </div>
  <p class="mb-4 text-xs text-stone-500">
    Use Ctrl instead of ⌘ on Windows/Linux.
  </p>
  <dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
    {#each [["⌘ Z", "Undo"], ["⌘ Shift Z", "Redo (also Ctrl Y)"], ["⌘ S", "Save a named version"], ["⌘ Shift S", "Save as a new version"], ["⌘ Shift E", "Download PDF"], ["Alt ↑ / ↓", "Move selected block"], ["H", "Hide/show selected section"], ["Delete / Backspace", "Delete selected entry or contact"], ["Space → arrows → Space", "Pick up, move and drop a drag handle"], ["Escape", "Cancel drag, close dialog or clear selection"], ["?", "Show keyboard shortcuts"]] as [keys, action]}<dt
      >
        <kbd>{keys}</kbd>
      </dt>
      <dd>{action}</dd>{/each}
  </dl>
  <p class="mt-5 text-xs text-stone-500">
    Block shortcuts work outside text fields. Undo/redo applies to this editing
    session; named versions stay in History.
  </p>
</dialog>

<dialog id="section-dialog" bind:this={sectionDialog}>
  <form onsubmit={addSection}>
    <div class="dialog-top">
      <h2>Add section</h2>
      <button
        type="button"
        class="icon-button"
        aria-label="Close add section"
        onclick={() => sectionDialog.close()}><Icon name="close" /></button
      >
    </div>
    <label for="section-title">Title</label><input
      id="section-title"
      bind:value={sectionTitle}
      required
      maxlength="120"
      autocomplete="off"
    />
    <label for="section-text">Text</label><textarea
      id="section-text"
      class="min-h-32 w-full rounded-lg border border-stone-200 p-3 text-sm"
      bind:value={sectionText}
    ></textarea>
    <p class="error" hidden={!sectionError}>{sectionError}</p>
    <div class="dialog-actions">
      <button class="button" type="button" onclick={() => sectionDialog.close()}
        >Cancel</button
      ><button class="button primary" type="submit">Add section</button>
    </div>
  </form>
</dialog>
