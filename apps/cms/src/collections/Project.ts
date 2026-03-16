import type { CollectionConfig } from 'payload'
import { linkFields } from '../fields/link'
import {
  convertLexicalToHTMLAsync,
  defaultHTMLConvertersAsync,
} from '@payloadcms/richtext-lexical/html-async'
import type { SerializedEditorState } from 'lexical'

export const Project: CollectionConfig = {
  slug: 'project',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterRead: [
      async ({ doc, req }) => {
        if (!doc.content) return doc

        const html = await convertLexicalToHTMLAsync({
          data: doc.content as SerializedEditorState,
          converters: defaultHTMLConvertersAsync,
          disableContainer: true,
          populate: async ({ collectionSlug, id, select }) => {
            const relatedDoc = await req.payload.findByID({
              collection: collectionSlug as any,
              id,
              select,
            })
            return relatedDoc
          },
        })

        return { ...doc, contentHtml: html }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'isFeatured',
          type: 'checkbox',
          required: true,
          defaultValue: false,
        },
        {
          name: 'isMinor',
          type: 'checkbox',
          required: true,
          defaultValue: false,
        },
      ],
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'year',
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
          name: 'client',
          type: 'text',
        },
        {
          name: 'role',
          type: 'text',
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'links',
      type: 'array',
      admin: {
        components: {
          RowLabel: '@/components/LinkRowLabel#LinkRowLabel',
        },
      },
      fields: linkFields,
    },
    {
      name: 'collaborators',
      type: 'array',
      admin: {
        components: {
          RowLabel: '@/components/LinkRowLabel#CollaboratorRowLabel',
        },
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'contentHtml',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [() => undefined],
      },
    },
  ],
}
