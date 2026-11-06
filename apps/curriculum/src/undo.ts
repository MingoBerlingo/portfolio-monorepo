import { fingerprint, type CVDocument } from "./model.ts";

const MAX_STEPS = 100;
// Serialized snapshots avoid retaining mutable editor objects. UTF-16 strings
// are bounded to roughly 16 MiB across both history stacks.
const MAX_HISTORY_CHARS = 8 * 1024 * 1024;
const documentFrom = (snapshot: string): CVDocument => JSON.parse(snapshot);

export class UndoHistory {
  private current: string;
  private past: string[] = [];
  private future: string[] = [];
  private transaction: string | null = null;
  private group: string | undefined;
  private time = 0;

  constructor(doc: CVDocument) {
    this.current = fingerprint(doc);
  }
  get canUndo() {
    return this.transaction === null && this.past.length > 0;
  }
  get canRedo() {
    return this.transaction === null && this.future.length > 0;
  }

  private breakGroup() {
    this.group = undefined;
  }
  private bound() {
    while (this.past.length > MAX_STEPS) this.past.shift();
    while (this.future.length > MAX_STEPS) this.future.shift();
    let chars = [...this.past, ...this.future].reduce(
      (sum, s) => sum + s.length,
      0,
    );
    while (chars > MAX_HISTORY_CHARS) {
      const removed = this.past.length
        ? this.past.shift()
        : this.future.shift();
      if (removed === undefined) break;
      chars -= removed.length;
    }
  }

  record(doc: CVDocument, group?: string, now = Date.now()): void {
    const next = fingerprint(doc);
    if (this.transaction !== null) {
      this.current = next;
      return;
    }
    if (next === this.current) {
      if (!group) this.breakGroup();
      return;
    }
    const coalesce =
      group !== undefined &&
      group === this.group &&
      now >= this.time &&
      now - this.time <= 750;
    if (!coalesce) this.past.push(this.current);
    this.current = next;
    this.future = [];
    this.group = group;
    this.time = now;
    this.bound();
  }

  undo(): CVDocument | null {
    if (!this.canUndo) return null;
    this.future.push(this.current);
    this.current = this.past.pop()!;
    this.breakGroup();
    this.bound();
    return documentFrom(this.current);
  }

  redo(): CVDocument | null {
    if (!this.canRedo) return null;
    this.past.push(this.current);
    this.current = this.future.pop()!;
    this.breakGroup();
    this.bound();
    return documentFrom(this.current);
  }

  reset(doc: CVDocument): void {
    const next = fingerprint(doc);
    this.current = next;
    this.past = [];
    this.future = [];
    this.transaction = null;
    this.breakGroup();
  }

  begin(): void {
    if (this.transaction !== null) return;
    this.transaction = this.current;
    this.breakGroup();
  }

  commit(doc: CVDocument): void {
    const next = fingerprint(doc);
    if (this.transaction === null) {
      this.record(doc);
      return;
    }
    const start = this.transaction;
    this.transaction = null;
    this.current = start;
    this.record(documentFrom(next));
  }

  cancel(): CVDocument | null {
    if (this.transaction === null) return null;
    this.current = this.transaction;
    this.transaction = null;
    this.breakGroup();
    this.bound();
    return documentFrom(this.current);
  }
}
