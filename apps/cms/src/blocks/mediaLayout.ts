import type { Block } from 'payload'
import type { HTMLConverterAsync } from '@payloadcms/richtext-lexical/html-async'
import { validateMedia } from '../validators/media'
import { groupMediaItems, type MediaGridItem } from '../utils/mediaGrid'

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
  items?: unknown
}

/** The old rows field stays readable while saved content transitions to grid items. */
export const MediaLayout: Block = {
  slug: 'mediaLayout',
  interfaceName: 'MediaLayoutBlock',
  labels: { singular: 'Media grid', plural: 'Media grids' },
  fields: [
    { name: 'gridVersion', type: 'number', admin: { hidden: true } },
    {
      name: 'items',
      type: 'array',
      label: 'Media grid',
      labels: { singular: 'Media', plural: 'Media' },
      admin: {
        initCollapsed: false,
        components: { Field: '@/components/MediaLayoutEditor#MediaGridEditor' },
        description:
          'Add images or videos, choose their width, and drag to reorder. Unpaired half-width items leave an empty space.',
      },
      fields: [
        {
          name: 'width',
          type: 'select',
          required: true,
          defaultValue: 'full',
          options: [
            { label: 'Full width', value: 'full' },
            { label: 'Half width', value: 'half' },
          ],
          admin: { components: { Field: '@/components/MediaLayoutEditor#MediaGridWidth' } },
        },
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
    {
      name: 'rows',
      type: 'array',
      admin: { hidden: true },
      fields: [
        { name: 'columns', type: 'select', options: ['1', '2'] },
        {
          name: 'images',
          type: 'array',
          fields: [{ name: 'image', type: 'upload', relationTo: 'media' }],
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

  if (!fields) return ''

  if (Array.isArray(fields.items)) {
    const rendered = await Promise.all(
      groupMediaItems(fields.items as MediaGridItem[]).map(async (row) =>
        renderRowHtml(
          row.columns,
          await Promise.all(row.items.map((item) => renderCell(item.image, populate))),
        ),
      ),
    )
    const rows = rendered.filter(Boolean)
    return rows.length ? `<div class="media-layout media-layout--grid">${rows.join('')}</div>` : ''
  }

  if (!Array.isArray(fields.rows)) return ''

  const rendered = await Promise.all(
    (fields.rows as MediaLayoutRow[]).map((row) => renderRow(row, populate)),
  )

  const rows = rendered.filter((html) => html.length > 0)

  if (!rows.length) return ''

  return `<div class="media-layout">${rows.join('')}</div>`
}
