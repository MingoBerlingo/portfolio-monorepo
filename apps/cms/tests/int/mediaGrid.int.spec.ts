import { describe, expect, it } from 'vitest'
import { normalizeMediaGridContent, groupMediaItems } from '../../src/utils/mediaGrid'
import { mediaLayoutConverter } from '../../src/blocks/mediaLayout'

describe('media grid', () => {
  it('converts legacy rows into ordered items with individual widths', () => {
    const content = {
      root: {
        children: [
          {
            type: 'block',
            fields: {
              blockType: 'mediaLayout',
              rows: [
                { columns: '1', images: [{ image: 'a' }, { image: 'b' }] },
                { columns: '2', images: [{ image: 'c' }, { image: 'd' }] },
              ],
            },
          },
        ],
      },
    }
    const converted = normalizeMediaGridContent(content)
    expect((converted.root.children[0].fields as Record<string, unknown>).items).toEqual([
      { image: 'a', width: 'full' },
      { image: 'b', width: 'full' },
      { image: 'c', width: 'half' },
      { image: 'd', width: 'half' },
    ])
    expect(content.root.children[0].fields.rows).toHaveLength(2)
    expect(normalizeMediaGridContent(converted)).toEqual(converted)
  })
  it('preserves the full width of a lone image in a legacy two-column row', () => {
    const content = {
      root: {
        children: [
          {
            type: 'block',
            fields: {
              blockType: 'mediaLayout',
              rows: [
                { columns: '2', images: [{ image: 'a' }] },
                { columns: '2', images: [{ image: 'b' }] },
              ],
            },
          },
        ],
      },
    }
    const result = normalizeMediaGridContent(content)
    expect((result.root.children[0].fields as Record<string, unknown>).items).toEqual([
      { image: 'a', width: 'full' },
      { image: 'b', width: 'full' },
    ])
  })
  it('does not resurrect old rows when all new items are removed', () => {
    const content = {
      root: {
        children: [
          {
            type: 'block',
            fields: {
              blockType: 'mediaLayout',
              gridVersion: 1,
              items: [],
              rows: [{ images: [{ image: 'old' }] }],
            },
          },
        ],
      },
    }
    expect(normalizeMediaGridContent(content).root.children[0].fields.items).toEqual([])
  })
  it('leaves an unpaired half empty and never reorders items to fill a gap', () => {
    const items = [
      { image: 'a', width: 'half' },
      { image: 'b', width: 'full' },
      { image: 'c', width: 'half' },
      { image: 'd', width: 'half' },
      { image: 'e', width: 'half' },
    ]
    expect(groupMediaItems(items).map((row) => row.items.map((item) => item.image))).toEqual([
      ['a'],
      ['b'],
      ['c', 'd'],
      ['e'],
    ])
    expect(groupMediaItems(items).map((row) => row.columns)).toEqual(['2', '1', '2', '2'])
  })
  it('renders grid items and marks lone halves to preserve the empty column', async () => {
    const html = await (mediaLayoutConverter as Function)({
      node: {
        fields: {
          items: [
            { width: 'half', image: { mimeType: 'image/jpeg', url: '/a.jpg' } },
            { width: 'full', image: { mimeType: 'image/jpeg', url: '/b.jpg' } },
          ],
        },
      },
    })
    expect(html).toContain('media-layout--grid')
    expect(html).toContain('media-layout-row--columns-2')
    expect(html.indexOf('/a.jpg')).toBeLessThan(html.indexOf('/b.jpg'))
  })
})
