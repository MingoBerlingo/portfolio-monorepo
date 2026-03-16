import type { CollectionConfig } from 'payload'
import {
  convertLexicalToHTMLAsync,
  defaultHTMLConvertersAsync,
} from '@payloadcms/richtext-lexical/html-async'
import type { SerializedEditorState } from 'lexical'

export const Post: CollectionConfig = {
  slug: 'post',
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
      name: 'content',
      type: 'richText',
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
