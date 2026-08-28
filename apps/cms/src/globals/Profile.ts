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
