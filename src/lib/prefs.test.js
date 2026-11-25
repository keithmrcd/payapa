import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function stubStorage(impl) {
  vi.stubGlobal('localStorage', impl)
}
const load = async () => {
  vi.resetModules()
  return import('./prefs')
}

describe('prefs', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('loads an empty name by default', async () => {
    stubStorage({ getItem: () => null, setItem: vi.fn() })
    const { userName } = await load()
    expect(userName.value).toBe('')
  })

  it('loads a saved name', async () => {
    stubStorage({ getItem: (k) => (k === 'payapa.name' ? 'Kit' : null), setItem: vi.fn() })
    const { userName } = await load()
    expect(userName.value).toBe('Kit')
  })

  it('setUserName updates the ref and persists', async () => {
    const setItem = vi.fn()
    stubStorage({ getItem: () => null, setItem })
    const { userName, setUserName } = await load()
    setUserName('Ana')
    expect(userName.value).toBe('Ana')
    expect(setItem).toHaveBeenCalledWith('payapa.name', 'Ana')
  })

  it('tolerates localStorage throwing', async () => {
    stubStorage({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    const { userName, setUserName } = await load()
    expect(userName.value).toBe('')
    expect(() => setUserName('Ana')).not.toThrow()
    expect(userName.value).toBe('Ana')
  })
})
