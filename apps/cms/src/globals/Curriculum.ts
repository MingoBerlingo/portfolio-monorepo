import type { GlobalConfig } from 'payload'

export const Curriculum: GlobalConfig = {
  slug: 'curriculum',
  label: 'Curriculum (local export)',
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'phone', type: 'text' },
    { name: 'location', type: 'text' },
    { name: 'skills', type: 'textarea', localized: true },
    { name: 'languages', type: 'textarea', localized: true },
    { name: 'additionalInfo', type: 'textarea', localized: true },
    {
      name: 'publications', type: 'array', localized: true,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'url', type: 'text' },
      ],
    },
    {
      name: 'research', type: 'array', localized: true,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'date', type: 'date' },
        { name: 'description', type: 'textarea' },
        { name: 'url', type: 'text' },
        { name: 'project', type: 'relationship', relationTo: 'project', admin: {
          description: 'Optional link to the corresponding portfolio project; title/description above are the concise CV text.',
        } },
      ],
    },
  ],
}
