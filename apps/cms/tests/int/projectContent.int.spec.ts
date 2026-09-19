import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const staticDir = path.resolve(process.cwd(), 'media')
/** Keeps names unique across runs so leftovers from a crashed run can't clash. */
const run = Date.now().toString(36)

let payload: Payload
const createdFiles = new Set<string>()

const createImage = () =>
  sharp({ create: { background: '#ffffff', channels: 3, height: 4, width: 4 } })
    .jpeg()
    .toBuffer()

/** A minimal lexical editor state holding a single `mediaLayout` block. */
const contentWithBlock = (rows: Record<string, unknown>[]) => ({
  root: {
    children: [
      {
        fields: {
          blockType: 'mediaLayout',
          rows,
        },
        format: '' as const,
        type: 'block',
        version: 2,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
})

describe('project content blocks', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    // Payload does not remove files when a document is deleted.
    for (const filename of createdFiles) {
      await fs.rm(path.join(staticDir, filename), { force: true }).catch(() => {})
    }
  })

  it('renders the media layout block as media-layout HTML in contentHtml', async () => {
    const image = await createImage()
    const filename = `media-layout-${run}.jpg`
    let mediaId: number | string | undefined
    let projectId: number | string | undefined

    try {
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Media layout test image' },
        file: { data: image, mimetype: 'image/jpeg', name: filename, size: image.length },
      })
      mediaId = media.id
      createdFiles.add(filename)

      const project = await payload.create({
        collection: 'project',
        data: {
          // A single-image row followed by a two-column row, so the block has to
          // render both column layouts in order.
          content: contentWithBlock([
            { columns: '1', images: [{ image: media.id }] },
            { columns: '2', images: [{ image: media.id }, { image: media.id }] },
          ]),
          featuredImage: media.id,
          isFeatured: false,
          isMinor: false,
          shortTitle: 'Media layout test',
          slug: `media-layout-${run}`,
          tagline: 'Temporary project created by the test suite',
          title: 'Media layout test',
          year: new Date().toISOString(),
        },
      })
      projectId = project.id

      const saved = await payload.findByID({ collection: 'project', id: project.id })

      expect(saved.contentHtml).toContain('<div class="media-layout">')
      expect(saved.contentHtml).toContain('media-layout-row--columns-1')
      expect(saved.contentHtml).toContain('media-layout-row--columns-2')
      expect(saved.contentHtml?.match(/<img /g)).toHaveLength(3)
      expect(saved.contentHtml).toContain('alt="Media layout test image"')
    } finally {
      if (projectId) {
        await payload.delete({ collection: 'project', id: projectId }).catch(() => {})
      }
      if (mediaId) {
        await payload.delete({ collection: 'media', id: mediaId }).catch(() => {})
      }
    }
  })
})
