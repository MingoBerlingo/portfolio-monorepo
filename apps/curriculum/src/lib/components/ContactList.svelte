<script lang="ts">
  import { DragDropProvider } from "@dnd-kit/svelte";
  import { isSortable } from "@dnd-kit/svelte/sortable";
  import type { CVDocument, ContactKey } from "../../types.ts";
  import SortableBlock from "./SortableBlock.svelte";
  import Icon from "./Icon.svelte";
  import Editable from "./Editable.svelte";
  let {
    doc,
    disabled,
    selectedBlock = null,
    onchange,
    ontext,
    ondetails,
    onblockselect,
  }: {
    doc: CVDocument;
    disabled: boolean;
    selectedBlock?: string | null;
    onchange: (
      doc: CVDocument,
      meta?: { transaction?: "begin" | "commit" | "cancel" },
    ) => void;
    ontext: (path: string, value: string, line?: number) => void;
    ondetails: (type: "dates" | "link", path: string) => void;
    onblockselect?: (key: string | null) => void;
  } = $props();
  const defaults: ContactKey[] = [
    "email",
    "phone",
    "location",
    "linkedin",
    "portfolio",
    "github",
  ];
  const labels = {
    email: "Mail",
    phone: "Tel",
    location: "Location",
    linkedin: "LinkedIn",
    portfolio: "Portfolio",
    github: "GitHub",
  };
  const visible = $derived(
    (doc.contactOrder ?? defaults).filter(
      (key) => !(doc.deletedContacts ?? []).includes(key),
    ),
  );
  let snapshot: CVDocument;
  function move(from: number, to: number) {
    if (to < 0 || to >= visible.length) return;
    const order = [...visible];
    const [key] = order.splice(from, 1);
    order.splice(to, 0, key);
    let i = 0;
    onchange({
      ...doc,
      contactOrder: (doc.contactOrder ?? defaults).map((key) =>
        visible.includes(key) ? order[i++] : key,
      ),
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
    {#each visible as key, index (key)}
      {@const isLink =
        key === "linkedin" || key === "portfolio" || key === "github"}
      {@const link = isLink
        ? doc.profile[key as "linkedin" | "portfolio" | "github"]
        : undefined}
      <SortableBlock
        id={`contact-${key}`}
        {index}
        group="contacts"
        path={key}
        blockKey={`contact:${key}`}
        label={`${labels[key]} contact`}
        {disabled}
        selected={selectedBlock === `contact:${key}`}
        onselect={() => onblockselect?.(`contact:${key}`)}
        canMoveUp={index > 0}
        canMoveDown={index < visible.length - 1}
        onmove={(direction) => move(index, index + direction)}
        ondelete={() =>
          onchange({
            ...doc,
            deletedContacts: [...(doc.deletedContacts ?? []), key],
          })}
      >
        <p>
          <span class="contact-label"
            >{key === "location" && doc.locale === "it"
              ? "Località"
              : labels[key]}:</span
          >
          <span
            class:contact-link={isLink}
            class:contact-value={key === "email" || key === "phone"}
          >
            <Editable
              path={isLink ? `profile.${key}.label` : `profile.${key}`}
              value={isLink
                ? link?.label || link?.url.replace(/^https?:\/\//i, "") || ""
                : String(doc.profile[key as "email" | "phone" | "location"])}
              label={labels[key]}
              {disabled}
              onchange={ontext}
            />
          </span>{#if isLink}<button
              class="detail-button"
              type="button"
              data-details="link"
              data-path={`profile.${key}`}
              {disabled}
              onclick={() => ondetails("link", `profile.${key}`)}
              aria-label="Edit link"
              title="Edit link"><Icon name="pen" /></button
            >{/if}
        </p>
      </SortableBlock>
    {/each}
  </DragDropProvider>
</div>
