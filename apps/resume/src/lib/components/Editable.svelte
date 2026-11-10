<script lang="ts">
  import { tick } from "svelte";
  let {
    path,
    value,
    label,
    multiline = false,
    formatLabels = false,
    line,
    tag = "span",
    disabled = false,
    onchange,
    onsplit,
    onmerge,
  }: {
    path: string;
    value: string;
    label: string;
    multiline?: boolean;
    formatLabels?: boolean;
    line?: number;
    tag?: "span" | "div" | "li";
    disabled?: boolean;
    onchange: (path: string, value: string, line?: number) => void;
    onsplit?: (path: string, line: number, offset: number) => void;
    onmerge?: (path: string, line: number) => void;
  } = $props();
  let node: HTMLElement;
  function sync() {
    if (!node || document.activeElement === node) return;
    if (formatLabels) {
      const nodes: Node[] = [];
      value.split("\n").forEach((line: string, i: number) => {
        if (i) nodes.push(document.createTextNode("\n"));
        const colon = line.indexOf(":");
        if (colon < 0) nodes.push(document.createTextNode(line));
        else {
          const strong = document.createElement("strong");
          strong.textContent = line.slice(0, colon + 1);
          nodes.push(strong, document.createTextNode(line.slice(colon + 1)));
        }
      });
      node.replaceChildren(...nodes);
    } else if (node.textContent !== value) node.textContent = value;
  }
  $effect(() => {
    void value;
    sync();
  });
  function input() {
    onchange(
      path,
      multiline
        ? node.innerText.replace(/\r\n?/g, "\n")
        : (node.textContent || "").replace(/[\r\n]+/g, " "),
      line,
    );
  }
  function offset() {
    const s = window.getSelection();
    if (!s?.rangeCount) return 0;
    const r = s.getRangeAt(0).cloneRange();
    r.selectNodeContents(node);
    r.setEnd(s.anchorNode!, s.anchorOffset);
    return r.toString().length;
  }
  async function keydown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key === "Enter" && line !== undefined) {
      e.preventDefault();
      if (!window.getSelection()?.isCollapsed) document.execCommand("delete");
      input();
      onsplit?.(path, line, offset());
      await tick();
      focusLine(line + 1, 0);
    } else if (
      e.key === "Backspace" &&
      line !== undefined &&
      line > 0 &&
      window.getSelection()?.isCollapsed &&
      offset() === 0
    ) {
      e.preventDefault();
      const previous = document.querySelector<HTMLElement>(
        `[data-field="${path}"][data-line="${line - 1}"]`,
      );
      const at = previous?.textContent?.length || 0;
      input();
      onmerge?.(path, line);
      await tick();
      focusLine(line - 1, at);
    } else if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      node.blur();
    }
  }
  function focusLine(index: number, at: number) {
    const el = document.querySelector<HTMLElement>(
      `[data-field="${path}"][data-line="${index}"]`,
    );
    if (!el) return;
    el.focus();
    const r = document.createRange();
    if (el.firstChild) {
      r.setStart(
        el.firstChild,
        Math.min(at, el.firstChild.textContent?.length || 0),
      );
    } else r.selectNodeContents(el);
    r.collapse(true);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }
  function paste(e: ClipboardEvent) {
    e.preventDefault();
    let text = e.clipboardData?.getData("text/plain") || "";
    if (!multiline) text = text.replace(/[\r\n]+/g, " ");
    document.execCommand("insertText", false, text);
  }
</script>

<svelte:element
  this={tag}
  bind:this={node}
  contenteditable={disabled ? "false" : "plaintext-only"}
  role="textbox"
  tabindex={disabled ? -1 : 0}
  aria-label={label}
  aria-multiline={multiline || undefined}
  data-field={path}
  data-line={line}
  data-multiline={multiline || undefined}
  data-placeholder={label}
  oninput={input}
  onkeydown={keydown}
  onpaste={paste}
  onblur={sync}
/>
