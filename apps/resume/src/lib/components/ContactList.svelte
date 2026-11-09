<script lang="ts">
  import { DragDropProvider } from "@dnd-kit/svelte";
  import { isSortable } from "@dnd-kit/svelte/sortable";
  import type { ResumeDocument } from "../../types.ts";
  import { defaultContactEntries } from "../../model.ts";
  import { applyTextEdit } from "../../inline-model.ts";
  import DragPreview from "./DragPreview.svelte";
  import SortableBlock from "./SortableBlock.svelte";
  import Icon from "./Icon.svelte";
  import Editable from "./Editable.svelte";
  let {
    doc,
    disabled,
    selectedBlock = null,
    onchange,
    ondetails,
    onblockselect,
  }: {
    doc: ResumeDocument;
    disabled: boolean;
    selectedBlock?: string | null;
    onchange: (
      doc: ResumeDocument,
      meta?: { group?: string; transaction?: "begin" | "commit" | "cancel" },
    ) => void;
    ontext?: (path: string, value: string, line?: number) => void;
    ondetails: (type: "dates" | "link", path: string) => void;
    onblockselect?: (key: string | null) => void;
  } = $props();
  const entries = $derived(doc.contactEntries ?? defaultContactEntries(doc));
  let snapshot: ResumeDocument;
  function move(from: number, to: number) {
    if (to < 0 || to >= entries.length) return;
    const next = [...entries];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry);
    onchange({ ...doc, contactEntries: next });
    onblockselect?.(`contact:${entry.id}`);
  }
  function add() {
    ondetails("link", "contactEntries.new");
  }
  function text(path: string, value: string) {
    onchange(applyTextEdit({ ...doc, contactEntries: entries }, path, value), {
      group: "text:" + path,
    });
  }
</script>

<div class="contact">
  <DragDropProvider
    onDragStart={() => {
      snapshot = structuredClone(doc);
      onchange(doc, { transaction: "begin" });
    }}
    onDragOver={(event) => {
      const { source, target } = event.operation;
      if (
        isSortable(source) &&
        isSortable(target) &&
        source.index !== target.index
      )
        move(source.index, target.index);
    }}
    onDragEnd={(event) =>
      onchange(event.canceled ? snapshot : doc, {
        transaction: event.canceled ? "cancel" : "commit",
      })}
  >
    {#each entries as entry, index (entry.id)}
      <SortableBlock
        id={`contact-${entry.id}`}
        {index}
        group="contacts"
        path={entry.id}
        blockKey={`contact:${entry.id}`}
        label={`${entry.label || "Main info"} contact`}
        {disabled}
        selected={selectedBlock === `contact:${entry.id}`}
        onselect={() => onblockselect?.(`contact:${entry.id}`)}
        canMoveUp={index > 0}
        canMoveDown={index < entries.length - 1}
        onmove={(direction) => move(index, index + direction)}
        ondelete={() =>
          onchange({
            ...doc,
            contactEntries: entries.filter((row) => row.id !== entry.id),
          })}
      >
        <p>
          {#if entry.label}<span class="contact-label">{entry.label}:{" "}</span>
          {/if}<span
            class:contact-link={entry.kind === "link"}
            class="contact-value"
            ><Editable
              path={`contactEntries.${index}.text`}
              value={entry.text}
              label={entry.label || "Text"}
              {disabled}
              onchange={text}
            /></span
          ><button
            type="button"
            class="detail-button"
            data-details="link"
            data-path={`contactEntries.${index}`}
            aria-label="Edit entry"
            title="Edit entry"
            {disabled}
            onclick={() => ondetails("link", `contactEntries.${index}`)}
            ><Icon name="pen" /></button
          >
        </p>
      </SortableBlock>
    {/each}
    <DragPreview />
  </DragDropProvider>
  <button
    type="button"
    class="add-entry mt-2"
    data-add-contact
    {disabled}
    onclick={add}><Icon name="add" /> Add entry</button
  >
</div>
