<script lang="ts">
  import { DragOverlay, createDragDropMonitor } from "@dnd-kit/svelte";

  let markup = $state("");
  createDragDropMonitor({
    onBeforeDragStart(event) {
      const element = event.operation.source?.element;
      if (!element) {
        markup = "";
        return;
      }
      // Copy already-rendered, escaped Svelte content. The preview has no editable
      // fields, controls, identifiers or sortable attachments of its own.
      const copy = element.cloneNode(true) as HTMLElement;
      copy
        .querySelectorAll(".block-tools,.detail-button,.add-bullet,.add-entry")
        .forEach((node) => node.remove());
      for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
        for (const attribute of [...node.attributes]) {
          if (
            attribute.name.startsWith("data-") ||
            ["id", "popover", "contenteditable", "tabindex", "style"].includes(
              attribute.name,
            )
          )
            node.removeAttribute(attribute.name);
        }
        node.classList.remove("dragging", "drop-target", "selected");
      }
      markup = copy.outerHTML;
    },
  });
</script>

<DragOverlay dropAnimation={null}>
  {#snippet children()}
    <div class="drag-preview" inert>{@html markup}</div>
  {/snippet}
</DragOverlay>
