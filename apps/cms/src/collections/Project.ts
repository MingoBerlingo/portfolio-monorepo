import type { CollectionConfig } from 'payload'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { linkFields } from '../fields/link'
import {
  convertLexicalToHTMLAsync,
  defaultHTMLConvertersAsync,
} from '@payloadcms/richtext-lexical/html-async'
import type { SerializedEditorState } from 'lexical'
import { MediaLayout, mediaLayoutConverter } from '../blocks/mediaLayout'
import { validateVideoCover } from '../validators/videoCover'
import { normalizeMediaGridContent } from '../utils/mediaGrid'

export const Project: CollectionConfig = {
  slug: 'project',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [
      ({ data }) =>
        data?.content ? { ...data, content: normalizeMediaGridContent(data.content) } : data,
    ],
    afterRead: [
      async ({ doc, req }) => {
        if (!doc.content) return doc
        doc = { ...doc, content: normalizeMediaGridContent(doc.content) }

        const converters = ({
          defaultConverters,
        }: {
          defaultConverters: typeof defaultHTMLConvertersAsync
        }) => ({
          ...defaultConverters,
          blocks: {
            [MediaLayout.slug]: mediaLayoutConverter,
          },
          upload: async (args: any) => {
            const uploadNode = args.node as {
              value?: unknown
              relationTo?: string
            }

            let uploadDoc:
              | {
                  previewDataURL?: string
                  url?: string
                  mimeType?: string
                  filename?: string
                  width?: number
                  height?: number
                  alt?: string
                }
              | null
              | undefined

            if (typeof uploadNode.value !== 'object' || uploadNode.value === null) {
              if (!args.populate || !uploadNode.relationTo || !uploadNode.value) {
                return ''
              }

              uploadDoc = await args.populate({
                id: uploadNode.value as string,
                collectionSlug: uploadNode.relationTo,
              })
            } else {
              uploadDoc = uploadNode.value as typeof uploadDoc
            }

            if (!uploadDoc?.url || !uploadDoc.mimeType) {
              return ''
            }

            const preview = uploadDoc.previewDataURL
              ? ` data-preview="${uploadDoc.previewDataURL.replaceAll('&', '&amp;').replaceAll('\"', '&quot;').replaceAll('<', '&lt;')}"`
              : ''

            if (uploadDoc.mimeType.startsWith('video/')) {
              const width = uploadDoc.width ? ` width="${uploadDoc.width}"` : ''
              const height = uploadDoc.height ? ` height="${uploadDoc.height}"` : ''
              const poster =
                typeof doc.featuredImage === 'object' && doc.featuredImage?.url
                  ? ` poster="${doc.featuredImage.url}"`
                  : ''

              return `
                <video src="${uploadDoc.url}"${poster}${width}${height}${preview} preload="metadata" autoplay muted loop playsinline></video>
              `
            }

            if (typeof defaultConverters.upload === 'function') {
              const html = await defaultConverters.upload(args)
              return typeof html === 'string' ? html.replace('<img ', `<img${preview} `) : html
            }

            return ''
          },
        })

        const html = await convertLexicalToHTMLAsync({
          data: doc.content as SerializedEditorState,
          converters,
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
      name: 'keywords',
      type: 'relationship',
      relationTo: 'keywords',
      hasMany: true,
      admin: {
        description:
          'Assign reusable keywords. These assignments are not displayed on the website yet.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'shortTitle',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'tagline',
      type: 'text',
      required: true,
      maxLength: 160,
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
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'videoCover',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional short looping video (MP4 or WebM only) used as a project cover.',
      },
      validate: validateVideoCover,
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
        {
          name: 'output',
          type: 'text',
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      // Scoped to this field so the block only shows up where the site knows how
      // to render it; `rootFeatures` keeps every default feature available.
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [...rootFeatures, BlocksFeature({ blocks: [MediaLayout] })],
      }),
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
