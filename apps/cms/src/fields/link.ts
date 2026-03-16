import type { Field } from 'payload'

export const validateUrl = (val: string | null | undefined) => {
  if (val && !/^https?:\/\//.test(val)) {
    return 'Please enter a valid URL'
  }
  return true
}

export const linkFields: Field[] = [
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
]
