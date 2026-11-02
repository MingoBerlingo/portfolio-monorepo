export type MediaGridItem = { image?: unknown; width?: unknown; id?: string }
type MediaGridRow = { columns: '1' | '2'; items: MediaGridItem[] }

/** Sequential packing: a full item always starts a row; halves never jump over it. */
export function groupMediaItems(items: MediaGridItem[]): MediaGridRow[] {
  const rows: MediaGridRow[] = []
  for (const item of items) {
    if (item.width !== 'half') {
      rows.push({ columns: '1', items: [item] })
    } else {
      const previous = rows.at(-1)
      if (previous?.columns === '2' && previous.items.length === 1) previous.items.push(item)
      else rows.push({ columns: '2', items: [item] })
    }
  }
  return rows
}

/** Immutable, idempotent conversion on read/save, including nested lexical blocks. */
export function normalizeMediaGridContent<T>(content: T): T {
  if (Array.isArray(content)) return content.map(normalizeMediaGridContent) as T
  if (!content || typeof content !== 'object') return content
  const value = content as Record<string, unknown>
  if (value.type === 'block' && value.fields && typeof value.fields === 'object') {
    const fields = value.fields as Record<string, unknown>
    if (fields.blockType === 'mediaLayout') {
      const { rows, ...rest } = fields
      let items = Array.isArray(fields.items) ? fields.items : []
      if (fields.gridVersion !== 1 && !items.length && Array.isArray(rows)) {
        items = rows.flatMap((row) =>
          Array.isArray(row?.images)
            ? row.images.map((entry: MediaGridItem) => ({
                ...(entry.id ? { id: entry.id } : {}),
                image: entry.image,
                // Legacy lone media filled its row regardless of the column setting.
                width: row.columns === '1' || row.images.length === 1 ? 'full' : 'half',
              }))
            : [],
        )
      }
      return { ...value, fields: { ...rest, items, gridVersion: 1 } } as T
    }
  }
  // Only walk lexical structure: do not traverse populated media documents.
  return {
    ...value,
    ...(value.root ? { root: normalizeMediaGridContent(value.root) } : {}),
    ...(Array.isArray(value.children)
      ? { children: value.children.map(normalizeMediaGridContent) }
      : {}),
  } as T
}
