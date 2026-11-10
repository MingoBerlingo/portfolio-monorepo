<script lang="ts">
  import { DragDropProvider } from "@dnd-kit/svelte";
  import { isSortable } from "@dnd-kit/svelte/sortable";
  import type { ComponentProps } from "svelte";
  import ExperienceBullet from "./ExperienceBullet.svelte";

  let { path, bullets, disabled, ontext, onsplit, onmerge, onreorder }: {
    path: string;
    bullets: string[];
    disabled: boolean;
    ontext: (path: string, value: string, line?: number) => void;
    onsplit: (path: string, line: number, offset: number) => void;
    onmerge: (path: string, line: number) => void;
    onreorder: (path: string, value: string) => void;
  } = $props();

  function move(from: number, to: number) {
    if (disabled || from === to || to < 0 || to >= bullets.length) return;
    const reordered = [...bullets];
    const [bullet] = reordered.splice(from, 1);
    reordered.splice(to, 0, bullet);
    onreorder(path, reordered.join("\n"));
  }

  const drop: ComponentProps<typeof DragDropProvider>["onDragEnd"] = (event) => {
    const { source, target } = event.operation;
    if (!event.canceled && isSortable(source) && isSortable(target))
      move(source.index, target.index);
  };
</script>

<DragDropProvider onDragEnd={drop}>
  <ul>
    {#each bullets as value, line}
      <ExperienceBullet {path} {line} count={bullets.length} {value} {disabled}
        {ontext} {onsplit} {onmerge} onmove={move} />
    {/each}
  </ul>
</DragDropProvider>
