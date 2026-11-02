import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { extractVideoPoster } from './videoOptimization'

type VideoDoc = {
  id?: number | string
  filename?: string | null
  mimeType?: string | null
  updatedAt?: string
}
const posterVersion = '2'
const pending = new Map<string, Promise<Buffer>>()

export function videoThumbnailURL(doc: VideoDoc): string | null {
  if (!doc.mimeType?.startsWith('video/') || !doc.id) return null
  return `/api/media/${encodeURIComponent(doc.id)}/poster?v=${posterVersion}-${encodeURIComponent(doc.updatedAt || '')}`
}

/** Frame caches are keyed by document version AND file metadata, never the filename alone. */
export async function getVideoPoster(
  doc: VideoDoc,
  staticDir: string,
  extract: (source: string) => Promise<string> = extractVideoPoster,
): Promise<Buffer> {
  if (!doc.filename || path.basename(doc.filename) !== doc.filename || /[\\/]/.test(doc.filename)) {
    throw new Error('Invalid video filename')
  }
  if (!doc.mimeType?.startsWith('video/')) throw new Error('Not a video')
  const source = path.join(staticDir, doc.filename)
  const stat = await fs.stat(source)
  const key = createHash('sha256')
    .update(
      JSON.stringify([posterVersion, doc.id, doc.filename, doc.updatedAt, stat.size, stat.mtimeMs]),
    )
    .digest('hex')
  const cacheDir = path.join(staticDir, '.video-posters')
  const destination = path.join(cacheDir, `${key}.jpg`)
  const active = pending.get(destination)
  if (active) return active
  const work = (async () => {
    try {
      return await fs.readFile(destination)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await fs.mkdir(cacheDir, { recursive: true })
    const output = await extract(source)
    try {
      const frame = await fs.readFile(output)
      // The temporary file is atomically renamed so readers never see a partial JPEG.
      const temporary = `${destination}.${process.pid}.tmp`
      await fs.writeFile(temporary, frame)
      await fs.rename(temporary, destination)
      return frame
    } finally {
      await fs.rm(path.dirname(output), { recursive: true, force: true })
    }
  })()
  pending.set(destination, work)
  try {
    return await work
  } finally {
    pending.delete(destination)
  }
}
