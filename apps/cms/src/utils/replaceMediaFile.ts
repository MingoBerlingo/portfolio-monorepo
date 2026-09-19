import type { Payload, PayloadRequest } from 'payload'
import { APIError, addDataAndFileToRequest } from 'payload'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { incrementFilename, replacementFilename } from './mediaFilename'

/** Where the media collection writes its files (mirrors `getStaticDir` in Media.ts). */
export function getMediaStaticDir(payload: Payload): string {
  const upload = payload.collections.media?.config.upload

  if (!upload) {
    throw new APIError('The media collection is not configured for uploads.', 500)
  }

  // Payload defaults `staticDir` to the collection slug when it is not set.
  return path.resolve(process.cwd(), upload.staticDir || 'media')
}

/**
 * Filename a replacement upload is stored under.
 *
 * The document keeps its base name and only follows the replacement's extension
 * (see `replacementFilename`), unless another document or an unrelated file
 * already holds the result: `overwriteExistingFiles` skips Payload's own
 * collision handling, so this is where that safety lives.
 */
export async function resolveReplacementFilename({
  id,
  payload,
  req,
  staticDir,
  storedFilename,
  uploadedName,
}: {
  id: number | string
  payload: Payload
  req?: PayloadRequest
  staticDir: string
  storedFilename: string
  uploadedName: string
}): Promise<string> {
  const desired = replacementFilename(storedFilename, uploadedName)

  // Same name as the file being replaced: overwriting it is the whole point.
  if (desired === storedFilename) return desired

  const isTaken = async (filename: string): Promise<boolean> => {
    const existing = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      req,
      where: {
        and: [{ filename: { equals: filename } }, { id: { not_equals: id } }],
      },
    })

    return existing.totalDocs > 0 || existsSync(path.join(staticDir, filename))
  }

  let filename = desired
  while (await isTaken(filename)) {
    filename = incrementFilename(filename)
  }

  return filename
}

/**
 * Replace the file of an existing media document while keeping its stored name.
 *
 * Payload's regular re-upload always derives a new filename (and appends a
 * suffix when the name is taken, which it is when a document replaces its own
 * file), so the document's URL would change. `overwriteExistingFiles` is what
 * skips that: the previous file is deleted and the new bytes are written under
 * the name we ask for — the same flag Payload's own crop tool relies on.
 *
 * Only the local API can pass that option (the admin's save cannot), which is
 * why this runs behind a collection endpoint.
 */
export async function replaceMediaFile(req: PayloadRequest, id: number | string) {
  await addDataAndFileToRequest(req)

  if (!req.file) {
    throw new APIError('No file was uploaded.', 400)
  }

  const original = await req.payload.findByID({
    collection: 'media',
    depth: 0,
    id,
    req,
  })

  const filename = await resolveReplacementFilename({
    id,
    payload: req.payload,
    staticDir: getMediaStaticDir(req.payload),
    storedFilename: original.filename as string,
    uploadedName: req.file.name,
    req,
  })

  return req.payload.update({
    collection: 'media',
    // `_payload` (e.g. alt) is optional here — the file is what this endpoint is for.
    data: (req.data ?? {}) as Parameters<Payload['update']>[0]['data'],
    file: { ...req.file, name: filename },
    id,
    // Update access still applies; the caller must be allowed to edit the document.
    overrideAccess: false,
    overwriteExistingFiles: true,
    req,
  })
}
