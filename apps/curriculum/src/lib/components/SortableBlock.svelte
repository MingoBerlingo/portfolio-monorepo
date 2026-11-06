<script lang="ts">
  import { createSortable } from "@dnd-kit/svelte/sortable";
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
  data-section={section ? path : undefined}
  data-entry={!section ? path : undefined}
  onfocusin={onselect}
  onpointerdown={onselect}
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
      onfocus={onselect}>⠿</button
    >
    <button
      type="button"
      data-section-delete={section ? path : undefined}
      data-entry-delete={!section ? path : undefined}
      aria-label={`Delete ${label}`}
      title={`Delete ${label}`}
      class="delete-block"
      {disabled}
      onclick={ondelete}>×</button
    >
  </div>
  {@render children()}
</svelte:element>
