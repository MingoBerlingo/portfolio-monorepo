import type { Field, GroupField } from 'payload'

/** Additive translations: original portfolio fields keep their existing storage. */
export const cvTranslation = (fields: Field[]): GroupField => ({
  name: 'cvTranslation',
  type: 'group',
  localized: true,
  admin: {
    description: 'CV translations. Original portfolio fields are English; fill these fields in Italian. Blank English overrides use the original fields.',
  },
  fields,
})
