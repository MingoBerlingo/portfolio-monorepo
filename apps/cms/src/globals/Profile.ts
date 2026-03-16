import type { GlobalConfig } from 'payload'
import { linkFields } from '../fields/link'

export const Profile: GlobalConfig = {
  slug: 'profile',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'surname',
      type: 'text',
      required: true,
    },
    {
      name: 'jobPosition',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'github',
      type: 'group',
      fields: linkFields,
    },
    {
      name: 'linkedin',
      type: 'group',
      fields: linkFields,
    },
  ],
}
