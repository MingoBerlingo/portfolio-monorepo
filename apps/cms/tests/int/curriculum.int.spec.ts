import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, afterAll, expect, it } from 'vitest'

let payload: Payload
const created: string[] = []
beforeAll(async () => { payload = await getPayload({ config: await config }) })
afterAll(async () => {
  for (const id of created) await payload.delete({ collection: 'experiences', id })
  await payload.destroy()
})

it('stores native Italian translations while preserving English and array row IDs', async () => {
  const doc = await payload.create({ collection: 'experiences', locale: 'en', data: {
    company: `Curriculum test ${Date.now()}`, role: 'Designer', startDate: '2020-01-01',
    industries: [{ industry: 'Software' }], activities: [{ activity: 'Build interfaces' }],
  } })
  created.push(doc.id)
  await payload.update({ collection: 'experiences', id: doc.id, locale: 'it', data: {
    role: 'Progettista', industries: [{ id: doc.industries[0].id, industry: 'Prodotti digitali' }],
    activities: [{ id: doc.activities[0].id, activity: 'Creo interfacce' }],
  } })
  const italian = await payload.findByID({ collection: 'experiences', id: doc.id, locale: 'it', fallbackLocale: false })
  const english = await payload.findByID({ collection: 'experiences', id: doc.id, locale: 'en', fallbackLocale: false })
  expect(italian.role).toBe('Progettista')
  expect(italian.activities[0].activity).toBe('Creo interfacce')
  expect(english.role).toBe('Designer')
  expect(english.activities[0].activity).toBe('Build interfaces')
})

it('hides private profile fields and independent CV collections from anonymous users', async () => {
  const profile = await payload.findGlobal({ slug: 'profile', overrideAccess: false })
  for (const name of ['phone', 'location', 'skills', 'languages', 'additionalInfo']) expect(profile).not.toHaveProperty(name)
  for (const collection of ['publications', 'research'] as const) {
    await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow()
  }
})
