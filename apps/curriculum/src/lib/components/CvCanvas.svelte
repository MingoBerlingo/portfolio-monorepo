<script lang="ts">
  import { DragDropProvider } from "@dnd-kit/svelte";
  import { isSortable } from "@dnd-kit/svelte/sortable";
  import { onMount, type ComponentProps } from "svelte";
  import type { CVDocument, SectionKey, CollectionKey } from "../../types.ts";
  import {
    applyTextEdit,
    splitBullet,
    mergeBullet,
    addEntry,
    removeEntry,
  } from "../../inline-model.ts";
  import SortableBlock from "./SortableBlock.svelte";
  import EntryList from "./EntryList.svelte";
  import ContactList from "./ContactList.svelte";
  import Editable from "./Editable.svelte";
  type Props = ComponentProps<typeof DragDropProvider>;
  let {
    doc,
    disabled = false,
    zoom = "fit",
    selected = "profile",
    selectedBlock = null,
    onblockselect,
    onchange,
    onselect,
    ondetails,
    onerror,
  }: {
    doc: CVDocument;
    disabled?: boolean;
    zoom?: string;
    selected?: string;
    selectedBlock?: string | null;
    onblockselect?: (key: string | null) => void;
    onchange: (
      v: CVDocument,
      meta?: { group?: string; transaction?: "begin" | "commit" | "cancel" },
    ) => void;
    onselect: (v: string) => void;
    ondetails: (type: "dates" | "link", path: string) => void;
    onerror: (message: string) => void;
  } = $props();
  const titles: Record<SectionKey, string> = {
    introduction: "Introduction",
    skills: "Skills and competencies",
    experience: "Work experience",
    education: "Education",
    publications: "Publications",
    research: "Research projects",
    additional: "Additional information",
  };
  const it: Record<SectionKey, string> = {
    introduction: "Introduzione",
    skills: "Capacità e competenze",
    experience: "Esperienza lavorativa",
    education: "Istruzione",
    publications: "Pubblicazioni",
    research: "Progetti di ricerca",
    additional: "Altre informazioni",
  };
  const collections: Partial<Record<SectionKey, CollectionKey>> = {
    experience: "experiences",
    education: "education",
    publications: "publications",
    research: "research",
  };
  let pane: HTMLDivElement,
    paper: HTMLDivElement,
    width = $state(834),
    height = $state(1163),
    snapshot: SectionKey[] = [];
  const scale = $derived(
    zoom === "fit" ? Math.min(1, width / 834) : Number(zoom),
  );
  const visible: SectionKey[] = $derived(
    doc.sectionOrder.filter(
      (k: SectionKey) =>
        k !== "additional" && !(doc.deletedSections ?? []).includes(k),
    ),
  );
  onMount(() => {
    const o = new ResizeObserver(() => {
      width = pane.clientWidth;
      height = paper.offsetHeight;
    });
    o.observe(pane);
    o.observe(paper);
    return () => o.disconnect();
  });
  function text(path: string, value: string, line?: number) {
    try {
      onchange(applyTextEdit(doc, path, value, line), {
        group: "text:" + path + (line === undefined ? "" : `:${line}`),
      });
    } catch (e) {
      onerror(e instanceof Error ? e.message : "Unable to edit");
    }
  }
  function split(p: string, l: number, o: number) {
    onchange(splitBullet(doc, p, l, o));
  }
  function merge(p: string, l: number) {
    onchange(mergeBullet(doc, p, l));
  }
  function reorder(key: CollectionKey, from: number, to: number) {
    const next = structuredClone(doc);
    const list = next[key];
    const [entry] = list.splice(from, 1);
    (list as (typeof entry)[]).splice(to, 0, entry);
    onchange(next);
  }
  function remove(key: SectionKey) {
    onchange({
      ...doc,
      deletedSections: [...(doc.deletedSections ?? []), key],
    });
  }
  const over: Props["onDragOver"] = (event) => {
    const { source, target } = event.operation;
    if (
      !isSortable(source) ||
      !isSortable(target) ||
      source.index === target.index
    )
      return;
    const next = [...visible];
    const [moved] = next.splice(source.index, 1);
    next.splice(target.index, 0, moved);
    let n = 0;
    onchange({
      ...doc,
      sectionOrder: doc.sectionOrder.map((k: SectionKey) =>
        visible.includes(k) ? next[n++] : k,
      ),
    });
  };
  const end: Props["onDragEnd"] = (event) => {
    onchange(event.canceled ? { ...doc, sectionOrder: snapshot } : doc, {
      transaction: event.canceled ? "cancel" : "commit",
    });
  };
</script>

<div
  id="canvas-pane"
  class="min-w-0 overflow-x-auto pb-8"
  class:opacity-60={disabled}
  bind:this={pane}
>
  <div
    id="canvas-wrap"
    class="relative mx-auto"
    style:width={`${834 * scale}px`}
    style:height={`${height * scale}px`}
  >
    <div
      id="canvas"
      role="group"
      aria-label="Editable CV layout"
      class="origin-top-left p-5"
      bind:this={paper}
      style:width="834px"
      style:transform={`scale(${scale})`}
    >
      <main class="cv-paper" lang={doc.locale}>
        <header onfocusin={() => onselect("profile")}>
          <h1>
            <Editable
              path="profile.name"
              value={doc.profile.name}
              label="Name"
              {disabled}
              onchange={text}
            />
            <Editable
              path="profile.surname"
              value={doc.profile.surname}
              label="Surname"
              {disabled}
              onchange={text}
            />
          </h1>
          <p class="role">
            <Editable
              path="profile.jobPosition"
              value={doc.profile.jobPosition}
              label="Job position"
              {disabled}
              onchange={text}
            />
          </p>
          <ContactList
            {doc}
            {disabled}
            {selectedBlock}
            {onblockselect}
            {onchange}
            ontext={text}
            {ondetails}
          />
        </header>
        <DragDropProvider
          onDragStart={() => {
            snapshot = [...doc.sectionOrder];
            onchange(doc, { transaction: "begin" });
          }}
          onDragOver={over}
          onDragEnd={end}
        >
          {#each visible as key, index (key)}
            <SortableBlock
              id={key}
              {index}
              group="sections"
              path={key}
              label={`${titles[key]} section`}
              section
              {disabled}
              selected={selectedBlock === `section:${key}`}
              hidden={doc.hiddenSections.includes(key)}
              ontoggle={() =>
                onchange({
                  ...doc,
                  hiddenSections: doc.hiddenSections.includes(key)
                    ? doc.hiddenSections.filter((k) => k !== key)
                    : [...doc.hiddenSections, key],
                })}
              canMoveUp={index > 0}
              canMoveDown={index < visible.length - 1}
              onmove={(direction) => {
                const order = [...doc.sectionOrder];
                const from = order.indexOf(key);
                const to = order.indexOf(visible[index + direction]);
                [order[from], order[to]] = [order[to], order[from]];
                onchange({ ...doc, sectionOrder: order });
              }}
              onselect={() => {
                onselect(key);
                onblockselect?.(`section:${key}`);
              }}
              ondelete={() => remove(key)}
            >
              <h2>{doc.locale === "it" ? it[key] : titles[key]}</h2>
              <div class="section-body">
                {#if key === "introduction"}<Editable
                    tag="div"
                    path="profile.presentation"
                    value={doc.profile.presentation}
                    label={doc.locale === "it"
                      ? "Introduzione"
                      : "Introduction"}
                    multiline
                    {disabled}
                    onchange={text}
                  />
                {:else if key === "skills"}<p>
                    <strong
                      >{doc.locale === "it" ? "Lingue" : "Languages"}:</strong
                    >
                    <Editable
                      path="profile.languages"
                      value={doc.profile.languages}
                      label="Languages"
                      {disabled}
                      onchange={text}
                    />
                  </p>
                  <Editable
                    tag="div"
                    path="profile.skills"
                    value={doc.profile.skills}
                    label="Skills and competencies"
                    multiline
                    formatLabels
                    {disabled}
                    onchange={text}
                  />
                {:else if collections[key]}<EntryList
                    {doc}
                    collection={collections[key]!}
                    active={selected === key}
                    {selectedBlock}
                    {onblockselect}
                    ontransaction={(transaction) =>
                      onchange(doc, { transaction })}
                    {disabled}
                    onchange={reorder}
                    ontext={text}
                    onsplit={split}
                    onmerge={merge}
                    {ondetails}
                    onadd={(c) => onchange(addEntry(doc, c))}
                    onremove={(c, i) => onchange(removeEntry(doc, c, i))}
                  />{/if}
              </div>
            </SortableBlock>
          {/each}
        </DragDropProvider>
      </main>
    </div>
  </div>
</div>
