import type { GlobalConfig } from 'payload'
import { convertLexicalToHTMLAsync } from '@payloadcms/richtext-lexical/html-async'
import type { SerializedEditorState } from 'lexical'
import { linkFields } from '../fields/link'

export const Profile: GlobalConfig = {
  slug: 'profile',
  access: {
    read: () => true,
  },
  hooks: {
    afterRead: [
      async ({ doc }) => {
        if (!doc?.presentation) return doc

        const html = await convertLexicalToHTMLAsync({
          data: doc.presentation as SerializedEditorState,
          disableContainer: true,
        })

        return {
          ...doc,
          presentationHtml: html,
        }
      },
    ],
  },
  fields: [
    {
      name: 'footerHeading',
      type: 'text',
      defaultValue: 'Let’s build something together.',
      maxLength: 100,
      admin: { description: 'The contact heading in the site footer.' },
    },
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
      name: 'homepageIntroduction',
      type: 'textarea',
      defaultValue:
        'I work best between design and frontend, close enough to both sides to make them talk to each other.\n\nI focus on design systems architecture [design-system], UI component library development [components], and frontend implementation in React and Svelte. I can sit in a design review and open a pull request [pull-request] on the same day.',
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
          'Small inline images. Match each key to a [key] marker in the introduction. Built-in keys: design-system, components, pull-request. Uploads replace the built-in images.',
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
    {
      name: 'presentation',
      type: 'richText',
    },
    {
      name: 'presentationHtml',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [() => undefined],
      },
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
