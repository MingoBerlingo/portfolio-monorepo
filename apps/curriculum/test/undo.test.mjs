import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCV } from "../src/model.ts";
import { UndoHistory } from "../src/undo.ts";
const doc = (name = "") => normalizeCV({ profile: { name } });
test("first edit, coalesced typing, field changes and timing form undo steps", () => {
  const h = new UndoHistory(doc());
  h.record(doc("a"), "name", 0);
  h.record(doc("ab"), "name", 750);
  h.record(doc("abc"), "name", 1501);
  assert.equal(h.undo().profile.name, "ab");
  assert.equal(h.undo().profile.name, "");
  assert.equal(h.undo(), null);
});
test("structural edits break coalescing and new edits invalidate redo", () => {
  const h = new UndoHistory(doc());
  h.record(doc("a"), "name", 0);
  h.record(doc("b"));
  h.record(doc("c"), "name", 1);
  assert.equal(h.undo().profile.name, "b");
  assert.equal(h.undo().profile.name, "a");
  assert.equal(h.redo().profile.name, "b");
  h.record(doc("d"));
  assert.equal(h.canRedo, false);
  assert.equal(h.redo(), null);
});
test("snapshots are independent and no-op edits preserve redo", () => {
  const initial = doc();
  const h = new UndoHistory(initial);
  initial.profile.name = "mutated";
  const edited = doc("a");
  h.record(edited);
  edited.profile.name = "mutated";
  const result = h.undo();
  assert.equal(result.profile.name, "");
  result.profile.name = "mutated";
  h.record(doc());
  assert.equal(h.canRedo, true);
  assert.equal(h.redo().profile.name, "a");
  assert.equal(h.undo().profile.name, "");
});
test("drag transactions commit once, cancel restores, and no-op adds nothing", () => {
  const h = new UndoHistory(doc());
  h.begin();
  h.record(doc("a"));
  h.record(doc("b"));
  assert.equal(h.undo(), null);
  assert.equal(h.redo(), null);
  h.commit(doc("c"));
  assert.equal(h.undo().profile.name, "");
  h.redo();
  h.begin();
  h.record(doc("d"));
  assert.equal(h.cancel().profile.name, "c");
  assert.equal(h.undo().profile.name, "");
  h.redo();
  h.begin();
  h.commit(doc("c"));
  assert.equal(h.undo().profile.name, "");
  assert.equal(h.undo(), null);
});
test("reset clears transactions and all history; documents are validated", () => {
  const h = new UndoHistory(doc());
  h.record(doc("a"));
  h.begin();
  h.reset(doc("reset"));
  assert.equal(h.canUndo, false);
  assert.equal(h.canRedo, false);
  assert.equal(h.cancel(), null);
  h.record(doc("next"));
  assert.equal(h.undo().profile.name, "reset");
  assert.throws(() => h.record({}));
  assert.throws(() => new UndoHistory({}));
});
test("history retains at most 100 undo steps", () => {
  const h = new UndoHistory(doc());
  for (let i = 1; i <= 120; i++) h.record(doc(String(i)));
  let count = 0;
  let oldest;
  while (h.canUndo) {
    oldest = h.undo();
    count++;
  }
  assert.equal(count, 100);
  assert.equal(oldest.profile.name, "20");
});

test("different typing fields form separate steps", () => {
  const h = new UndoHistory(doc());
  h.record(doc("a"), "name", 0);
  h.record(doc("b"), "surname", 1);
  assert.equal(h.undo().profile.name, "a");
  assert.equal(h.undo().profile.name, "");
});
test("large snapshots also obey a practical memory bound", () => {
  const initial = doc();
  for (const key of ["presentation", "skills", "languages", "additionalInfo"])
    initial.profile[key] = "x".repeat(50000);
  const h = new UndoHistory(initial);
  for (let i = 0; i < 60; i++) {
    const next = structuredClone(initial);
    next.profile.name = String(i);
    h.record(next);
  }
  let count = 0;
  while (h.canUndo) {
    h.undo();
    count++;
  }
  assert.ok(count > 0 && count < 60);
});
