import type { GlobalConfig } from 'payload'

export const Hero: GlobalConfig = {
  slug: 'hero',
  access: { read: () => true },
  fields: [
    { name: 'greeting', type: 'text', required: true, defaultValue: 'Hey!' },
    { name: 'nameLine', type: 'text', required: true, defaultValue: 'I’m Alessandro Quets.' },
    { name: 'introduction', type: 'textarea', required: true, defaultValue: 'I’m a Digital Designer & Frontend Developer based in Lecco, Italy 🇮🇹' },
    {
      name: 'homepageIntroduction',
      type: 'textarea',
      defaultValue:
        'I care about how an interface looks [eye], how it feels, and how it works.\n\nI shape interactions, build design systems, and carry those decisions into production [components]. Working in both Figma [figma] and code [code] lets me keep refining the details as I build.\n\nI can sit in a design review and open a pull request [pull-request] on the same day.',
      admin: {
        description:
          'Homepage scroll reveal. Separate paragraphs with a blank line. Insert images with [key], for example [design-system]. Leave empty to use the default introduction.',
      },
    },
    {
      name: 'homepageImages',
      type: 'array',
      admin: {
        description:
          'Small inline images. Match each key to a [key] marker in the introduction. Built-in keys: eye, figma, code, design-system, components, pull-request. Uploads replace the built-in images.',
      },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) =>
            /^[a-zA-Z0-9_-]+$/.test(value || '') || 'Use letters, numbers, underscores or hyphens.',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          filterOptions: {
            mimeType: {
              in: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/avif',
                'image/gif',
                'image/svg+xml',
              ],
            },
          },
        },
        {
          name: 'alt',
          type: 'text',
          admin: { description: 'Optional description. Leave empty for a decorative image.' },
        },
      ],
    },
  ],
}
