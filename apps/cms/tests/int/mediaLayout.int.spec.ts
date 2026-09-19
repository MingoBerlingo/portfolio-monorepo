import { describe, expect, it, vi } from 'vitest'
import { mediaLayoutConverter } from '@/blocks/mediaLayout'

type ConverterArgs = {
  node: { fields?: Record<string, unknown> }
  populate?: (args: { collectionSlug: string; id: number | string }) => Promise<unknown>
}

const render = mediaLayoutConverter as unknown as (args: ConverterArgs) => Promise<string>

const blockNode = (rows: Record<string, unknown>[]) => ({
  type: 'block',
  fields: { blockType: 'mediaLayout', rows },
})

const image = (overrides: Record<string, unknown> = {}) => ({
  alt: 'Left image',
  height: 800,
  mimeType: 'image/jpeg',
  url: '/api/media/file/left.jpg',
  width: 1200,
  ...overrides,
})

const imageHtml = (url = '/api/media/file/left.jpg', alt = 'Left image') =>
  `<img src="${url}" alt="${alt}" width="1200" height="800" loading="lazy" />`

describe('mediaLayout block', () => {
  it('stacks single-image and two-column rows in order', async () => {
    const html = await render({
      node: blockNode([
        { columns: '1', images: [{ image: image() }] },
        {
          columns: '2',
          images: [
            { image: image({ alt: 'Pair left', url: '/api/media/file/pair-left.jpg' }) },
            { image: image({ alt: 'Pair right', url: '/api/media/file/pair-right.jpg' }) },
          ],
        },
        {
          columns: '1',
          images: [{ image: image({ alt: 'Closing image', url: '/api/media/file/closing.jpg' }) }],
        },
      ]),
    })

    expect(html).toBe(
      '<div class="media-layout">' +
        `<div class="media-layout-row media-layout-row--columns-1">${imageHtml()}</div>` +
        '<div class="media-layout-row media-layout-row--columns-2">' +
        imageHtml('/api/media/file/pair-left.jpg', 'Pair left') +
        imageHtml('/api/media/file/pair-right.jpg', 'Pair right') +
        '</div>' +
        '<div class="media-layout-row media-layout-row--columns-1">' +
        imageHtml('/api/media/file/closing.jpg', 'Closing image') +
        '</div>' +
        '</div>',
    )
  })

  it('populates image ids that are not expanded yet', async () => {
    const populate = vi.fn(async ({ id }: { id: number | string }) =>
      image({ alt: String(id), url: `/api/media/file/${id}.jpg` }),
    )

    const html = await render({
      node: blockNode([{ columns: '2', images: [{ image: 'left-id' }, { image: 'right-id' }] }]),
      populate,
    })

    expect(populate).toHaveBeenCalledTimes(2)
    expect(html).toContain('src="/api/media/file/left-id.jpg"')
    expect(html).toContain('src="/api/media/file/right-id.jpg"')
  })

  it('escapes attribute values coming from the CMS', async () => {
    const html = await render({
      node: blockNode([
        { columns: '1', images: [{ image: image({ alt: 'A "quoted" & <tagged> alt' }) }] },
      ]),
    })

    expect(html).toContain('alt="A &quot;quoted&quot; &amp; &lt;tagged&gt; alt"')
  })

  it('renders a video cell as an autoplaying video', async () => {
    const html = await render({
      node: blockNode([
        {
          columns: '1',
          images: [{ image: image({ mimeType: 'video/webm', url: '/api/media/file/clip.webm' }) }],
        },
      ]),
    })

    expect(html).toBe(
      '<div class="media-layout">' +
        '<div class="media-layout-row media-layout-row--columns-1">' +
        '<video src="/api/media/file/clip.webm" width="1200" height="800" autoplay muted loop playsinline preload="metadata"></video>' +
        '</div>' +
        '</div>',
    )
  })

  it('renders videos and skips media that is not usable', async () => {
    const html = await render({
      node: blockNode([
        {
          columns: '2',
          images: [
            { image: image({ mimeType: 'video/mp4', url: '/api/media/file/clip.mp4' }) },
            { image: image({ mimeType: 'application/pdf', url: '/api/media/file/doc.pdf' }) },
          ],
        },
        { columns: '1', images: [{ image: 'missing' }] },
        { columns: '1', images: [{ image: image() }] },
      ]),
      populate: async () => undefined,
    })

    expect(html).toContain('<video src="/api/media/file/clip.mp4"')
    expect(html).not.toContain('doc.pdf')
    expect(html).toContain('/api/media/file/left.jpg')
    expect(html.match(/<video /g)).toHaveLength(1)
    expect(html.match(/<img /g)).toHaveLength(1)
    expect(html.match(/<div class="media-layout-row/g)).toHaveLength(2)
  })

  it('falls back to two columns when the field is missing', async () => {
    const html = await render({
      node: blockNode([
        { images: [{ image: image() }, { image: image({ url: '/api/media/file/right.jpg' }) }] },
      ]),
    })

    expect(html).toContain('media-layout-row--columns-2')
  })

  it('renders nothing when the block has no rows', async () => {
    expect(await render({ node: blockNode([]) })).toBe('')
    expect(await render({ node: { fields: { blockType: 'mediaLayout' } } })).toBe('')
  })
})
