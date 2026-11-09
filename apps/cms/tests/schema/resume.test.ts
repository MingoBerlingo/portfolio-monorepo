import { test, expect } from 'vitest'
import { Profile } from '../../src/globals/Profile'
import { Experiences } from '../../src/collections/Experiences'
import { Education } from '../../src/collections/Education'
import { Publications } from '../../src/collections/Publications'
import { Research } from '../../src/collections/Research'
import { migrateDocument, resumeEntries } from '../../scripts/canonical-resume-transform'

test('canonical schemas localize original fields and protect Resume-only data', () => {
  for (const schema of [Profile, Experiences, Education]) expect(schema.fields.some(f => 'name' in f && f.name === 'cvTranslation')).toBe(false)
  for (const name of ['phone', 'location', 'skills', 'languages', 'portfolio']) {
    const field = Profile.fields.find(f => 'name' in f && f.name === name) as any
    expect(field.access.read({ req: {} })).toBe(false)
    expect(field.access.read({ req: { user: {} } })).toBe(true)
  }
  expect(Profile.fields.some(f => 'name' in f && f.name === 'additionalInfo')).toBe(false)
  for (const schema of [Publications, Research]) expect((schema.access!.read as Function)({ req: {} })).toBe(false)
})

test('migration preserves source and localized values and is idempotent', () => {
  const source = { role: 'Designer', industries: [{ id: 'a', industry: 'Software' }], cvTranslation: { it: { role: 'Progettista', industries: 'Digitale\nRicerca' } } }
  const result = migrateDocument('experiences', source)
  expect(result.role).toEqual({ en: 'Designer', it: 'Progettista' })
  expect(result.industries).toEqual([{ id: 'a', industry: { en: 'Software', it: 'Digitale' } }, { industry: { it: 'Ricerca' } }])
  expect(result.cvTranslation).toEqual(source.cvTranslation)
  expect(migrateDocument('experiences', result)).toEqual(result)
})

test('presentation text becomes Lexical and resume rows retain both locales', () => {
  const result = migrateDocument('profile', { presentation: { root: { children: [] } }, cvTranslation: { it: { presentation: 'Ciao' } } })
  expect(result.presentation.it.root.children[0].children[0].text).toBe('Ciao')
  expect(resumeEntries({ publications: { en: [{ id: 'a', title: 'Paper' }], it: [{ id: 'a', title: 'Articolo' }] } }, 'publications')[0].title).toEqual({ en: 'Paper', it: 'Articolo' })
})

test('migration preserves canonical English source and native localized edits', () => {
  const source = { role: 'Original', cvTranslation: { en: { role: 'Resume English' }, it: { role: 'Italiano' } } }
  const migrated = migrateDocument('experiences', source)
  expect(migrated.role).toEqual({ en: 'Original', it: 'Italiano' })
  migrated.role.it = 'Edited canonical'
  expect(migrateDocument('experiences', migrated).role.it).toBe('Edited canonical')
})

test('migration retains unmatched localized publication rows', () => {
  const rows = resumeEntries({ publications: { en: [{ id: 'english', title: 'English' }], it: [{ id: 'italian', title: 'Italiano' }] } }, 'publications')
  expect(rows).toHaveLength(2)
  expect(rows.map(row => row.title)).toEqual([{ en: 'English' }, { it: 'Italiano' }])
})
