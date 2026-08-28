import type { CollectionConfig } from 'payload'

export const Experiences: CollectionConfig = {
  slug: 'experiences',
  admin: {
    useAsTitle: 'company',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'company',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      required: true,
    },
    {
      type: 'row',
      fields: [
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
          admin: {
            description: 'Optional. Leave empty if this experience is still ongoing.',
            date: {
              pickerAppearance: 'monthOnly',
              displayFormat: 'MM/yyyy',
            },
          },
        },
      ],
    },
    {
      name: 'industries',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'industry',
        plural: 'industries',
      },
      fields: [
        {
          name: 'industry',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'activities',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'activity',
        plural: 'activities',
      },
      fields: [
        {
          name: 'activity',
          type: 'textarea',
          required: true,
          admin: {
            rows: 3,
          },
        },
      ],
    },
  ],
}
