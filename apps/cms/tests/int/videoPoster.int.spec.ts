// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import { createMediaPreview } from '../../src/utils/mediaPreview'
import { getVideoPoster, videoThumbnailURL } from '../../src/utils/videoPoster'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
})
describe('video posters', () => {
  it('uses a versioned thumbnail endpoint only for videos', () => {
    expect(videoThumbnailURL({ id: 'a', mimeType: 'image/png' })).toBeNull()
    expect(videoThumbnailURL({ id: 'a', mimeType: 'video/webm', updatedAt: 'v1' })).toBe(
      '/api/media/a/poster?v=2-v1',
    )
  })
  it('caches extracted frames, shares concurrent work, and refreshes replaced files', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'poster-test-'))
    dirs.push(dir)
    await fs.writeFile(path.join(dir, 'clip.webm'), 'video')
    let extractions = 0
    const extract = async () => {
      extractions++
      const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'frame-test-'))
      dirs.push(temp)
      const output = path.join(temp, 'poster.jpg')
      await fs.writeFile(output, `frame-${extractions}`)
      return output
    }
    const doc = { id: 'clip', filename: 'clip.webm', mimeType: 'video/webm', updatedAt: 'v1' }
    const frames = await Promise.all([
      getVideoPoster(doc, dir, extract),
      getVideoPoster(doc, dir, extract),
    ])
    expect(extractions).toBe(1)
    expect(frames[0].equals(frames[1])).toBe(true)
    await getVideoPoster(doc, dir, extract)
    expect(extractions).toBe(1)
    expect((await getVideoPoster({ ...doc, updatedAt: 'v2' }, dir, extract)).toString()).toBe(
      'frame-2',
    )
  })
  it('selects a representative frame rather than a blank opening frame', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'poster-real-'))
    dirs.push(dir)
    for (let frame = 0; frame < 13; frame++) {
      await sharp({
        create: {
          width: 64,
          height: 64,
          channels: 3,
          background: frame < 3 ? '#000000' : '#008000',
        },
      })
        .png()
        .toFile(path.join(dir, `frame${String(frame).padStart(2, '0')}.png`))
    }
    await new Promise<void>((resolve, reject) => {
      ffmpeg(path.join(dir, 'frame%02d.png'))
        .inputFPS(10)
        .videoCodec('libvpx-vp9')
        .on('end', () => resolve())
        .on('error', reject)
        .save(path.join(dir, 'clip.webm'))
    })
    const poster = await getVideoPoster(
      { id: 'real', filename: 'clip.webm', mimeType: 'video/webm' },
      dir,
    )
    const preview = await createMediaPreview(
      await fs.readFile(path.join(dir, 'clip.webm')),
      'video/webm',
    )
    const previewBytes = Buffer.from(preview!.split(',')[1], 'base64')
    expect((await sharp(previewBytes).metadata()).width).toBe(32)
    expect((await sharp(previewBytes).stats()).channels[1].mean).toBeGreaterThan(60)
    const { channels } = await sharp(poster).stats()
    expect(channels[1].mean).toBeGreaterThan(60)
  })
  it('rejects filenames outside the upload directory', async () => {
    await expect(
      getVideoPoster({ id: 'bad', filename: '../secret', mimeType: 'video/webm' }, '/tmp'),
    ).rejects.toThrow('Invalid video filename')
  })
})
