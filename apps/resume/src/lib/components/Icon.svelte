<script lang="ts">
  import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";
  import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
  import View from "carbon-icons-svelte/lib/View.svelte";
  import ViewOff from "carbon-icons-svelte/lib/ViewOff.svelte";
  import Draggable from "carbon-icons-svelte/lib/Draggable.svelte";
  import Edit from "carbon-icons-svelte/lib/Edit.svelte";
  import Undo from "carbon-icons-svelte/lib/Undo.svelte";
  import Redo from "carbon-icons-svelte/lib/Redo.svelte";
  import Renew from "carbon-icons-svelte/lib/Renew.svelte";
  import Close from "carbon-icons-svelte/lib/Close.svelte";
  import Help from "carbon-icons-svelte/lib/Help.svelte";
  import Download from "carbon-icons-svelte/lib/Download.svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";
  import Subtract from "carbon-icons-svelte/lib/Subtract.svelte";

  const icons = {
    up: ChevronUp,
    down: ChevronDown,
    delete: TrashCan,
    eye: View,
    hidden: ViewOff,
    drag: Draggable,
    pen: Edit,
    undo: Undo,
    redo: Redo,
    refresh: Renew,
    close: Close,
    help: Help,
    download: Download,
    add: Add,
    check: Checkmark,
    subtract: Subtract,
  };
  let { name }: { name: keyof typeof icons } = $props();
  const Glyph = $derived(icons[name]);
</script>

<Glyph />
