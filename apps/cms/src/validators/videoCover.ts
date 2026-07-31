import type { PayloadRequest } from 'payload'

export async function validateVideoCover(
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
    return 'Video cover must be an MP4 or WebM file.'
  }

  const mediaDoc = await req.payload.findByID({
    collection: 'media',
    id: mediaId,
  })

  const mimeType = mediaDoc?.mimeType?.toLowerCase() ?? ''
  const isSupportedVideo = mimeType === 'video/mp4' || mimeType === 'video/webm'

  if (!isSupportedVideo) {
    return 'Video cover must be an MP4 or WebM file.'
  }

  return true as const
}
