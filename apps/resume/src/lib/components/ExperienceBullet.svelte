<script lang="ts">
  import { createSortable } from "@dnd-kit/svelte/sortable";
  import Editable from "./Editable.svelte";
  import Icon from "./Icon.svelte";

  let { path, line, count, value, disabled, ontext, onsplit, onmerge, onmove }: {
    path: string;
    line: number;
    count: number;
    value: string;
    disabled: boolean;
    ontext: (path: string, value: string, line?: number) => void;
    onsplit: (path: string, line: number, offset: number) => void;
    onmerge: (path: string, line: number) => void;
    onmove: (from: number, to: number) => void;
  } = $props();

  const sortable = createSortable({
    get id() { return `${path}:${line}`; },
    get index() { return line; },
    get group() { return path; },
    get type() { return path; },
    get accept() { return path; },
    get disabled() { return disabled || count < 2; },
  });
</script>

<li {@attach sortable.attach} class="experience-bullet" class:bullet-drop-target={sortable.isDropTarget && !sortable.isDragSource}>
  <Editable {path} {value} label="Activity" {line} {disabled} onchange={ontext} {onsplit} {onmerge} />
  {#if count > 1}
    <div class="bullet-tools" role="group" aria-label={`Bullet ${line + 1} options`}>
      <button type="button" class="drag-handle" {@attach sortable.attachHandle} {disabled}
        aria-label={`Reorder bullet ${line + 1}`} title="Drag to reorder"><Icon name="drag" /></button>
      <button type="button" disabled={disabled || line === 0} onclick={() => onmove(line, line - 1)}
        aria-label={`Move bullet ${line + 1} up`} title="Move up"><Icon name="up" /></button>
      <button type="button" disabled={disabled || line === count - 1} onclick={() => onmove(line, line + 1)}
        aria-label={`Move bullet ${line + 1} down`} title="Move down"><Icon name="down" /></button>
    </div>
  {/if}
</li>
