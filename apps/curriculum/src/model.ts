import type { CVDocument, ContactKey, Locale, SectionKey } from "./types.ts";
export type * from "./types.ts";
type RecordValue = Record<string, unknown>;
/** Plain, bounded CV documents shared by the editor, history and PDF endpoint. */
export const SECTION_ORDER = Object.freeze<SectionKey[]>([
  "introduction",
  "skills",
  "experience",
  "education",
  "publications",
  "research",
  "additional",
]);
export const CONTACT_ORDER = Object.freeze<ContactKey[]>([
  "email",
  "phone",
  "location",
  "linkedin",
  "portfolio",
  "github",
]);
export const MAX_DOCUMENT_BYTES = 1024 * 1024;
const profileFields = [
  "name",
  "surname",
  "jobPosition",
  "presentation",
  "email",
  "phone",
  "location",
  "skills",
  "languages",
  "additionalInfo",
];
const entries = {
  experiences: [
    "company",
    "role",
    "startDate",
    "endDate",
    "industries",
    "activities",
  ],
  education: ["title", "school", "startDate", "endDate", "details"],
  publications: ["title", "description", "url"],
  research: ["title", "date", "description", "url", "project"],
};
const object = (v: unknown): v is RecordValue =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype ||
    Object.getPrototypeOf(v) === null);
function fail(message: string): never {
  throw new Error(`Invalid CV document: ${message}`);
}
const string = (v: unknown): string => (typeof v === "string" ? v : "");
function bounded(value: unknown) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch {
    fail("must be serializable");
  }
  if (!json || new TextEncoder().encode(json).length > MAX_DOCUMENT_BYTES)
    fail("exceeds 1 MB");
}
function text(value: unknown) {
  if (typeof value !== "string" || value.length > 50000)
    fail("text must be a string of at most 50000 characters");
}
function keys(value: unknown, allowed: string[]): asserts value is RecordValue {
  if (
    !object(value) ||
    Object.keys(value).some((k) => !allowed.includes(k)) ||
    allowed.some((k) => !Object.hasOwn(value, k))
  )
    fail("unexpected or missing fields");
}
export function validateDocument(doc: unknown): CVDocument {
  bounded(doc);
  keys(doc, [
    "locale",
    "profile",
    ...Object.keys(entries),
    "sectionOrder",
    "hiddenSections",
    ...["contactOrder", "deletedContacts", "deletedSections"].filter(
      (key) => object(doc) && Object.hasOwn(doc, key),
    ),
  ]);
  if (doc.locale !== "en" && doc.locale !== "it") fail("unsupported locale");
  if (!object(doc.profile)) fail("invalid profile");
  const profile: RecordValue = doc.profile;
  keys(profile, [
    ...profileFields,
    "github",
    "linkedin",
    ...(Object.hasOwn(profile, "portfolio") ? ["portfolio"] : []),
  ]);
  profileFields.forEach((k) => text(profile[k]));
  for (const k of [
    "github",
    "linkedin",
    ...(Object.hasOwn(profile, "portfolio") ? ["portfolio"] : []),
  ]) {
    const value = profile[k];
    keys(value, ["label", "url"]);
    text(value.label);
    text(value.url);
  }
  for (const [key, fields] of Object.entries(entries)) {
    const list = doc[key];
    if (!Array.isArray(list) || list.length > 200)
      fail(`${key} must contain at most 200 entries`);
    for (const entry of list) {
      keys(entry, fields);
      fields.forEach((k) => text(entry[k]));
    }
  }
  for (const key of [
    "sectionOrder",
    "hiddenSections",
    "deletedSections",
    "contactOrder",
    "deletedContacts",
  ]) {
    if (!Object.hasOwn(doc, key)) continue;
    const list = doc[key];
    const allowed: readonly string[] =
      key === "contactOrder" || key === "deletedContacts"
        ? CONTACT_ORDER
        : SECTION_ORDER;
    if (
      !Array.isArray(list) ||
      list.some((k) => !allowed.includes(k)) ||
      new Set(list).size !== list.length
    )
      fail(`invalid ${key}`);
  }
  if ((doc.sectionOrder as unknown[]).length !== SECTION_ORDER.length)
    fail("sectionOrder must include all sections");
  if (
    Object.hasOwn(doc, "contactOrder") &&
    (doc.contactOrder as unknown[]).length !== CONTACT_ORDER.length
  )
    fail("contactOrder must include all contacts");
  return doc as unknown as CVDocument;
}
function lexical(value: unknown, depth = 0): string {
  if (depth > 40) fail("rich text nesting too deep");
  if (!object(value)) return "";
  if (value.type === "linebreak") return "\n";
  if (typeof value.text === "string") return value.text;
  const children = Array.isArray(value.children) ? value.children : [];
  return children
    .map(
      (child) =>
        lexical(child, depth + 1) +
        (["paragraph", "listitem", "heading", "quote"].includes(
          (object(child) ? child.type : "") as string,
        )
          ? "\n"
          : ""),
    )
    .join("");
}
function multiline(value: unknown, field = "") {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value
      .map((v) =>
        typeof v === "string" ? v : string(object(v) ? v[field] : undefined),
      )
      .join("\n");
  if (object(value)) return lexical(value.root ?? value).replace(/\n$/, "");
  return "";
}
const link = (value?: unknown) => ({
  label: string(object(value) ? value.label : undefined),
  url: string(object(value) ? value.url : undefined),
});
export function normalizeCV(
  source: unknown = {},
  locale: Locale = object(source) &&
  (source.locale === "en" || source.locale === "it")
    ? source.locale
    : "en",
): CVDocument {
  bounded(source);
  if (!object(source)) fail("source must be an object");
  if (
    source.sectionOrder !== undefined ||
    source.hiddenSections !== undefined
  ) {
    const copy = structuredClone(validateDocument(source));
    copy.profile.portfolio ??= link();
    copy.contactOrder ??= [...CONTACT_ORDER];
    copy.deletedContacts ??= [];
    copy.deletedSections ??= [];
    return copy;
  }
  const p = object(source.profile) ? source.profile : {};
  const doc: Record<string, unknown> & { profile: RecordValue } = {
    locale,
    profile: Object.fromEntries(
      profileFields.map((k) => [
        k,
        k === "presentation" ? multiline(p[k]) : string(p[k]),
      ]),
    ),
  };
  doc.profile.github = link(p.github);
  doc.profile.linkedin = link(p.linkedin);
  doc.profile.portfolio = link(p.portfolio);
  for (const [key, fields] of Object.entries(entries)) {
    const raw = source[key];
    const sourceEntries = (object(raw) ? raw.docs : undefined) ?? raw ?? [];
    if (!Array.isArray(sourceEntries) || sourceEntries.length > 200)
      fail(`invalid ${key}`);
    doc[key] = sourceEntries.map((rawEntry) => {
      const entry = object(rawEntry) ? rawEntry : {};
      return Object.fromEntries(
        fields.map((k) => [
          k,
          ["industries", "activities", "details"].includes(k)
            ? multiline(
                entry?.[k],
                k === "industries" ? "industry" : "activity",
              )
            : k === "project" && object(entry?.[k])
              ? string(entry[k].title)
              : string(entry?.[k]),
        ]),
      );
    });
  }
  doc.sectionOrder = [...SECTION_ORDER];
  doc.hiddenSections = [];
  doc.contactOrder = [...CONTACT_ORDER];
  doc.deletedContacts = [];
  doc.deletedSections = [];
  return validateDocument(doc);
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (object(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable(value[k])]),
    );
  return value;
}
export function fingerprint(document: CVDocument) {
  validateDocument(document);
  return JSON.stringify(stable(document));
}
export function isDirty(
  current: CVDocument,
  baseline: CVDocument | null | undefined,
) {
  return baseline == null || fingerprint(current) !== fingerprint(baseline);
}
