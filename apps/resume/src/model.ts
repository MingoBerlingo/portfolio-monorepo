import type {
  ResumeDocument,
  ContactEntry,
  ContactKey,
  Locale,
  SectionKey,
} from "./types.ts";
export type * from "./types.ts";
type RecordValue = Record<string, unknown>;
/** Plain, bounded Resume documents shared by the editor, history and PDF endpoint. */
export const SECTION_ORDER = Object.freeze<SectionKey[]>([
  "introduction",
  "skills",
  "languages",
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
  throw new Error(`Invalid Resume document: ${message}`);
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
export function validateDocument(doc: unknown): ResumeDocument {
  bounded(doc);
  keys(doc, [
    "locale",
    "profile",
    ...Object.keys(entries),
    "sectionOrder",
    "hiddenSections",
    ...[
      "contactOrder",
      "deletedContacts",
      "deletedSections",
      "contactEntries",
      "customSections",
    ].filter((key) => object(doc) && Object.hasOwn(doc, key)),
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
  if (Object.hasOwn(doc, "contactEntries")) {
    if (!Array.isArray(doc.contactEntries) || doc.contactEntries.length > 200)
      fail("invalid contact entries");
    const ids = new Set<string>();
    for (const entry of doc.contactEntries) {
      keys(entry, ["id", "label", "text", "kind", "url"]);
      for (const key of ["id", "label", "text", "url"]) text(entry[key]);
      if (
        typeof entry.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,160}$/.test(entry.id) ||
        ids.has(entry.id)
      )
        fail("invalid contact entry identifier");
      if (entry.kind !== "text" && entry.kind !== "link")
        fail("invalid contact entry type");
      ids.add(entry.id);
    }
  }
  const customIds: string[] = [];
  if (Object.hasOwn(doc, "customSections")) {
    if (!Array.isArray(doc.customSections) || doc.customSections.length > 200)
      fail("invalid custom sections");
    for (const section of doc.customSections) {
      keys(section, ["id", "title", "content"]);
      text(section.title);
      text(section.content);
      if (
        typeof section.id !== "string" ||
        !/^custom-[a-zA-Z0-9_-]{1,150}$/.test(section.id) ||
        customIds.includes(section.id)
      )
        fail("invalid custom section identifier");
      customIds.push(section.id);
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
        : [...SECTION_ORDER, ...customIds];
    if (
      !Array.isArray(list) ||
      list.some((k) => !allowed.includes(k)) ||
      new Set(list).size !== list.length
    )
      fail(`invalid ${key}`);
  }
  const order = doc.sectionOrder as string[];
  const legacy = !order.includes("languages") &&
    ![doc.hiddenSections, doc.deletedSections].some((list) =>
      Array.isArray(list) && list.includes("languages"));
  if (order.length !== SECTION_ORDER.length + customIds.length - Number(legacy))
    fail("sectionOrder must include all sections");
  if (
    Object.hasOwn(doc, "contactOrder") &&
    (doc.contactOrder as unknown[]).length !== CONTACT_ORDER.length
  )
    fail("contactOrder must include all contacts");
  return doc as unknown as ResumeDocument;
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
/** Upgrade fixed contact fields to independent, editable rows without changing old saves. */
export function defaultContactEntries(doc: ResumeDocument): ContactEntry[] {
  const labels: Record<ContactKey, string> = {
    email: "Mail",
    phone: "Tel",
    location: doc.locale === "it" ? "Località" : "Location",
    linkedin: "LinkedIn",
    portfolio: "Portfolio",
    github: "GitHub",
  };
  return (doc.contactOrder ?? CONTACT_ORDER)
    .filter((key) => !(doc.deletedContacts ?? []).includes(key))
    .map((key) => {
      const value = doc.profile[key];
      const isLink =
        key === "linkedin" || key === "portfolio" || key === "github";
      const link = typeof value === "object" && value ? value : undefined;
      return {
        id: key,
        label: labels[key],
        text: isLink
          ? link?.label || link?.url.replace(/^https?:\/\//i, "") || ""
          : typeof value === "string"
            ? value
            : "",
        kind: isLink ? "link" : "text",
        url: link?.url || "",
      };
    });
}
export function normalizeResume(
  source: unknown = {},
  locale: Locale = object(source) &&
  (source.locale === "en" || source.locale === "it")
    ? source.locale
    : "en",
): ResumeDocument {
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
    if (!copy.sectionOrder.includes("languages")) {
      copy.sectionOrder.splice(copy.sectionOrder.indexOf("skills") + 1, 0, "languages");
      if (copy.hiddenSections.includes("skills")) copy.hiddenSections.push("languages");
      if (copy.deletedSections.includes("skills")) copy.deletedSections.push("languages");
    }
    copy.contactEntries ??= defaultContactEntries(copy);
    copy.customSections ??= [];
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
  // The editor and saved drafts use editable text. Format the CMS lists at import.
  const listText = (value: unknown, separator = ", ") => Array.isArray(value)
    ? value.map(string).map((item) => item.trim()).filter(Boolean).join(separator)
    : string(value);
  if (Array.isArray(p.languages)) doc.profile.languages = listText(p.languages);
  if (Array.isArray(p.digitalSkills) || Array.isArray(p.professionalSkills)) {
    doc.profile.skills = [listText(p.digitalSkills, "\n"), listText(p.professionalSkills, "\n")]
      .filter(Boolean)
      .join("\n");
  }
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
  doc.customSections = [];
  const normalized = validateDocument(doc);
  normalized.contactEntries = defaultContactEntries(normalized);
  return validateDocument(normalized);
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
export function fingerprint(document: ResumeDocument) {
  validateDocument(document);
  return JSON.stringify(stable(document));
}
export function isDirty(
  current: ResumeDocument,
  baseline: ResumeDocument | null | undefined,
) {
  return baseline == null || fingerprint(current) !== fingerprint(baseline);
}
