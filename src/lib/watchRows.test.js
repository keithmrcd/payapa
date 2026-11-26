import { describe, it, expect, vi } from 'vitest'
import { reactive, nextTick } from 'vue'
import { watchRows } from './watchRows'

describe('watchRows', () => {
  it('fires when a row is added or replaced in place, the way the store writes', async () => {
    const store = reactive({ items: [{ id: 'a' }], cards: [], cardStatements: [], payments: [] })
    const cb = vi.fn()
    watchRows(store, cb)
    store.items.push({ id: 'b' })
    await nextTick()
    expect(cb).toHaveBeenCalledTimes(1)
    store.payments.splice(0, 0, { id: 'p' })
    await nextTick()
    expect(cb).toHaveBeenCalledTimes(2)
    store.items.splice(0, 1, { id: 'a', name: 'edited' })
    await nextTick()
    expect(cb).toHaveBeenCalledTimes(3)
  })
})
