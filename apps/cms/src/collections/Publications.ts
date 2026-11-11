import type { CollectionConfig } from 'payload'

export const Publications: CollectionConfig = {
  slug: 'publications',
  admin: { useAsTitle: 'title' },
  access: { read: ({ req }) => Boolean(req.user) },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'url', type: 'text' },
  ],
}
