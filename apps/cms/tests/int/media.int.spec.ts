import config from '@/payload.config'
import {
  incrementFilename,
  sanitizeMediaFilename,
  sanitizeRenamedFilename,
} from '@/utils/mediaFilename'
import { getPayload, Payload } from 'payload'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const staticDir = path.resolve(process.cwd(), 'media')
/** Keeps names unique across runs so leftovers from a crashed run can't clash. */
const run = Date.now().toString(36)

let payload: Payload
const createdIDs: (number | string)[] = []
const createdFiles = new Set<string>()

const createImage = () =>
  sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } })
    .jpeg()
    .toBuffer()

describe('media file names', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of createdIDs) {
      await payload.delete({ collection: 'media', id }).catch(() => {})
    }

    // Payload does not remove files when a document is deleted.
    for (const filename of createdFiles) {
      await fs.rm(path.join(staticDir, filename), { force: true })
    }
  })

  it('slugifies file names into URL-safe ones', () => {
    expect(sanitizeMediaFilename('My Covid Souvenir inner pages 1.jpg')).toBe(
      'My-Covid-Souvenir-inner-pages-1.jpg',
    )
    expect(sanitizeMediaFilename('café (1).PNG')).toBe('cafe-1.png')
    expect(sanitizeMediaFilename('100%.jpg')).toBe('100.jpg')
    expect(incrementFilename('poster.jpg')).toBe('poster-1.jpg')
    expect(incrementFilename('poster-1.jpg')).toBe('poster-2.jpg')
    expect(sanitizeRenamedFilename('new name.png', 'old.jpg')).toBe('new-name.jpg')
  })

  it('exposes the file name as an editable field', () => {
    const field = payload.collections.media.config.fields.find(
      (candidate) => 'name' in candidate && candidate.name === 'filename',
    )

    expect(field).toBeDefined()

    // `hidden`/`readOnly` come from our field, everything else (e.g. `unique`)
    // from Payload's base upload field it is merged with.
    const admin = (field as { admin?: { hidden?: boolean; readOnly?: boolean } }).admin

    expect(admin?.hidden).not.toBe(true)
    expect(admin?.readOnly).not.toBe(true)
    expect((field as { unique?: boolean }).unique).toBe(true)
  })

  it('stores an upload with spaces under a URL-safe name', async () => {
    const data = await createImage()
    const filename = `My Test Image ${run}.jpg`

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'upload with spaces' },
      file: { data, mimetype: 'image/jpeg', name: filename, size: data.length },
    })

    createdIDs.push(doc.id)
    createdFiles.add(doc.filename as string)

    expect(doc.filename).toBe(`My-Test-Image-${run}.jpg`)
    expect(doc.url).toContain(`/api/media/file/My-Test-Image-${run}.jpg`)
    expect(doc.url).not.toContain('%20')
    await expect(fs.access(path.join(staticDir, doc.filename as string))).resolves.toBeUndefined()
  })

  it('renames the file on disk when the name is edited from the dashboard', async () => {
    const data = await createImage()

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'rename me' },
      file: {
        data,
        mimetype: 'image/jpeg',
        name: `Rename Me ${run}.jpg`,
        size: data.length,
      },
    })

    createdIDs.push(doc.id)
    createdFiles.add(doc.filename as string)

    const updated = await payload.update({
      collection: 'media',
      id: doc.id,
      data: { filename: 'My Renamed Poster.jpg' },
    })

    createdFiles.add(updated.filename as string)

    expect(updated.filename).toBe('My-Renamed-Poster.jpg')
    expect(updated.url).toContain('/api/media/file/My-Renamed-Poster.jpg')
    await expect(fs.access(path.join(staticDir, 'My-Renamed-Poster.jpg'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(staticDir, doc.filename as string))).rejects.toThrow()
  })

  it('keeps the current name when the field is cleared', async () => {
    const data = await createImage()

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'cleared' },
      file: {
        data,
        mimetype: 'image/jpeg',
        name: `Cleared ${run}.jpg`,
        size: data.length,
      },
    })

    createdIDs.push(doc.id)
    createdFiles.add(doc.filename as string)

    const updated = await payload.update({
      collection: 'media',
      id: doc.id,
      data: { filename: '' },
    })

    expect(updated.filename).toBe(doc.filename)
    await expect(fs.access(path.join(staticDir, doc.filename as string))).resolves.toBeUndefined()
  })

  it('never reuses a name another document already holds', async () => {
    const takenFilename = `Taken ${run}.jpg`

    const data = await createImage()
    const taken = await payload.create({
      collection: 'media',
      data: { alt: 'taken' },
      file: { data, mimetype: 'image/jpeg', name: takenFilename, size: data.length },
    })

    const otherData = await createImage()
    const other = await payload.create({
      collection: 'media',
      data: { alt: 'other' },
      file: {
        data: otherData,
        mimetype: 'image/jpeg',
        name: `Other ${run}.jpg`,
        size: otherData.length,
      },
    })

    createdIDs.push(taken.id, other.id)
    createdFiles.add(taken.filename as string)
    createdFiles.add(other.filename as string)

    const renamed = await payload.update({
      collection: 'media',
      id: other.id,
      data: { filename: takenFilename },
    })

    createdFiles.add(renamed.filename as string)

    expect(renamed.filename).not.toBe(taken.filename)
    expect(renamed.filename).toMatch(new RegExp(`^Taken-${run}-1\\.jpg$`))
    await expect(
      fs.access(path.join(staticDir, renamed.filename as string)),
    ).resolves.toBeUndefined()
    await expect(fs.access(path.join(staticDir, taken.filename as string))).resolves.toBeUndefined()
  })
})
