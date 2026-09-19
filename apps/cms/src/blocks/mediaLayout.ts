import type { Block } from 'payload'
import type { HTMLConverterAsync } from '@payloadcms/richtext-lexical/html-async'
import { validateMedia } from '../validators/media'

/** The subset of a media document the blocks need to render. */
type MediaDoc = {
  url?: null | string
  alt?: null | string
  filename?: null | string
  mimeType?: null | string
  width?: null | number
  height?: null | number
}

/** Minimal shape of the `populate` helper the HTML conversion provides. */
type PopulateFn = (args: { collectionSlug: string; id: number | string }) => Promise<unknown>

/** One entry of the layout's `rows` array. */
type MediaLayoutRow = {
  columns?: unknown
  images?: unknown
}

/** Fields stored on a `mediaLayout` block node. */
type MediaLayoutFields = {
  rows?: unknown
}

/**
 * Editor block that stacks media rows inside the project content.
 *
 * A layout is a list of rows — a single image or video, or two side by side —
 * in the order they are added, so mixing full-width and half-width media is a
 * matter of adding rows. It stores content only: the converter below emits
 * `.media-layout` / `.media-layout-row` wrappers and the web app owns every
 * spacing and styling decision (see `apps/web/src/app.css`).
 */
export const MediaLayout: Block = {
  slug: 'mediaLayout',
  interfaceName: 'MediaLayoutBlock',
  labels: {
    singular: 'Media layout',
    plural: 'Media layouts',
  },
  fields: [
    {
      name: 'rows',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Row',
        plural: 'Rows',
      },
      admin: {
        description:
          'Add rows — one media item, or two side by side — and reorder them to build the layout.',
      },
      fields: [
        {
          name: 'columns',
          type: 'select',
          required: true,
          defaultValue: '2',
          label: 'Columns',
          options: [
            { label: 'One column (stacked)', value: '1' },
            { label: 'Two columns', value: '2' },
          ],
          admin: {
            description: 'Two columns sit side by side on wide screens and stack on narrow ones.',
          },
        },
        {
          name: 'images',
          type: 'array',
          required: true,
          minRows: 1,
          maxRows: 2,
          labels: {
            singular: 'Media',
            plural: 'Media',
          },
          admin: {
            description: 'One image or video for a single column, two for two columns.',
          },
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
              label: 'Media',
              validate: validateMedia,
            },
          ],
        },
      ],
    },
  ],
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/**
 * Resolves an upload field value into a media document.
 *
 * Block fields arrive either as the stored id or as an already-populated
 * document, depending on the depth of the request that produced the document.
 */
async function resolveMedia(
  value: unknown,
  populate: PopulateFn | undefined,
): Promise<MediaDoc | null> {
  if (typeof value === 'object' && value !== null) {
    return value as MediaDoc
  }

  if ((typeof value !== 'string' && typeof value !== 'number') || !populate) {
    return null
  }

  const mediaDoc = (await populate({ collectionSlug: 'media', id: value })) as MediaDoc | undefined

  return mediaDoc ?? null
}

/** Renders one cell as an `<img>` or `<video>`, or an empty string when it cannot be shown. */
async function renderCell(value: unknown, populate: PopulateFn | undefined): Promise<string> {
  const media = await resolveMedia(value, populate)

  if (!media) return ''

  const url = typeof media.url === 'string' ? media.url : ''
  const mimeType = media.mimeType?.toLowerCase() ?? ''

  if (!url) return ''

  const width = typeof media.width === 'number' ? ` width="${media.width}"` : ''
  const height = typeof media.height === 'number' ? ` height="${media.height}"` : ''

  if (mimeType.startsWith('image/')) {
    const alt = typeof media.alt === 'string' ? media.alt : (media.filename ?? '')

    return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}"${width}${height} loading="lazy" />`
  }

  // Videos play inline like the rest of the site: autoplaying, muted, looping.
  if (mimeType.startsWith('video/')) {
    return `<video src="${escapeAttribute(url)}"${width}${height} autoplay muted loop playsinline preload="metadata"></video>`
  }

  return ''
}

/** Wraps rendered cells in a row holding one or two columns. */
function renderRowHtml(columns: '1' | '2', cells: string[]): string {
  const images = cells.filter((html) => html.length > 0)

  if (!images.length) return ''

  return `<div class="media-layout-row media-layout-row--columns-${columns}">${images.join('')}</div>`
}

/** Renders one row of the layout: a single image, or two side by side. */
async function renderRow(row: MediaLayoutRow, populate: PopulateFn | undefined): Promise<string> {
  const columns = row.columns === '1' ? '1' : '2'
  const entries = Array.isArray(row.images) ? (row.images as { image?: unknown }[]) : []

  const cells = await Promise.all(entries.map((entry) => renderCell(entry?.image, populate)))

  return renderRowHtml(columns, cells)
}

/**
 * Converts a `mediaLayout` block node into the HTML stored in
 * `Project.contentHtml`.
 *
 * Output is intentionally minimal — a `.media-layout` wrapper holding one
 * `.media-layout-row` per row — so the frontend can style and rearrange the
 * images freely.
 */
export const mediaLayoutConverter: HTMLConverterAsync = async ({ node, populate }) => {
  const fields = (node as { fields?: MediaLayoutFields }).fields

  if (!fields || !Array.isArray(fields.rows)) return ''

  const rendered = await Promise.all(
    (fields.rows as MediaLayoutRow[]).map((row) => renderRow(row, populate)),
  )

  const rows = rendered.filter((html) => html.length > 0)

  if (!rows.length) return ''

  return `<div class="media-layout">${rows.join('')}</div>`
}
