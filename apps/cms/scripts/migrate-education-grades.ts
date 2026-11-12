import 'dotenv/config'
import { writeFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'

// Move trailing grades into the localized grade field. Safe to rerun.
const payload = await getPayload({ config })
try {
  const { docs } = await payload.find({ collection: 'education', locale: 'all', limit: 1000, depth: 0 })
  await writeFile('/tmp/portfolio-education-before-grade-migration.json', JSON.stringify(docs, null, 2), { flag: 'wx', mode: 0o600 }).catch((error) => {
    if (error.code !== 'EEXIST') throw error
  })
  for (const doc of docs) {
    for (const locale of ['en', 'it'] as const) {
      const localized = await payload.findByID({ collection: 'education', id: doc.id, locale, fallbackLocale: false, depth: 0 })
      const match = localized.title?.match(/^(.*?)\s+[–—-]\s*(\d{1,3}\s*\/\s*\d{1,3}(?:\s+(?:e\s+lode|cum\s+laude))?)\s*$/i)
      if (!match) continue
      if (localized.grade && localized.grade !== match[2]) throw new Error(`Conflicting grade for ${doc.id} (${locale})`)
      await payload.update({ collection: 'education', id: doc.id, locale, data: { title: match[1], grade: match[2] } })
      console.log(`Separated education grade: ${doc.id} (${locale})`)
    }
  }
} finally { await payload.destroy() }
process.exit(0)
