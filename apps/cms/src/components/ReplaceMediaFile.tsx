'use client'

import { Button, toast, useConfig, useDocumentInfo, useForm } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useRef, useState } from 'react'

/**
 * "Replace file" control for the media edit view.
 *
 * Payload's default upload UI only reveals its file picker when the document has
 * no file left (its Remove button has to be clicked first), and a regular
 * re-upload renames the file, which would change the URL the site links to.
 *
 * This posts the pick to the media collection's `/:id/replace-file` endpoint
 * instead, which asks Payload to overwrite the stored file: the previous file is
 * deleted, the new bytes land under the existing name (only the extension
 * follows the format) and every naming hook plus the file metadata still runs.
 *
 * Mounted through `Media.admin.components.edit.beforeDocumentControls`.
 */
export const ReplaceMediaFile = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { config } = useConfig()
  const { collectionSlug, data, docPermissions, id } = useDocumentInfo()
  const { reset } = useForm()
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<File | null>(null)

  // Replacing needs an existing document and update access; creating a document
  // already has its own picker.
  if (!id || !docPermissions?.update) {
    return null
  }

  const replace = async (file: File) => {
    setBusy(true)

    try {
      const body = new FormData()
      body.append('file', file)

      const response = await fetch(
        `${config.serverURL}${config.routes.api}/${collectionSlug}/${id}/replace-file`,
        { body, credentials: 'include', method: 'POST' },
      )

      if (!response.ok) {
        const failure = await response.json().catch(() => null)
        const message = failure?.errors?.[0]?.message || failure?.message

        throw new Error(message || `Replacing the file failed (${response.status})`)
      }

      const doc = await response.json()
      toast.success(`Replaced with “${file.name}” — stored as “${doc?.filename}”.`)
      setPicked(null)
      // The document changed outside the form: re-read it so the file details
      // and the stored metadata show the new file.
      await reset(undefined)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Replacing the file failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <React.Fragment>
      <Button
        buttonStyle="pill"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        size="medium"
        type="button"
      >
        Replace file
      </Button>
      <input
        accept="image/*,video/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Clear the input so picking the same file again still fires a change.
          event.target.value = ''
          setPicked(file || null)
        }}
        ref={inputRef}
        type="file"
      />
      {busy && <span> Replacing…</span>}
      {!busy && picked && (
        <span>
          {' '}
          Replace “{typeof data?.filename === 'string' ? data.filename : 'this file'}” with “
          {picked.name}”?{' '}
          <Button
            buttonStyle="pill"
            onClick={() => void replace(picked)}
            size="small"
            type="button"
          >
            Replace
          </Button>{' '}
          <Button buttonStyle="none" onClick={() => setPicked(null)} size="small" type="button">
            Cancel
          </Button>
        </span>
      )}
    </React.Fragment>
  )
}
