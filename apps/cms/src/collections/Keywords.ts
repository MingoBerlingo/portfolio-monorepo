import type { CollectionConfig } from 'payload'

export const Keywords: CollectionConfig = {
  slug: 'keywords',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'showInFooter', 'order'],
    description:
      'Reusable project keywords. Project assignments are stored in the CMS only; selected keywords appear as footer chips.',
  },
  access: { read: () => true },
  fields: [
    { name: 'label', type: 'text', required: true, unique: true, maxLength: 40 },
    { name: 'showInFooter', type: 'checkbox', defaultValue: true },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Lower numbers appear first in the footer.' },
    },
  ],
}
