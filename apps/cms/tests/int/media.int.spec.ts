import config from '@/payload.config'
import {
  incrementFilename,
  replacementFilename,
  sanitizeMediaFilename,
  sanitizeRenamedFilename,
} from '@/utils/mediaFilename'
import { resolveReplacementFilename } from '@/utils/replaceMediaFile'
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

const createImage = (options: { background?: string; height?: number; width?: number } = {}) =>
  sharp({
    create: {
      background: options.background || '#ffffff',
      channels: 3,
      height: options.height || 4,
      width: options.width || 4,
    },
  })
    .jpeg()
    .toBuffer()

/** What the `/:id/replace-file` endpoint does: keep the name, overwrite the file. */
const replaceFile = async ({
  docId,
  fileData,
  filename,
  mimetype = 'image/jpeg',
  storedFilename,
  uploadedName,
}: {
  docId: number | string
  fileData: Buffer
  filename?: string
  mimetype?: string
  storedFilename: string
  uploadedName: string
}) => {
  const name =
    filename ||
    (await resolveReplacementFilename({
      id: docId,
      payload,
      staticDir,
      storedFilename,
      uploadedName,
    }))

  return payload.update({
    collection: 'media',
    data: {},
    file: { data: fileData, mimetype, name, size: fileData.length },
    id: docId,
    overwriteExistingFiles: true,
  })
}

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

  it('names a replacement after the stored file, keeping only its extension', () => {
    expect(replacementFilename('cover.jpg', 'shot.png')).toBe('cover.png')
    expect(replacementFilename('cover.jpg', 'shot.JPG')).toBe('cover.jpg')
    expect(replacementFilename('cover.jpg', 'shot.jpeg')).toBe('cover.jpeg')
    // A name is not a "base" — dots inside it stay intact.
    expect(replacementFilename('Screenshot-2026-09-18-at-4.47.27-PM.png', 'Frame 1.png')).toBe(
      'Screenshot-2026-09-18-at-4.47.27-PM.png',
    )
    // No extension on either side: keep whatever the stored file has.
    expect(replacementFilename('poster.jpg', 'no-extension')).toBe('poster.jpg')
    expect(replacementFilename('no-ext', 'shot.png')).toBe('no-ext.png')
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

  it('keeps the stored name and URL when a replacement keeps the format', async () => {
    const data = await createImage()

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'keep my name' },
      file: {
        data,
        mimetype: 'image/jpeg',
        name: `Keep My Name ${run}.jpg`,
        size: data.length,
      },
    })

    createdIDs.push(doc.id)
    createdFiles.add(doc.filename as string)

    const replacement = await createImage({ background: '#000000', height: 6, width: 8 })

    const updated = await replaceFile({
      docId: doc.id,
      fileData: replacement,
      storedFilename: doc.filename as string,
      uploadedName: `Totally-Different-${run}.jpg`,
    })

    createdFiles.add(updated.filename as string)

    // The name the site links to does not move, so nothing has to be re-linked.
    expect(updated.filename).toBe(doc.filename)
    expect(updated.url).toBe(doc.url)
    expect(updated.filesize).toBe(replacement.length)

    const onDisk = await fs.readFile(path.join(staticDir, updated.filename as string))
    expect(onDisk.equals(replacement)).toBe(true)

    // No suffixed leftovers: the file was overwritten, not duplicated.
    await expect(fs.access(path.join(staticDir, `Keep-My-Name-${run}-1.jpg`))).rejects.toThrow()
  })

  it('keeps the base name but follows the replacement format', async () => {
    const data = await createImage()

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'cover' },
      file: {
        data,
        mimetype: 'image/jpeg',
        name: `Cover Photo ${run}.jpg`,
        size: data.length,
      },
    })

    createdIDs.push(doc.id)
    createdFiles.add(doc.filename as string)

    const replacement = await sharp({
      create: { width: 8, height: 6, channels: 4, background: '#00000000' },
    })
      .png()
      .toBuffer()

    const updated = await replaceFile({
      docId: doc.id,
      fileData: replacement,
      mimetype: 'image/png',
      storedFilename: doc.filename as string,
      uploadedName: `Frame 1 ${run}.png`,
    })

    createdFiles.add(updated.filename as string)

    expect(updated.filename).toBe(`Cover-Photo-${run}.png`)
    expect(updated.url).toContain(`/api/media/file/Cover-Photo-${run}.png`)
    expect(updated.mimeType).toBe('image/png')

    const onDisk = await fs.readFile(path.join(staticDir, updated.filename as string))
    expect(onDisk.equals(replacement)).toBe(true)
    // The replaced .jpg is gone, and nothing was suffixed.
    await expect(fs.access(path.join(staticDir, doc.filename as string))).rejects.toThrow()
    await expect(fs.access(path.join(staticDir, `Cover-Photo-${run}-1.png`))).rejects.toThrow()
  })

  it('never overwrites a file another document already holds', async () => {
    const data = await createImage()

    const target = await payload.create({
      collection: 'media',
      data: { alt: 'being replaced' },
      file: { data, mimetype: 'image/jpeg', name: `Guard ${run}.jpg`, size: data.length },
    })

    const other = await payload.create({
      collection: 'media',
      data: { alt: 'holds the name' },
      file: { data, mimetype: 'image/png', name: `Guard ${run}.png`, size: data.length },
    })

    createdIDs.push(target.id, other.id)
    createdFiles.add(target.filename as string)
    createdFiles.add(other.filename as string)

    const replacement = await createImage({ background: '#000000', height: 6, width: 8 })

    // `Guard-<run>.png` (the desired name) belongs to `other`, so the stored name
    // is incremented instead of written over another document's file.
    const updated = await replaceFile({
      docId: target.id,
      fileData: replacement,
      mimetype: 'image/png',
      storedFilename: target.filename as string,
      uploadedName: `Frame 1 ${run}.png`,
    })

    createdFiles.add(updated.filename as string)

    expect(updated.filename).toBe(`Guard-${run}-1.png`)

    // The other document's file survived untouched.
    const untouched = await fs.readFile(path.join(staticDir, other.filename as string))
    expect(untouched.equals(data)).toBe(true)
    await expect(fs.access(path.join(staticDir, target.filename as string))).rejects.toThrow()
  })
})
