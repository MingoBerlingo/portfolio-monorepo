/** Dry run by default. Pass --apply --backup=/absolute/path/new-file.json to write. */
import 'dotenv/config'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'

const require = createRequire(import.meta.url)
const adapterRequire = createRequire(require.resolve('@payloadcms/db-mongodb'))
const { MongoClient } = adapterRequire('mongodb')
const { EJSON } = adapterRequire('bson')
const apply = process.argv.includes('--apply')
const backup = process.argv.find((arg) => arg.startsWith('--backup='))?.slice(9)
if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is required')
if (apply && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URI).hostname))
  throw new Error('This migration may only write to a local MongoDB.')
if (apply && !backup) throw new Error('--apply requires --backup=/absolute/path/new-file.json')

function splitList(text: string): string[] {
  return text.split(/,(?![^()]*\))|\r?\n/).map((item) => item.trim()).filter(Boolean)
}

const client = new MongoClient(process.env.DATABASE_URI, { serverSelectionTimeoutMS: 5000 })
try {
  await client.connect()
  const globals = client.db().collection('globals')
  const profile = await globals.findOne({ globalType: 'profile' })
  if (!profile) throw new Error('No Profile global was found')

  const set: Record<string, unknown> = {}
  const localized = (value: unknown) =>
    typeof value === 'string' || Array.isArray(value) ? { en: value } : (value ?? {}) as Record<string, unknown>
  const skills = localized(profile.skills)
  const languages = { ...localized(profile.languages) }
  const digital = { ...localized(profile.digitalSkills) }
  const professional = { ...localized(profile.professionalSkills) }
  for (const locale of ['en', 'it']) {
    const languageText = languages[locale]
    if (typeof languageText === 'string') {
      languages[locale] = splitList(languageText).map((item) => item.replace(/\.$/, ''))
      set.languages = languages
    }
    const skillText = skills[locale]
    if (typeof skillText !== 'string') continue
    const digitalItems: string[] = []
    const professionalItems: string[] = []
    for (const line of skillText.split(/\r?\n/)) {
      const digitalMatch = line.match(/^\s*(?:digital skills|competenze digitali)\s*:\s*(.*)$/i)
      const professionalMatch = line.match(/^\s*(?:professional skills|competenze professionali)\s*:\s*(.*)$/i)
      const licenceMatch = line.match(/^\s*(?:driving licen[cs]e|patente)\s*:\s*(.*)$/i)
      if (digitalMatch) digitalItems.push(...splitList(digitalMatch[1]))
      else if (!licenceMatch) professionalItems.push(...splitList(professionalMatch?.[1] ?? line))
    }
    if (digital[locale] == null && digitalItems.length) {
      digital[locale] = digitalItems
      set.digitalSkills = digital
    }
    if (professional[locale] == null && professionalItems.length) {
      professional[locale] = professionalItems
      set.professionalSkills = professional
    }
  }
  if (set.languages && profile.legacyLanguages == null) set.legacyLanguages = profile.languages
  console.log(`${apply ? 'Apply' : 'Dry run'}: ${Object.keys(set).join(', ') || 'no changes'}`)
  if (apply && Object.keys(set).length) {
    await writeFile(backup!, EJSON.stringify(profile, null, 2), { flag: 'wx', mode: 0o600 })
    const result = await globals.updateOne({ _id: profile._id, updatedAt: profile.updatedAt }, { $set: set })
    if (result.matchedCount !== 1) throw new Error('Profile changed during migration. Retry with a new backup path.')
  }
} finally {
  await client.close()
}
