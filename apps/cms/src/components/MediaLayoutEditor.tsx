'use client'

import React from 'react'
import { ArrayField, FieldError, useField, useForm, useListDrawer } from '@payloadcms/ui'
import type { ArrayFieldClientComponent, SelectFieldClientComponent } from 'payload'

// Payload memoizes the returned drawer component by these option identities.
// Recreating the filters remounts an open picker and its nested create-media form.
const mediaDrawerOptions: Parameters<typeof useListDrawer>[0] = {
  collectionSlugs: ['media'],
  uploads: true,
  filterOptions: {
    media: {
      or: [{ mimeType: { contains: 'image/' } }, { mimeType: { in: ['video/mp4', 'video/webm'] } }],
    },
  },
}

/** Payload owns all item state, upload drawers, validation and drag sorting. */
export const MediaGridEditor: ArrayFieldClientComponent = (props) => {
  const path = props.path || props.field.name
  const { addFieldRow, getFields } = useForm()
  const [ListDrawer, , { openDrawer, closeDrawer }] = useListDrawer(mediaDrawerOptions)
  const appendMedia = (ids: (number | string)[]) => {
    if (props.readOnly) return
    const start = getFields()[path]?.rows?.length || 0
    ids.forEach((id, index) =>
      addFieldRow({
        path,
        schemaPath: props.schemaPath || path,
        rowIndex: start + index,
        subFieldState: {
          image: { value: id, valid: true, initialValue: id },
          width: { value: 'full', valid: true, initialValue: 'full' },
        },
      }),
    )
    closeDrawer()
  }

  return (
    <div className="media-grid-editor">
      {!props.readOnly && (
        <button className="media-grid-editor__select" type="button" onClick={openDrawer}>
          + Select images or videos
        </button>
      )}
      <ArrayField {...props} forceRender />
      <ListDrawer
        enableRowSelections
        onSelect={({ doc }) => appendMedia([doc.id])}
        onBulkSelect={(selected) =>
          appendMedia([...selected].filter(([, checked]) => checked).map(([id]) => id))
        }
      />
    </div>
  )
}

export const MediaGridWidth: SelectFieldClientComponent = ({ path, field, readOnly }) => {
  const { value, setValue, showError, errorMessage, disabled } = useField<string>({
    path: path || field.name,
  })
  return (
    <div className="media-grid-width field-type" data-width={value === 'half' ? 'half' : 'full'}>
      <div className="media-grid-width__options" role="group" aria-label="Media width">
        {(['full', 'half'] as const).map((width) => (
          <button
            key={width}
            type="button"
            aria-pressed={value === width}
            disabled={readOnly || disabled}
            onClick={() => setValue(width)}
          >
            <span
              className={`media-grid-width__diagram media-grid-width__diagram--${width}`}
              aria-hidden="true"
            >
              <span />
            </span>
            {width === 'full' ? 'Full width' : 'Half width'}
          </button>
        ))}
      </div>
      <FieldError path={path || field.name} showError={showError} message={errorMessage} />
    </div>
  )
}
