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

  it('reminder settings default to 9:00 with statement and payday reminders on', async () => {
    stubStorage({ getItem: () => null, setItem: vi.fn() })
    const { reminderPrefs } = await load()
    expect(reminderPrefs.value).toEqual({ time: '09:00', statements: true, payday: true })
  })

  it('reminder settings persist and load back', async () => {
    const store = {}
    stubStorage({ getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } })
    let m = await load()
    m.setReminderPrefs({ time: '19:30', payday: false })
    expect(m.reminderPrefs.value).toEqual({ time: '19:30', statements: true, payday: false })
    m = await load()
    expect(m.reminderPrefs.value).toEqual({ time: '19:30', statements: true, payday: false })
  })

  it('ignores a broken saved value', async () => {
    stubStorage({ getItem: (k) => (k === 'payapa.reminders' ? '{nope' : null), setItem: vi.fn() })
    const { reminderPrefs } = await load()
    expect(reminderPrefs.value.time).toBe('09:00')
  })

  it('the backup nudge flag starts unset and persists', async () => {
    const store = {}
    stubStorage({ getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } })
    let m = await load()
    expect(m.backupNudged.value).toBe(false)
    m.setBackupNudged()
    expect(m.backupNudged.value).toBe(true)
    m = await load()
    expect(m.backupNudged.value).toBe(true)
  })
})
