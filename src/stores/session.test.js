import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { db, save, setCurrentUser } from '@/db'
import { fakeClient } from '@/test/fakeSupabase'
import { useSession, _setClient } from './session'
import { useMoney } from './money'

let client
beforeEach(async () => {
  await db.delete() // tests only
  await db.open()
  setActivePinia(createPinia())
  client = fakeClient()
  _setClient(client)
})
afterEach(() => { setCurrentUser(null); _setClient(null) })

describe('session', () => {
  it('without Supabase config, sync is unavailable and nothing breaks', async () => {
    _setClient(null)
    const s = useSession()
    await s.init()
    expect(s.status).toBe('unavailable')
    await s.sync() // no-op
  })

  it('sends a code; a disabled sign-up reads in plain words', async () => {
    const s = useSession()
    await s.sendCode(' Me@Example.com ')
    expect(client.auth.sentTo).toBe('me@example.com')
    client.auth.otpError = { message: 'Signups not allowed for otp', status: 422 }
    await expect(s.sendCode('x@example.com')).rejects.toThrow('This email isn’t set up for Payapa yet.')
  })

  it('a wrong code reads in plain words', async () => {
    const s = useSession()
    await expect(s.verify('me@example.com', '000000')).rejects.toThrow('That code didn’t work. Check it or send a new one.')
    expect(s.user).toBe(null)
  })

  it('signing in claims the phone’s rows, uploads them and tags new saves', async () => {
    const money = useMoney()
    await money.load()
    await money.addItem({ name: 'Meralco', kind: 'bill', category: 'electricity', startDate: '2026-11-20', paydayBucket: 'auto', schedule: [{ effectiveFrom: '2026-11-20', recurrence: 'monthly', dueDay: 20, amount: 1, variable: false }] })
    const s = useSession()
    await s.verify('me@example.com', '123456')
    expect(s.user.id).toBe('u1')
    await s.sync() // the first backup runs in the background after verify
    expect(s.status).toBe('ok')
    expect(client.tables.items.map((r) => r.name)).toEqual(['Meralco'])
    expect(client.tables.accounts).toHaveLength(5)
    expect(await db.items.where('dirty').equals(1).count()).toBe(0)
    expect((await save('items', { name: 'New' })).userId).toBe('u1')
  })

  it('a phone holding another account’s data refuses the sign-in', async () => {
    setCurrentUser('someone-else')
    await save('items', { name: 'Theirs' })
    setCurrentUser(null)
    const s = useSession()
    await expect(s.verify('me@example.com', '123456')).rejects.toThrow('This phone has data from another account.')
    expect(s.user).toBe(null)
    expect(client.auth.signedOut).toBe(1)
    expect(client.tables.items).toEqual([])
  })

  it('a pull that brings rows reloads the store', async () => {
    const money = useMoney()
    await money.load()
    client.tables.items.push({ id: '11111111-1111-4111-8111-111111111111', user_id: 'u1', name: 'From the cloud', kind: 'bill', category: 'water', schedule: [], start_date: '2026-11-01', created_at: '2026-11-01T00:00:00+00:00', updated_at: '2026-11-01T00:00:00+00:00', deleted_at: null, synced_at: '2026-11-26T00:00:00+00:00' })
    const s = useSession()
    await s.verify('me@example.com', '123456')
    await s.sync()
    expect(money.items.map((i) => i.name)).toContain('From the cloud')
  })

  it('signing out keeps every row on the phone and stops tagging saves', async () => {
    const money = useMoney()
    await money.load()
    const s = useSession()
    await s.verify('me@example.com', '123456')
    await s.signOut()
    expect(s.user).toBe(null)
    expect(s.status).toBe('off')
    expect(await db.accounts.count()).toBe(5)
    expect((await save('items', { name: 'Later' })).userId).toBe(null)
  })

  it('one sync at a time: a request during a run queues exactly one more', async () => {
    const money = useMoney()
    await money.load()
    const s = useSession()
    await s.verify('me@example.com', '123456')
    await s.sync()
    const before = client.calls.length
    await save('items', { name: 'A' })
    await Promise.all([s.sync(), s.sync(), s.sync()])
    expect(client.calls.length - before).toBe(1) // A uploaded once; the queued run found nothing dirty
    expect(s.status).toBe('ok')
  })

  it('a failed upload while offline says so and keeps rows dirty', async () => {
    const money = useMoney()
    await money.load()
    const s = useSession()
    await s.verify('me@example.com', '123456')
    await s.sync()
    await save('items', { name: 'A' })
    client.from = () => ({ upsert: async () => ({ error: { message: 'TypeError: Failed to fetch' } }) })
    await s.sync()
    expect(s.status).toBe('offline')
    expect(await db.items.where('dirty').equals(1).count()).toBe(1)
  })
})
