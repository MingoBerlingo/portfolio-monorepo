import type { CollectionConfig } from 'payload'

export const Education: CollectionConfig = {
  slug: 'education',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'details', localized: true, type: 'textarea', admin: { description: 'Optional education bullets, one per line in the selected language.' } },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'monthOnly',
          displayFormat: 'MM/yyyy',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'monthOnly',
          displayFormat: 'MM/yyyy',
        },
      },
    },
    {
      name: 'title', localized: true,
      type: 'text',
      required: true,
    },
    {
      name: 'grade',
      label: 'Graduation grade',
      localized: true,
      type: 'text',
      admin: { description: 'Optional. Shown beside the education title in Resume Studio only, for example 110 / 110 e lode.' },
    },
    {
      name: 'school',
      type: 'text',
      required: true,
    },
  ],
}
