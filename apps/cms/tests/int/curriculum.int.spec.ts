import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { beforeAll, afterAll, expect, it } from 'vitest'

let payload: Payload
const created: string[] = []
beforeAll(async () => { payload = await getPayload({ config: await config }) })
afterAll(async () => {
  for (const id of created) await payload.delete({ collection: 'experiences', id })
})

it('stores Italian CV translations without changing original portfolio values', async () => {
  const doc = await payload.create({
    collection: 'experiences', locale: 'en',
    data: {
      company: `Curriculum test ${Date.now()}`, role: 'Designer', startDate: '2020-01-01',
      industries: [{ industry: 'Software' }], activities: [{ activity: 'Build interfaces' }],
    },
  })
  created.push(doc.id)
  await payload.update({ collection: 'experiences', id: doc.id, locale: 'it', data: {
    cvTranslation: { role: 'Progettista', industries: 'Prodotti digitali', activities: 'Creo interfacce' },
  } })
  const italian = await payload.findByID({ collection: 'experiences', id: doc.id, locale: 'it', fallbackLocale: false })
  const english = await payload.findByID({ collection: 'experiences', id: doc.id, locale: 'en', fallbackLocale: false })
  expect(italian.role).toBe('Designer')
  expect(italian.cvTranslation?.role).toBe('Progettista')
  expect(english.role).toBe('Designer')
  expect(english.cvTranslation?.role).toBeFalsy()
})

it('denies anonymous API access to the private Curriculum global', async () => {
  await expect(payload.findGlobal({ slug: 'curriculum', overrideAccess: false })).rejects.toThrow()
})
