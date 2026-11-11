/** Read-only bridge for the loopback resume app. Uses this checkout's CMS .env. */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const locale = process.argv[2]
if (locale !== 'en' && locale !== 'it') throw new Error('Unsupported resume locale')
const payload = await getPayload({ config })
try {
  const collection = async (slug: 'experiences' | 'education' | 'publications' | 'research') => {
    const docs: unknown[] = []
    let page = 1
    while (true) {
      const result = await payload.find({
        collection: slug, locale, fallbackLocale: false, depth: 0,
        overrideAccess: true, limit: 100, page,
        sort: slug === 'experiences' || slug === 'education' ? '-startDate' : slug === 'research' ? '-date' : '-createdAt',
      })
      docs.push(...result.docs)
      if (!result.hasNextPage) return docs
      page = result.nextPage!
    }
  }
  const [profile, experiences, education, publications, research] = await Promise.all([
    payload.findGlobal({ slug: 'profile', locale, fallbackLocale: false, depth: 0, overrideAccess: true }),
    collection('experiences'), collection('education'), collection('publications'), collection('research'),
  ])
  // Prefix is on its own line so Payload startup logs cannot be mistaken for data.
  await new Promise<void>((resolve, reject) => {
    process.stdout.write('\n__PORTFOLIO_RESUME_JSON__=' + JSON.stringify({ profile, experiences, education, publications, research }) + '\n', error => error ? reject(error) : resolve())
  })
} finally { await payload.destroy() }

// This one-shot reader has flushed its result and closed MongoDB; stop dependency timers.
process.exit(0)
