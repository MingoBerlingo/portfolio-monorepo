import type { CollectionConfig } from 'payload'
import { optimizeVideo } from '../utils/videoOptimization'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    beforeOperation: [
      async ({ req, args }) => {
        if (!req.file || !req.file.mimetype) return args

        const mimeType = req.file.mimetype.toLowerCase()
        const isVideo = mimeType === 'video/mp4' || mimeType === 'video/webm'

        if (!isVideo) return args

        let sourcePath = req.file.tempFilePath

        if (!sourcePath && req.file.data) {
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'payload-upload-'))
          sourcePath = path.join(tempDir, req.file.name || 'upload.bin')
          await fs.writeFile(
            sourcePath,
            Buffer.isBuffer(req.file.data) ? req.file.data : Buffer.from(req.file.data),
          )
        }

        if (!sourcePath) return args

        const optimized = await optimizeVideo(sourcePath)
        const optimizedBuffer = await fs.readFile(optimized.filePath)

        const filename = `${path.basename(sourcePath, path.extname(sourcePath))}.webm`

        req.file = {
          ...req.file,
          name: filename,
          data: optimizedBuffer,
          size: optimizedBuffer.length,
          mimetype: optimized.mimeType,
        }

        await fs.rm(path.dirname(optimized.filePath), { recursive: true, force: true })

        return args
      },
    ],
    beforeChange: [
      async ({ req, data }) => {
        if (!req.file || !req.file.mimetype) return data

        const mimeType = req.file.mimetype.toLowerCase()
        const isVideo = mimeType === 'video/mp4' || mimeType === 'video/webm'

        if (!isVideo) return data

        return {
          ...data,
          mimeType: req.file.mimetype,
          filename: req.file.name || data.filename,
        }
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
