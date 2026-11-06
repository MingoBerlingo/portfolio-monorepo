<script lang="ts">
  import { onMount, tick } from "svelte";
  import { beforeNavigate } from "$app/navigation";
  import { normalizeCV, isDirty } from "../model.ts";
  import { listVersions, saveVersion, deleteVersion } from "../history.ts";
  import { applyTextEdit, addEntry } from "../inline-model.ts";
  import type {
    CVDocument,
    Locale,
    SavedVersion,
    SectionKey,
    CollectionKey,
  } from "../types.ts";
  import { UndoHistory } from "../undo.ts";
  import { shortcutFor } from "../shortcuts.ts";
  import CvCanvas from "$lib/components/CvCanvas.svelte";
  let doc = $state.raw<CVDocument | null>(null),
    baseline = $state.raw<CVDocument | null>(null),
    locale = $state<Locale>("en"),
    selected = $state("profile"),
    selectedBlock = $state<string | null>(null),
    undoRevision = $state(0),
    name = $state(""),
    versionName = $state(""),
    zoom = $state("fit"),
    loading = $state(false),
    printing = $state(false),
    generation = $state(0),
    notice = $state(""),
    noticeError = $state(false),
    saveError = $state(""),
    historyError = $state(""),
    historyCount = $state<string | number>(0),
    versions = $state.raw<SavedVersion[]>([]),
    detailsError = $state("");
  let saveDialog: HTMLDialogElement,
    historyDialog: HTMLDialogElement,
    detailsDialog: HTMLDialogElement,
    shortcutsDialog: HTMLDialogElement;
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
  const dirty = $derived(Boolean(doc && baseline && isDirty(doc, baseline)));
  const titles: Record<string, string> = {
    profile: "Profile & contact",
    introduction: "Introduction",
    skills: "Skills & languages",
    experience: "Experience",
    education: "Education",
    publications: "Publications",
    research: "Research",
  };
  const collections: Record<string, CollectionKey> = {
    experience: "experiences",
    education: "education",
    publications: "publications",
    research: "research",
  };
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
  function guard() {
    return (
      !dirty ||
      confirm(
        "You have unsaved changes. Discard them and continue? Save a named version first to keep this copy.",
      )
    );
  }
  function countHistory() {
    try {
      historyCount = listVersions().length;
    } catch {
      historyCount = "!";
    }
  }
  function adopt(value: CVDocument, version = "") {
    const normalized = normalizeCV(value, value.locale);
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
    if (!guard()) {
      locale = doc?.locale ?? "en";
      return;
    }
    loading = true;
    notice = "";
    try {
      const r = await fetch(`/api/cv?locale=${next}`);
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Unable to load CMS content.");
      adopt(normalizeCV(data, next));
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
    saveDialog.showModal();
    await tick();
    document.getElementById("version-name")?.focus();
  }
  function save(e: SubmitEvent) {
    e.preventDefault();
    if (!doc) return;
    try {
      const version = saveVersion(localStorage, doc, versionName);
      baseline = structuredClone(version.document);
      undoHistory?.record(doc);
      undoRevision++;
      name = version.name;
      saveDialog.close();
      countHistory();
      notify(`“${name}” saved in this browser.`);
    } catch (e) {
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
    showHistory();
    historyDialog.showModal();
  }
  function loadVersion(version: SavedVersion) {
    if (!guard()) return;
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
    const value = valueAt(path);
    const fields =
      type === "link"
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
      let next = doc;
      for (const f of details.fields) {
        if (f.name === "url" && f.value && !/^https?:\/\//i.test(f.value))
          throw Error("Use an http or https URL.");
        next = applyTextEdit(next, `${details.path}.${f.name}`, f.value);
      }
      change(next);
      detailsDialog.close();
    } catch (e) {
      detailsError = error(e);
    }
  }
  async function download() {
    if (!doc || printing) return;
    const snapshot = structuredClone(doc);
    printing = true;
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
      const blob = await r.blob();
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `cv-${snapshot.locale}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify("PDF downloaded.");
    } catch (e) {
      notify(error(e), true);
    } finally {
      printing = false;
    }
  }
  function change(
    next: CVDocument,
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
    const modal = document.querySelector<HTMLDialogElement>("dialog[open]");
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
      void download();
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
    if (!navigation.willUnload && !guard()) navigation.cancel();
  });
  onMount(() => {
    countHistory();
    void loadCMS("en");
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const storage = () => {
      countHistory();
      if (historyDialog.open) showHistory();
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

<svelte:head
  ><title>CV Studio</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<header
  class="flex min-h-16 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 md:px-7"
>
  <div class="flex items-center gap-3 text-lg font-semibold tracking-tight">
    <span
      class="grid size-9 place-items-center rounded-xl bg-indigo-600 text-2xl text-white"
      >c.</span
    ><span>CV <span class="font-normal text-stone-500">Studio</span></span>
  </div>
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
            ? "No CV loaded"
            : dirty
              ? "Unsaved changes"
              : name || "CMS copy"}</span
      ></span
    ><label class="sr-only" for="locale">Language</label><select
      id="locale"
      bind:value={locale}
      disabled={loading}
      onchange={() => loadCMS(locale)}
      ><option value="en">🇬🇧 EN</option><option value="it">🇮🇹 IT</option
      ></select
    >
  </div>
</header>
<div
  class="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-3 py-3 backdrop-blur md:px-7"
>
  <div class="flex gap-2">
    <button
      id="reload"
      class="button"
      disabled={loading}
      onclick={() => loadCMS(locale)}>↻ Load from CMS</button
    ><button
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
      onclick={() => travel()}>↶</button
    >
    <button
      id="redo"
      class="button"
      aria-label="Redo"
      title="Redo (⌘/Ctrl Shift Z)"
      disabled={!canRedo}
      onclick={() => travel(true)}>↷</button
    >
    <button
      id="shortcuts"
      class="button"
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
      onclick={() => shortcutsDialog.showModal()}>?</button
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
      onclick={() => openSave()}>Save version</button
    ><button
      id="download"
      class="button primary"
      disabled={!doc || loading || printing}
      onclick={download}>{printing ? "Preparing…" : "↓ Download PDF"}</button
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
      class="grid items-start gap-5 md:grid-cols-[160px_minmax(0,1fr)]"
    >
      <aside class="md:sticky md:top-24">
        <label for="section-select" class="sr-only">Section</label><select
          id="section-select"
          class="md:hidden"
          value={selected}
          onchange={(e) => select(e.currentTarget.value, true)}
          >{#each sections as key}<option value={key}
              >{titles[key]}{doc.hiddenSections.includes(key as SectionKey)
                ? " (hidden)"
                : ""}</option
            >{/each}</select
        >
        <nav
          id="sections"
          aria-label="CV sections"
          class="hidden flex-col gap-1 md:flex"
        >
          {#each sections as key, i}<button
              class="nav-button"
              class:active={selected === key}
              class:omitted={doc.hiddenSections.includes(key as SectionKey)}
              data-section={key}
              disabled={loading}
              onclick={() => select(key, true)}
              ><span class="w-4 text-[10px] opacity-60"
                >{String(i + 1).padStart(2, "0")}</span
              >{titles[key]}</button
            >{/each}
        </nav>
        <div
          id="section-controls"
          class="mt-4 flex flex-col gap-3 border-t border-stone-200 pt-4 text-xs text-stone-500"
        >
          {#if collections[selected]}<button
              type="button"
              class="add-entry"
              data-action="add"
              data-key={collections[selected]}
              disabled={loading}
              onclick={() => {
                if (doc) {
                  const next = addEntry(doc, collections[selected]);
                  change({
                    ...next,
                    hiddenSections: doc.hiddenSections.filter(
                      (k) => k !== selected,
                    ),
                    deletedSections: (doc.deletedSections ?? []).filter(
                      (k) => k !== selected,
                    ),
                  });
                }
              }}>+ Add entry</button
            >{/if}
          {#each (doc.deletedSections ?? []).filter((k) => k !== "additional") as key}<button
              class="button"
              data-restore={key}
              disabled={loading}
              onclick={() => restore(key)}>Restore {titles[key]}</button
            >{/each}
          {#each doc.deletedContacts ?? [] as key}<button
              class="button"
              data-restore-contact={key}
              disabled={loading}
              onclick={() => {
                if (doc)
                  change({
                    ...doc,
                    deletedContacts: (doc.deletedContacts ?? []).filter(
                      (k) => k !== key,
                    ),
                  });
              }}>Restore {key}</button
            >{/each}
        </div>
      </aside>
      {#key generation}<CvCanvas
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
      <h1 class="mb-6 text-2xl">CV Studio</h1>
      <button
        class="button primary"
        id="empty-load"
        disabled={loading}
        onclick={() => loadCMS(locale)}
        >{loading ? "Loading…" : "Load from CMS"}</button
      >
    </div>{/if}
</main>
<dialog id="save-dialog" bind:this={saveDialog}>
  <form id="save-form" onsubmit={save}>
    <div class="dialog-top">
      <h2>Save version</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close save dialog"
        onclick={() => saveDialog.close()}>×</button
      >
    </div>
    <label for="version-name">Version name</label><input
      id="version-name"
      bind:value={versionName}
      required
      maxlength="120"
      autocomplete="off"
      placeholder="e.g. Product designer · Acme"
    />
    <p id="save-error" class="error" hidden={!saveError}>{saveError}</p>
    <div class="dialog-actions">
      <button type="button" class="button" onclick={() => saveDialog.close()}
        >Cancel</button
      ><button class="button primary" type="submit">Save version</button>
    </div>
  </form>
</dialog>
<dialog id="history-dialog" class="history-dialog" bind:this={historyDialog}>
  <div class="dialog-top">
    <h2>History</h2>
    <button
      class="icon-button"
      aria-label="Close history"
      onclick={() => historyDialog.close()}>×</button
    >
  </div>
  <div id="history-list">
    {#if historyError}<p class="error">
        {historyError}
      </p>{:else if !versions.length}<p class="text-sm text-stone-500">
        No saved versions yet. Use Save version to keep a named copy for later.
      </p>{:else}{#each versions as version (version.id)}<article
          class="mt-3 flex items-center justify-between gap-4 rounded-lg border border-stone-200 p-4"
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
              class="icon-button text-red-600"
              data-delete={version.id}
              aria-label={`Delete ${version.name}`}
              onclick={() => removeVersion(version.id)}>×</button
            >
          </div>
        </article>{/each}{/if}
  </div>
</dialog>
<dialog id="details-dialog" bind:this={detailsDialog}>
  <form id="details-form" onsubmit={applyDetails}>
    <div class="dialog-top">
      <h2>{details?.type === "dates" ? "Dates" : "Link"}</h2>
      <button
        class="icon-button"
        type="button"
        aria-label="Close details"
        onclick={() => detailsDialog.close()}>×</button
      >
    </div>
    <div id="details-fields">
      {#each details?.fields || [] as field}<label for={`detail-${field.name}`}
          >{field.label}</label
        ><input
          id={`detail-${field.name}`}
          name={field.name}
          type={field.type}
          bind:value={field.value}
        />{/each}
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
      onclick={() => shortcutsDialog.close()}>×</button
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
