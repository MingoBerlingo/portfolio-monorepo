/** Pure raw-storage transforms. Legacy fields intentionally remain for recovery. */
type Doc = Record<string, any>
const locales = ['en', 'it'] as const
const localized = (value: any): Doc => value && typeof value === 'object' && ('en' in value || 'it' in value) ? { ...value } : value == null ? {} : { en: value }
const lines = (value: string) => value.split(/\r?\n/).map(v => v.trim()).filter(Boolean)
export const lexical = (value: string) => ({ root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: value.split(/\r?\n/).map(text => ({ type: 'paragraph', version: 1, direction: null, format: '', indent: 0, textFormat: 0, textStyle: '', children: text ? [{ type: 'text', version: 1, text, format: 0, mode: 'normal', style: '', detail: 0 }] : [] })) } })
export function migrateDocument(kind: string, input: Doc): Doc {
  const doc = structuredClone(input)
  const fields = kind === 'profile' ? ['jobPosition', 'presentation'] : kind === 'experiences' ? ['role'] : ['title', 'details']
  for (const field of fields) {
    const values = localized(doc[field])
    for (const locale of locales) {
      const override = doc.cvTranslation?.[locale]?.[field]
      if (override != null && override !== '' && values[locale] == null) values[locale] = field === 'presentation' ? lexical(override) : override
    }
    if (Object.keys(values).length) doc[field] = values
  }
  if (kind === 'experiences') for (const [field, leaf] of [['industries', 'industry'], ['activities', 'activity']]) {
    const rows = (doc[field] || []).map((row: Doc) => ({ ...row, [leaf]: localized(row[leaf]) }))
    for (const locale of locales) {
      const override = doc.cvTranslation?.[locale]?.[field]
      if (typeof override !== 'string' || !override.trim()) continue
      lines(override).forEach((text, index) => {
        rows[index] ||= { [leaf]: {} }
        if (!rows[index][leaf][locale]) rows[index][leaf][locale] = text
      })
    }
    doc[field] = rows
  }
  return doc
}
export function curriculumEntries(curriculum: Doc, field: 'publications' | 'research'): Doc[] {
  const values = localized(curriculum[field]); const entries: Doc[] = []; const byKey = new Map<string, Doc>()
  for (const locale of locales) (values[locale] || []).forEach((row: Doc, index: number) => {
    const key = String(row.id || row._id || row.url || `index-${index}`)
    let entry = byKey.get(key)
    if (!entry) { entry = { migrationKey: `curriculum:${field}:${key}`, title: {}, description: {} }; entries.push(entry); byKey.set(key, entry) }
    for (const name of ['title', 'description']) if (row[name] != null) entry[name][locale] = row[name]
    for (const name of ['url', 'date', 'project']) if (row[name] != null && entry[name] == null) entry[name] = row[name]
  })
  return entries
}
export function profileCurriculumFields(profile: Doc, curriculum: Doc): Doc {
  const result = { ...profile }
  for (const field of ['phone', 'location', 'skills', 'languages', 'additionalInfo']) {
    if (curriculum[field] == null) continue
    if (['phone', 'location'].includes(field)) result[field] ??= curriculum[field]
    else result[field] = { ...localized(curriculum[field]), ...localized(profile[field]) }
  }
  return result
}
