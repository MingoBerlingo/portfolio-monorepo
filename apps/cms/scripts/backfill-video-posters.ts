import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { getMediaStaticDir } from '../src/utils/replaceMediaFile'
import { getVideoPoster } from '../src/utils/videoPoster'

const payload = await getPayload({ config })
try {
  let page = 1
  let more = true
  let count = 0
  const staticDir = getMediaStaticDir(payload)
  while (more) {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 50,
      page,
      where: { mimeType: { contains: 'video/' } },
    })
    for (const doc of result.docs) {
      try {
        await getVideoPoster(doc, staticDir)
        count++
        console.log(`Preview ready: ${doc.filename}`)
      } catch (error) {
        console.error(`Preview failed: ${doc.filename}`, error)
        process.exitCode = 1
      }
    }
    more = result.hasNextPage
    page++
  }
  console.log(`${count} video previews ready. Existing files and media documents were preserved.`)
} finally {
  await payload.destroy()
}

// Payload's development runtime can keep background handles alive after destroy.
process.exit(process.exitCode || 0)
