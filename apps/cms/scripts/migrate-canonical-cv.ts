/** Dry run: pnpm exec tsx scripts/migrate-canonical-cv.ts
 * Apply: add --apply --backup=/absolute/path/cv-backup.json (new file required).
 * Run with CMS stopped. Uses raw Mongo exclusively; never deletes legacy fields.
 */
import 'dotenv/config'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { migrateDocument, curriculumEntries, profileCurriculumFields } from './canonical-cv-transform'
const require = createRequire(import.meta.url)
const adapterRequire = createRequire(require.resolve('@payloadcms/db-mongodb'))
const { MongoClient, EJSON } = (() => { const mongodb = adapterRequire('mongodb'); const bson = adapterRequire('bson'); return { ...mongodb, EJSON: bson.EJSON } })()
const apply = process.argv.includes('--apply')
const backup = process.argv.find(arg => arg.startsWith('--backup='))?.slice(9)
if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is required')
if (apply && !backup) throw new Error('--apply requires --backup=/absolute/path/new-file.json')
const client = new MongoClient(process.env.DATABASE_URI)
await client.connect()
try {
  const db = client.db()
  const names = ['globals', 'experiences', 'education', 'publications', 'research']
  const snapshot: Record<string, any[]> = {}
  for (const name of names) snapshot[name] = await db.collection(name).find({}).toArray()
  const curriculum = snapshot.globals.find(doc => doc.globalType === 'curriculum') || {}
  const operations: { collection: string; filter: any; update: any; upsert?: boolean }[] = []
  for (const [collection, kind] of [['globals', 'profile'], ['experiences', 'experiences'], ['education', 'education']]) {
    for (const doc of snapshot[collection].filter(doc => collection !== 'globals' || doc.globalType === 'profile')) {
      const migrated = migrateDocument(kind, doc)
      const next = kind === 'profile' ? profileCurriculumFields(migrated, curriculum) : migrated
      // Only set transformed fields: preserve raw ObjectIds, dates and untouched data.
      const set: Record<string, any> = {}
      for (const field of kind === 'profile' ? ['jobPosition', 'presentation', 'phone', 'location', 'skills', 'languages', 'additionalInfo'] : kind === 'experiences' ? ['role', 'industries', 'activities'] : ['title', 'details']) if (next[field] !== undefined && EJSON.stringify(next[field]) !== EJSON.stringify(doc[field])) set[field] = next[field]
      if (Object.keys(set).length) operations.push({ collection, filter: { _id: doc._id }, update: { $set: set } })
    }
  }
  for (const collection of ['publications', 'research'] as const) for (const entry of curriculumEntries(curriculum, collection)) {
    if (!snapshot[collection].some(doc => doc.migrationKey === entry.migrationKey)) operations.push({ collection, filter: { migrationKey: entry.migrationKey }, update: { $setOnInsert: { ...entry, createdAt: new Date(), updatedAt: new Date() } }, upsert: true })
  }
  console.log(`${apply ? 'Apply' : 'Dry run'}: ${operations.length} document updates/inserts. Legacy data retained.`)
  if (apply) {
    await writeFile(backup!, EJSON.stringify({ createdAt: new Date(), collections: snapshot }, null, 2), { flag: 'wx', mode: 0o600 })
    console.log(`Raw BSON-preserving backup saved: ${backup}`)
    for (const op of operations) await db.collection(op.collection).updateOne(op.filter, op.update, { upsert: op.upsert || false })
  }
} finally { await client.close() }
