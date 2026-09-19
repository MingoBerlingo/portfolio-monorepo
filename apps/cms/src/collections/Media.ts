import type { CollectionConfig, PayloadRequest, SanitizedCollectionConfig } from 'payload'
import { APIError } from 'payload'
import { optimizeVideo } from '../utils/videoOptimization'
import {
  incrementFilename,
  sanitizeMediaFilename,
  sanitizeRenamedFilename,
} from '../utils/mediaFilename'
import { replaceMediaFile } from '../utils/replaceMediaFile'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Where Payload writes uploads — relative, resolved from the app directory. */
function getStaticDir(collection: SanitizedCollectionConfig): string {
  // Payload defaults `staticDir` to the collection slug when it is not set.
  return path.resolve(process.cwd(), collection.upload.staticDir || collection.slug)
}

/**
 * Find a name that neither another media document nor a leftover file on disk
 * uses. Payload only resolves collisions while creating an upload, so renaming a
 * file later has to do it itself (same `-1`, `-2` … scheme).
 */
async function findAvailableFilename({
  desiredFilename,
  ignoreDocumentID,
  staticDir,
  req,
}: {
  desiredFilename: string
  ignoreDocumentID: number | string
  staticDir: string
  req: PayloadRequest
}): Promise<string> {
  const isTaken = async (filename: string): Promise<boolean> => {
    const existing = await req.payload.find({
      collection: 'media',
      where: {
        and: [{ filename: { equals: filename } }, { id: { not_equals: ignoreDocumentID } }],
      },
      depth: 0,
      limit: 1,
      req,
    })

    return existing.totalDocs > 0 || existsSync(path.join(staticDir, filename))
  }

  let filename = desiredFilename
  while (await isTaken(filename)) {
    filename = incrementFilename(filename)
  }

  return filename
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  admin: {
    components: {
      edit: {
        // Payload's upload UI only offers its picker once a document has no file
        // left, so a file that is already there can only be swapped through
        // Remove + upload. This adds a "Replace file" control that posts to the
        // endpoint below (see the component).
        beforeDocumentControls: ['@/components/ReplaceMediaFile#ReplaceMediaFile'],
      },
    },
  },
  endpoints: [
    {
      // Swaps the file of a document while keeping its stored name, so the media
      // URL the site links to stays the same. A regular re-upload always derives
      // a new name (suffixed when taken, which it is for a document replacing its
      // own file), and only the local API can ask Payload to overwrite instead —
      // hence this endpoint rather than Payload's own save.
      handler: async (req) => {
        const id = req.routeParams?.id

        if (typeof id !== 'number' && typeof id !== 'string') {
          throw new APIError('A media document id is required.', 400)
        }

        return Response.json(await replaceMediaFile(req, id))
      },
      method: 'post',
      path: '/:id/replace-file',
    },
  ],
  hooks: {
    beforeOperation: [
      async ({ req, args }) => {
        if (!req.file || !req.file.mimetype) return args

        const mimeType = req.file.mimetype.toLowerCase()
        const isVideo = mimeType === 'video/mp4' || mimeType === 'video/webm'

        if (isVideo) {
          let sourcePath = req.file.tempFilePath

          if (!sourcePath && req.file.data) {
            const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'payload-upload-'))
            sourcePath = path.join(tempDir, req.file.name || 'upload.bin')
            await fs.writeFile(
              sourcePath,
              Buffer.isBuffer(req.file.data) ? req.file.data : Buffer.from(req.file.data),
            )
          }

          if (sourcePath) {
            const optimized = await optimizeVideo(sourcePath)
            const optimizedBuffer = await fs.readFile(optimized.filePath)

            // The name the request asks for owns the file name — a replacement
            // keeps the name the document already has — so the temp file's name
            // only stands in when the request carried none.
            const requestedName = req.file.name || path.basename(sourcePath)
            const filename = `${path.basename(requestedName, path.extname(requestedName))}.webm`

            req.file = {
              ...req.file,
              name: filename,
              data: optimizedBuffer,
              size: optimizedBuffer.length,
              mimetype: optimized.mimeType,
            }

            await fs.rm(path.dirname(optimized.filePath), { recursive: true, force: true })
          }
        }

        // The name is used verbatim in the media URL, so store it URL-safe:
        // spaces would be percent-encoded by every consumer, which then decodes
        // back to a name that does not exist on disk. Runs after the video branch
        // so the rewritten `.webm` name is covered too.
        if (req.file.name) {
          req.file = { ...req.file, name: sanitizeMediaFilename(req.file.name) }
        }

        return args
      },
    ],
    beforeChange: [
      async ({ collection, data, operation, originalDoc, req }) => {
        let nextData = data

        if (req.file && req.file.mimetype) {
          const mimeType = req.file.mimetype.toLowerCase()
          const isVideo = mimeType === 'video/mp4' || mimeType === 'video/webm'

          if (isVideo) {
            nextData = {
              ...nextData,
              mimeType: req.file.mimetype,
              filename: req.file.name || nextData.filename,
            }
          }
        }

        // Renaming from the dashboard (no new file): keep the stored name
        // URL-safe and free of collisions. `afterChange` moves the file on disk.
        if (!req.file && operation === 'update' && typeof originalDoc?.filename === 'string') {
          if (typeof nextData.filename === 'string') {
            // An emptied field falls back to the current name instead of
            // leaving the document without a file name.
            let filename = nextData.filename.trim()
              ? sanitizeRenamedFilename(nextData.filename, originalDoc.filename)
              : originalDoc.filename

            if (filename !== originalDoc.filename) {
              filename = await findAvailableFilename({
                desiredFilename: filename,
                ignoreDocumentID: originalDoc.id,
                staticDir: getStaticDir(collection),
                req,
              })
            }

            nextData = { ...nextData, filename }
          }
        }

        return nextData
      },
    ],
    afterChange: [
      async ({ collection, doc, operation, previousDoc, req }) => {
        if (operation !== 'update') return doc

        // A new upload on an existing document ("replace file") already wrote
        // the file under its final name and deleted the previous one, so there
        // is nothing to move: renaming here would fail (the old file is gone) or
        // overwrite the replacement with the old bytes.
        if (req.file) return doc

        const previousFilename =
          typeof previousDoc?.filename === 'string' ? previousDoc.filename : null
        const filename = typeof doc.filename === 'string' ? doc.filename : null

        if (!previousFilename || !filename || previousFilename === filename) return doc

        const staticDir = getStaticDir(collection)
        const previousPath = path.join(staticDir, previousFilename)

        // The previous file can also be gone when it was replaced or removed
        // outside of this request — there is nothing to move then either.
        if (!existsSync(previousPath)) return doc

        try {
          await fs.rename(previousPath, path.join(staticDir, filename))
        } catch (err) {
          req.payload.logger.error(
            `[media] "${previousFilename}" was renamed to "${filename}" in the database, but the file on disk could not be renamed: ${String(err)}`,
          )
        }

        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      // Payload ships `filename` as a hidden, read-only field. Re-declaring it
      // only overrides those admin flags (upload base fields are deep-merged),
      // which makes the file renamable from the dashboard; the hooks above
      // sanitize the value and move the file on disk to keep the two in sync.
      name: 'filename',
      type: 'text',
      label: 'File name',
      admin: {
        description:
          'Renames the stored file (spaces and special characters become dashes, the extension is kept).',
        hidden: false,
        readOnly: false,
      },
    },
  ],
  upload: true,
}
