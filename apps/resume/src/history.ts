import type { ResumeDocument, SavedVersion, VersionStorage } from "./types.ts";
import { MAX_DOCUMENT_BYTES, validateDocument } from "./model.ts";
export const HISTORY_KEY = "portfolio.curriculum.versions.v1";
export class VersionNameConflict extends Error {
  constructor(readonly versionId: string) {
    super("A version with this name already exists");
  }
}
const MAX_HISTORY_BYTES = 50 * 1024 * 1024 + 100000;
export const MAX_VERSION_IMPORT_BYTES = 2 * MAX_DOCUMENT_BYTES;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function validateVersion(value: unknown): asserts value is SavedVersion {
  const v = value as SavedVersion | null;
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).sort().join(",") !== "document,id,name,savedAt" ||
    typeof v.id !== "string" ||
    !v.id ||
    v.id.length > 160 ||
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name !== v.name.trim() ||
    v.name.length > 120 ||
    typeof v.savedAt !== "string" ||
    !Number.isFinite(Date.parse(v.savedAt)) ||
    new Date(v.savedAt).toISOString() !== v.savedAt
  )
    throw Error("Invalid saved resume version");
  validateDocument(v.document);
}
export function listVersions(
  storage: VersionStorage = globalThis.localStorage,
): SavedVersion[] {
  if (!storage || typeof storage.getItem !== "function")
    throw Error("Browser version storage is unavailable");
  const raw = storage.getItem(HISTORY_KEY);
  if (raw === null) return [];
  if (typeof raw !== "string" || raw.length > MAX_HISTORY_BYTES)
    throw Error("Saved Resume history is too large");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Error("Saved Resume history is not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length > 50)
    throw Error("Invalid saved resume history");
  const versions: SavedVersion[] = parsed.map((value) => {
    validateVersion(value);
    return value;
  });
  if (new Set(versions.map((v) => v.id)).size !== versions.length)
    throw Error("Duplicate saved resume version IDs");
  return versions;
}
export function saveVersion(
  storage: VersionStorage,
  document: ResumeDocument,
  name: string,
  now = Date.now(),
  resolution?: { replaceId: string } | "numbered",
): SavedVersion {
  validateDocument(document);
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120)
    throw Error("Enter a version name of 1–120 characters");
  if (
    typeof now !== "number" ||
    !Number.isFinite(now) ||
    !Number.isFinite(new Date(now).getTime())
  )
    throw Error("Invalid save date");
  const versions = listVersions(storage);
  const requestedName = name.trim();
  const conflict = versions.find((version) => version.name === requestedName);
  if (conflict && resolution === undefined)
    throw new VersionNameConflict(conflict.id);
  const replacement = typeof resolution === "object"
    ? versions.find((version) => version.id === resolution.replaceId && version.name === requestedName)
    : undefined;
  if (typeof resolution === "object" && !replacement)
    throw Error("The version to replace has changed. Choose how to save again");
  if (!replacement && versions.length >= 50)
    throw Error("History contains 50 versions; delete a version before saving");
  let savedName = requestedName;
  if (resolution === "numbered") {
    const base = requestedName.replace(/ \((?:[2-9]|[1-9]\d+)\)$/, "");
    const names = new Set(versions.map((version) => version.name));
    for (let number = 2; ; number++) {
      const suffix = ` (${number})`;
      savedName = base.slice(0, 120 - suffix.length).trimEnd() + suffix;
      if (!names.has(savedName)) break;
    }
  }
  const id =
    replacement?.id ?? globalThis.crypto?.randomUUID?.() ??
    `${now}-${Math.random().toString(36).slice(2)}`;
  const version = {
    id,
    name: savedName,
    savedAt: new Date(now).toISOString(),
    document: clone(document),
  };
  storage.setItem(HISTORY_KEY, JSON.stringify([version, ...versions.filter((entry) => entry.id !== id)]));
  return clone(version);
}
export function deleteVersion(storage: VersionStorage, id: string) {
  if (typeof id !== "string") throw Error("Invalid version ID");
  const versions = listVersions(storage);
  storage.setItem(
    HISTORY_KEY,
    JSON.stringify(versions.filter((v) => v.id !== id)),
  );
}

export function importVersion(storage: VersionStorage, json: string): SavedVersion {
  if (new TextEncoder().encode(json).length > MAX_VERSION_IMPORT_BYTES)
    throw Error("The JSON file is too large");
  const value: unknown = JSON.parse(json);
  validateVersion(value);
  const savedAt = Date.parse(value.savedAt);
  try {
    return saveVersion(storage, value.document, value.name, savedAt);
  } catch (error) {
    if (!(error instanceof VersionNameConflict)) throw error;
    return saveVersion(storage, value.document, value.name, savedAt, "numbered");
  }
}
