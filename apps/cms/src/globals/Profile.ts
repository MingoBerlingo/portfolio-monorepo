import type { GlobalConfig } from 'payload'

const validateUrl = (val: string | null | undefined) => {
  if (val && !/^https?:\/\//.test(val)) {
    return 'Please enter a valid URL'
  }
  return true
}

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
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: validateUrl,
        },
      ],
    },
    {
      name: 'linkedin',
      type: 'group',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: validateUrl,
        },
      ],
    },
  ],
}
