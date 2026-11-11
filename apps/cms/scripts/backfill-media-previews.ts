import 'dotenv/config'
import { getPayload } from 'payload'
import fs from 'node:fs/promises'
import path from 'node:path'
import config from '../src/payload.config'
import { getMediaStaticDir } from '../src/utils/replaceMediaFile'
import { createMediaPreview } from '../src/utils/mediaPreview'

const payload = await getPayload({ config })
try {
  const staticDir = getMediaStaticDir(payload)
  let page = 1
  let more = true
  while (more) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 50,
      page,
      sort: 'id',
    })
    for (const doc of result.docs) {
      if (doc.previewDataURL || !doc.filename || !doc.mimeType) continue
      if (path.basename(doc.filename) !== doc.filename) continue
      try {
        const previewDataURL = await createMediaPreview(
          await fs.readFile(path.join(staticDir, doc.filename)),
          doc.mimeType,
        )
        if (previewDataURL) {
          await payload.update({
            collection: 'media',
            id: doc.id,
            data: { previewDataURL },
            overrideAccess: true,
          })
          console.log(`Preview ready: ${doc.filename}`)
        }
      } catch (error) {
        console.error(`Preview failed: ${doc.filename}`, error)
        process.exitCode = 1
      }
    }
    more = result.hasNextPage
    page++
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode || 0)
