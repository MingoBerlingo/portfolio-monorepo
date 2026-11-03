import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  value: 'half',
  setValue: vi.fn(),
  addFieldRow: vi.fn(),
  closeDrawer: vi.fn(),
}))
vi.mock('@payloadcms/ui', () => ({
  useField: () => state,
  FieldError: () => null,
  useForm: () => ({
    addFieldRow: state.addFieldRow,
    getFields: () => ({ items: { rows: [{ id: 'existing' }] } }),
  }),
  // Match Payload: its returned drawer component identity depends on filterOptions.
  useListDrawer: ({ filterOptions }: { filterOptions: unknown }) => [
    React.useMemo(
      () =>
        ({ onBulkSelect }: { onBulkSelect: (map: Map<string, boolean>) => void }) =>
          React.createElement(
            'button',
            {
              onClick: () =>
                onBulkSelect(
                  new Map([
                    ['a', true],
                    ['ignored', false],
                    ['b', true],
                  ]),
                ),
            },
            React.createElement(
              React.Fragment,
              null,
              'Confirm selection',
              React.createElement('input', {
                'aria-label': 'New media alt text',
                defaultValue: '',
              }),
            ),
          ),
      [filterOptions],
    ),
    null,
    { openDrawer: vi.fn(), closeDrawer: state.closeDrawer },
  ],
  ArrayField: () => React.createElement('div', null, 'Media cards'),
}))
import { MediaGridWidth, MediaGridEditor } from '../../src/components/MediaLayoutEditor'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('visual media grid editor', () => {
  it('changes the individual item width', () => {
    const { container } = render(
      React.createElement(MediaGridWidth, {
        path: 'items.0.width',
        field: { name: 'width' },
      } as never),
    )
    expect(container.firstElementChild?.getAttribute('data-width')).toBe('half')
    expect(screen.getByRole('button', { name: 'Half width' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Full width' }))
    expect(state.setValue).toHaveBeenCalledWith('full')
  })
  it('keeps width controls disabled in read-only mode', () => {
    render(
      React.createElement(MediaGridWidth, {
        path: 'width',
        field: { name: 'width' },
        readOnly: true,
      } as never),
    )
    expect((screen.getByRole('button', { name: 'Full width' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })
  it('keeps a new media draft mounted when the parent form rerenders', () => {
    const props = { path: 'items', field: { name: 'items' } } as never
    const view = render(React.createElement(MediaGridEditor, props))
    const input = screen.getByRole('textbox', { name: 'New media alt text' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Draft image description' } })
    view.rerender(React.createElement(MediaGridEditor, props))
    expect(screen.getByRole('textbox', { name: 'New media alt text' })).toBe(input)
    expect(input.value).toBe('Draft image description')
  })
  it('appends all selected media in order and ignores unchecked entries', () => {
    render(
      React.createElement(MediaGridEditor, { path: 'items', field: { name: 'items' } } as never),
    )
    fireEvent.click(screen.getByText('Confirm selection'))
    expect(state.addFieldRow).toHaveBeenCalledTimes(2)
    const calls = state.addFieldRow.mock.calls.map(([args]) => args)
    expect(calls.map((args) => args.rowIndex)).toEqual([1, 2])
    expect(calls.map((args) => args.subFieldState.image.value)).toEqual(['a', 'b'])
    expect(state.closeDrawer).toHaveBeenCalledOnce()
  })
})
