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
  import CvCanvas from "$lib/components/CvCanvas.svelte";
  let doc = $state.raw<CVDocument | null>(null),
    baseline = $state.raw<CVDocument | null>(null),
    locale = $state<Locale>("en"),
    selected = $state("profile"),
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
    detailsDialog: HTMLDialogElement;
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
    if (scroll) {
      const node =
        key === "profile"
          ? document.querySelector("#canvas header")
          : document.querySelector(`#canvas [data-section="${key}"]`);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  async function openSave() {
    versionName = name;
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
      doc = next;
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
  function restore(key: SectionKey) {
    if (doc)
      doc = {
        ...doc,
        hiddenSections: doc.hiddenSections.filter((k) => k !== key),
      };
    selected = key;
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
    window.addEventListener("beforeunload", unload);
    window.addEventListener("storage", storage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("storage", storage);
    };
  });
</script>

<svelte:head
  ><title>Curriculum Studio</title><meta
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
    ><span
      >Curriculum <span class="hidden font-normal text-stone-500 sm:inline"
        >Studio</span
      ></span
    >
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
  <div class="ml-auto flex gap-2">
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
      onclick={openSave}>Save version</button
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
                ? " (removed)"
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
          {#if selected !== "profile"}<label class="flex items-center gap-2"
              ><input
                id="section-visible"
                type="checkbox"
                checked={!doc.hiddenSections.includes(selected as SectionKey)}
                disabled={loading}
                onchange={(e) => {
                  if (!doc) return;
                  doc = {
                    ...doc,
                    hiddenSections: e.currentTarget.checked
                      ? doc.hiddenSections.filter((k) => k !== selected)
                      : [...doc.hiddenSections, selected as SectionKey],
                  };
                }}
              /> Include in PDF</label
            >{/if}
          {#if collections[selected]}<button
              type="button"
              class="add-entry"
              data-action="add"
              data-key={collections[selected]}
              disabled={loading}
              onclick={() => {
                if (doc) {
                  doc = addEntry(doc, collections[selected]);
                  doc = {
                    ...doc,
                    hiddenSections: doc.hiddenSections.filter(
                      (k) => k !== selected,
                    ),
                  };
                }
              }}>+ Add entry</button
            >{/if}
          {#each doc.hiddenSections.filter((k) => k !== "additional") as key}<button
              class="button"
              data-restore={key}
              disabled={loading}
              onclick={() => restore(key)}>Restore {titles[key]}</button
            >{/each}
        </div>
      </aside>
      {#key generation}<CvCanvas
          {doc}
          disabled={loading}
          {zoom}
          {selected}
          onchange={(v) => (doc = v)}
          onselect={(k) => (selected = k)}
          ondetails={openDetails}
          onerror={(m) => notify(m, true)}
        />{/key}
    </div>{:else}<div id="empty" class="py-24 text-center">
      <h1 class="mb-6 text-2xl">Curriculum</h1>
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
