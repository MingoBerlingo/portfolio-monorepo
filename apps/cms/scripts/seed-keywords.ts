import { getPayload } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
try {
  const labels = [
    'UX / UI',
    'Web Design',
    'Creative Coding',
    'Dataviz',
    'Interaction',
    'Svelte',
    'React',
    'Branding',
  ]
  for (const [order, label] of labels.entries()) {
    const existing = await payload.find({
      collection: 'keywords',
      where: { label: { equals: label } },
      limit: 1,
    })
    if (!existing.docs.length) {
      await payload.create({ collection: 'keywords', data: { label, order, showInFooter: true } })
    }
  }
  payload.logger.info(
    'Starter keywords are ready. Existing records and project assignments were preserved.',
  )
} finally {
  await payload.destroy()
}
