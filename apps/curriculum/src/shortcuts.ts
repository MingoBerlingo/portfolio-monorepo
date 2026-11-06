export type Shortcut =
  | "undo"
  | "redo"
  | "save"
  | "save-new"
  | "export"
  | "move-up"
  | "move-down"
  | "hide"
  | "delete"
  | "escape"
  | "help";
export interface KeyInput {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
  repeat?: boolean;
}
export function shortcutFor(
  event: KeyInput,
  context: { editing: boolean; dialog: boolean; selected: boolean },
): Shortcut | null {
  if (event.isComposing || event.repeat) return null;
  const key = event.key.toLowerCase(),
    mod = event.metaKey || event.ctrlKey;
  if (key === "escape") return "escape";
  if (mod && !event.altKey && key === "s")
    return event.shiftKey ? "save-new" : "save";
  if (context.dialog) return null;
  if (mod && !event.altKey) {
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y" && event.ctrlKey) return "redo";
    if (key === "e" && event.shiftKey) return "export";
    return null;
  }
  if (context.editing) return null;
  if (!mod && event.altKey && context.selected) {
    if (key === "arrowup") return "move-up";
    if (key === "arrowdown") return "move-down";
  }
  if (mod || event.altKey) return null;
  if (key === "?") return "help";
  if (context.selected) {
    if (key === "h") return "hide";
    if (key === "delete" || key === "backspace") return "delete";
  }
  return null;
}
