// @vitest-environment node
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { createMediaPreview } from '../../src/utils/mediaPreview'

describe('tiny media previews', () => {
  it('produces a small JPEG data URL with the original aspect ratio', async () => {
    const source = await sharp({
      create: { width: 400, height: 200, channels: 3, background: '#008000' },
    })
      .png()
      .toBuffer()
    const preview = await createMediaPreview(source, 'image/png')
    expect(preview).toMatch(/^data:image\/jpeg;base64,/)
    const bytes = Buffer.from(preview!.split(',')[1], 'base64')
    const metadata = await sharp(bytes).metadata()
    expect(metadata.width).toBe(32)
    expect(metadata.height).toBe(16)
    expect(bytes.length).toBeLessThan(1500)
  })
  it('skips unsupported files and rejects corrupt image bytes', async () => {
    expect(await createMediaPreview(Buffer.from('pdf'), 'application/pdf')).toBeNull()
    await expect(createMediaPreview(Buffer.from('broken'), 'image/png')).rejects.toThrow()
  })
})
