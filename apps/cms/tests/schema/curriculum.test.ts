import { test } from 'vitest'
import assert from 'node:assert/strict'
import { Curriculum } from '../../src/globals/Curriculum'
import { cvTranslation } from '../../src/fields/cvTranslation'

test('CV-only content cannot be read anonymously', () => {
  const read = Curriculum.access!.read as Function
  const update = Curriculum.access!.update as Function
  assert.equal(read({ req: {} }), false)
  assert.equal(update({ req: {} }), false)
  assert.equal(read({ req: { user: { id: 'editor' } } }), true)
})

test('translations are opt-in additions, not changes to original storage', () => {
  const field = cvTranslation([{ name: 'role', type: 'text' }])
  assert.equal('name' in field && field.name, 'cvTranslation')
  assert.equal(field.localized, true)
  assert.equal(field.type, 'group')
})
