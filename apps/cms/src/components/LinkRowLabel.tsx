'use client'

import { useRowLabel } from '@payloadcms/ui'

export const LinkRowLabel = () => {
  const { data } = useRowLabel<{ label?: string }>()
  return <span>{data?.label || 'Untitled'}</span>
}

export const CollaboratorRowLabel = () => {
  const { data } = useRowLabel<{ name?: string }>()
  return <span>{data?.name || 'Untitled'}</span>
}
