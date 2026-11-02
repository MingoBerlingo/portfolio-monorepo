import type { GlobalConfig } from 'payload'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: { read: () => true },
  fields: [
    { name: 'heading', type: 'textarea', required: true, defaultValue: 'Make it clear.\nMake it feel right.', maxLength: 160 },
    { name: 'keywordsHeading', type: 'text', defaultValue: 'A few things I work with' },
    { name: 'signature', type: 'text', defaultValue: 'In ♥ with pixels' },
  ],
}
