<script lang="ts">
  import { createSortable } from "@dnd-kit/svelte/sortable";
  import Icon from "./Icon.svelte";
  import type { Snippet } from "svelte";
  let {
    id,
    index,
    group,
    path,
    label,
    section = false,
    disabled = false,
    selected = false,
    blockKey,
    hidden = false,
    onmove,
    canMoveUp = true,
    canMoveDown = true,
    ontoggle,
    onselect,
    ondelete,
    children,
  }: {
    id: string;
    index: number;
    group: string;
    path: string;
    label: string;
    section?: boolean;
    disabled?: boolean;
    selected?: boolean;
    blockKey?: string;
    hidden?: boolean;
    onmove?: (direction: -1 | 1) => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    ontoggle?: () => void;
    onselect: () => void;
    ondelete: () => void;
    children: Snippet;
  } = $props();
  const sortable = createSortable({
    get id() {
      return id;
    },
    get index() {
      return index;
    },
    get group() {
      return group;
    },
    get type() {
      return group;
    },
    get accept() {
      return group;
    },
    get disabled() {
      return disabled;
    },
    transition: { duration: 180, easing: "cubic-bezier(0.2,0,0,1)" },
  });
</script>

<svelte:element
  this={section ? "section" : "article"}
  {@attach sortable.attach}
  class:section-block={section}
  class:entry-block={!section}
  class:dragging={sortable.isDragSource}
  class:drop-target={sortable.isDropTarget}
  class:selected
  class:section-hidden={hidden}
  data-block={blockKey ?? `${section ? "section" : "entry"}:${path}`}
  data-section={section ? path : undefined}
  data-entry={!section ? path : undefined}
  onfocusin={(event) => {
    if (
      (event.target as Element).closest("[data-block]") === event.currentTarget
    )
      onselect();
  }}
  onpointerdown={(event) => {
    if (
      (event.target as Element).closest("[data-block]") === event.currentTarget
    )
      onselect();
  }}
>
  <div
    class="block-tools"
    class:section-tools={section}
    aria-label={`${label} options`}
  >
    <button
      type="button"
      {@attach sortable.attachHandle}
      data-section-drag={section ? path : undefined}
      data-entry-drag={!section ? path : undefined}
      aria-label={`Reorder ${label}`}
      title="Drag to reorder. Press Space to pick up, arrows to move, Space to drop; Escape to cancel."
      class="drag-handle"
      {disabled}
      onfocus={onselect}><Icon name="drag" /></button
    >
    {#if onmove}
      <button
        type="button"
        data-move="up"
        aria-label={`Move ${label} up`}
        title="Move up"
        disabled={disabled || !canMoveUp}
        onclick={() => onmove?.(-1)}><Icon name="up" /></button
      >
      <button
        type="button"
        data-move="down"
        aria-label={`Move ${label} down`}
        title="Move down"
        disabled={disabled || !canMoveDown}
        onclick={() => onmove?.(1)}><Icon name="down" /></button
      >
    {/if}
    {#if ontoggle}<button
        type="button"
        data-toggle-visibility
        aria-label={`${hidden ? "Show" : "Hide"} ${label} in PDF`}
        title={hidden ? "Show in PDF" : "Hide from PDF"}
        {disabled}
        onclick={ontoggle}><Icon name={hidden ? "hidden" : "eye"} /></button
      >{/if}
    {#if !section}
      <button
        type="button"
        data-delete-block
        data-section-delete={section ? path : undefined}
        data-entry-delete={!section ? path : undefined}
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        class="delete-block"
        {disabled}
        onclick={ondelete}><Icon name="delete" /></button
      >
    {/if}
  </div>
  {@render children()}
</svelte:element>
