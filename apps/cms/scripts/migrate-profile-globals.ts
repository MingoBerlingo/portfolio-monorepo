import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'

// Run once with a JSON export of the former Profile global as the argument.
const snapshotPath = process.argv[2]
if (!snapshotPath) throw new Error('Provide the path to the exported Profile JSON.')
const previous = JSON.parse(await readFile(snapshotPath, 'utf8'))
const payload = await getPayload({ config })
try {
  const hero = await payload.findGlobal({ slug: 'hero', depth: 0 })
  if (!hero.updatedAt) {
    await payload.updateGlobal({ slug: 'hero', data: {
      greeting: 'Hey!',
      nameLine: `I’m ${previous.name} ${previous.surname}.`,
      introduction: `I’m a ${previous.jobPosition} based in Lecco, Italy 🇮🇹`,
      homepageIntroduction: previous.homepageIntroduction,
      homepageImages: (previous.homepageImages ?? []).map((entry: { key: string; alt?: string; image: string | { id: string } }) => ({
        key: entry.key, alt: entry.alt,
        image: typeof entry.image === 'object' ? entry.image.id : entry.image,
      })),
    } })
  }
  const footer = await payload.findGlobal({ slug: 'footer' })
  await payload.updateGlobal({ slug: 'footer', data: {
    heading: footer.heading || 'Make it clear. Make it feel right.',
    keywordsHeading: footer.keywordsHeading || 'A few things I work with',
    signature: footer.signature || 'In ♥ with pixels',
  } })
  console.log('Hero and Footer globals populated. Profile biography and contacts preserved.')
} finally { await payload.destroy() }
