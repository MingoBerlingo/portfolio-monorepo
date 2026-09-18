/** Anything that is not URL-safe in a path segment. */
const UNSAFE_FILENAME_CHARS = /[^A-Za-z0-9._-]+/g

/**
 * Turn a file name into a URL-safe one, e.g. `My Covid Souvenir 1.jpg` becomes
 * `My-Covid-Souvenir-1.jpg`.
 *
 * The name lands verbatim in the media URL (`/api/media/file/<name>`), and a
 * name with spaces is percent-encoded by every consumer — static hosts then
 * decode it back and look for a file that does not exist on disk. Sanitizing on
 * the way in keeps the URL, the database row and the file on disk identical.
 *
 * This is the only place that owns media names: the web build downloads whatever
 * the CMS reports and only warns when a name still needs percent-encoding
 * (`apps/web/src/lib/server/cms-images.ts`).
 */
export function sanitizeMediaFilename(name: string): string {
  let decoded = name
  try {
    decoded = decodeURIComponent(name)
  } catch {
    // Not valid percent-encoding (e.g. a stray `%`) — slugify it as-is.
  }

  const lastDot = decoded.lastIndexOf('.')
  const base = lastDot > 0 ? decoded.slice(0, lastDot) : decoded
  const ext = lastDot > 0 ? decoded.slice(lastDot) : ''

  const safeBase = base
    .normalize('NFKD') // split accented characters so they can be transliterated
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNSAFE_FILENAME_CHARS, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  const safeExt = ext.toLowerCase().replace(UNSAFE_FILENAME_CHARS, '')

  return `${safeBase || 'media'}${safeExt}`
}

/**
 * `poster.jpg` → `poster-1.jpg`, `poster-1.jpg` → `poster-2.jpg`.
 * Same scheme Payload uses for name collisions on upload.
 */
export function incrementFilename(name: string): string {
  const lastDot = name.lastIndexOf('.')
  const base = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext = lastDot > 0 ? name.slice(lastDot) : ''

  const match = base.match(/^(.*)-(\d+)$/)
  const incremented = match ? `${match[1]}-${Number(match[2]) + 1}` : `${base}-1`

  return `${incremented}${ext}`
}

/**
 * Rename semantics for the editable `filename` field: sanitize the requested
 * name but keep the current extension, because renaming does not change the
 * format of the file on disk and Payload does not recalculate `mimeType`.
 */
export function sanitizeRenamedFilename(requested: string, current: string): string {
  const currentExt = current.lastIndexOf('.') > 0 ? current.slice(current.lastIndexOf('.')) : ''
  const sanitized = sanitizeMediaFilename(requested.trim())
  const sanitizedExt =
    sanitized.lastIndexOf('.') > 0 ? sanitized.slice(sanitized.lastIndexOf('.')) : ''

  if (!currentExt || sanitizedExt.toLowerCase() === currentExt.toLowerCase()) {
    return sanitized
  }

  return `${sanitized.slice(0, sanitized.length - sanitizedExt.length)}${currentExt}`
}
