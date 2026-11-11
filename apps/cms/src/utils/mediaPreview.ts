import sharp from 'sharp'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { extractVideoPoster } from './videoOptimization'

/** Embedded previews travel with CMS data and need no extra request on static hosts. */
export async function createMediaPreview(data: Buffer, mimeType: string): Promise<string | null> {
  if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) return null
  let source = data
  let directory: string | undefined
  let frame: string | undefined
  try {
    if (mimeType.startsWith('video/')) {
      directory = await fs.mkdtemp(path.join(os.tmpdir(), 'media-preview-'))
      const input = path.join(directory, 'source')
      await fs.writeFile(input, data)
      frame = await extractVideoPoster(input)
      source = await fs.readFile(frame)
    }
    const preview = await sharp(source)
      .rotate()
      .resize({ width: 32, height: 32, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 45 })
      .toBuffer()
    return `data:image/jpeg;base64,${preview.toString('base64')}`
  } finally {
    if (frame) await fs.rm(path.dirname(frame), { recursive: true, force: true })
    if (directory) await fs.rm(directory, { recursive: true, force: true })
  }
}
