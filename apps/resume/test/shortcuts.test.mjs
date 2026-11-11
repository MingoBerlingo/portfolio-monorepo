import { test } from "node:test";
import assert from "node:assert/strict";
import { shortcutFor } from "../src/shortcuts.ts";
const key = (key, extra = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...extra,
});
const canvas = { editing: false, dialog: false, selected: true };
test("document commands cover Mac and Windows while editing", () => {
  for (const mod of ["metaKey", "ctrlKey"]) {
    const c = { ...canvas, editing: true };
    assert.equal(shortcutFor(key("z", { [mod]: true }), c), "undo");
    assert.equal(
      shortcutFor(key("z", { [mod]: true, shiftKey: true }), c),
      "redo",
    );
    assert.equal(shortcutFor(key("s", { [mod]: true }), c), "save");
    assert.equal(
      shortcutFor(key("s", { [mod]: true, shiftKey: true }), c),
      "save-new",
    );
    assert.equal(
      shortcutFor(key("e", { [mod]: true, shiftKey: true }), c),
      "export",
    );
  }
});
test("single-key commands and block movement never activate while typing", () => {
  for (const k of ["h", "Backspace", "Delete", "?", "ArrowUp"])
    assert.equal(
      shortcutFor(key(k, { altKey: k === "ArrowUp" }), {
        ...canvas,
        editing: true,
      }),
      null,
    );
  assert.equal(shortcutFor(key("h"), canvas), "hide");
  assert.equal(shortcutFor(key("Delete"), canvas), "delete");
  assert.equal(
    shortcutFor(key("ArrowUp", { altKey: true }), canvas),
    "move-up",
  );
  assert.equal(
    shortcutFor(key("ArrowDown", { altKey: true }), canvas),
    "move-down",
  );
  assert.equal(shortcutFor(key("?"), canvas), "help");
});
test("modal, composition, repeats and absent selection do not activate document edits", () => {
  assert.equal(
    shortcutFor(key("z", { metaKey: true }), { ...canvas, dialog: true }),
    null,
  );
  assert.equal(
    shortcutFor(key("Escape"), { ...canvas, dialog: true }),
    "escape",
  );
  assert.equal(
    shortcutFor(key("Delete"), { ...canvas, selected: false }),
    null,
  );
  assert.equal(
    shortcutFor(key("s", { ctrlKey: true, isComposing: true }), canvas),
    null,
  );
  assert.equal(shortcutFor(key("Delete", { repeat: true }), canvas), null);
  assert.equal(
    shortcutFor(key("z", { altKey: true, metaKey: true }), canvas),
    null,
  );
});
