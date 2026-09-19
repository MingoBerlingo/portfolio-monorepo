import type { PayloadRequest } from 'payload'

/**
 * Validates that an upload field points at an image or video.
 *
 * The Media collection only accepts images plus MP4/WebM videos, so this is the
 * same allow-list the media layout block relies on.
 */
export async function validateMedia(
  value: unknown,
  { req }: { req: PayloadRequest },
): Promise<string | true> {
  if (!value) return true as const

  const normalizedValue = Array.isArray(value) ? value[0] : value
  const mediaId =
    typeof normalizedValue === 'string'
      ? normalizedValue
      : (normalizedValue as { id?: string } | null | undefined)?.id

  if (!mediaId) {
    return 'Please select an image or a video.'
  }

  const mediaDoc = await req.payload.findByID({
    collection: 'media',
    id: mediaId,
  })

  const mimeType = mediaDoc?.mimeType?.toLowerCase() ?? ''
  const isImage = mimeType.startsWith('image/')
  const isVideo = mimeType === 'video/mp4' || mimeType === 'video/webm'

  if (!isImage && !isVideo) {
    return 'Please select an image or a video.'
  }

  return true as const
}
