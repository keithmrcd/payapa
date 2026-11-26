// Sign-in (email + code), the owner's first name on the account, and the sync runner. Local-first: nothing here blocks the app,
// and every failure leaves the data on the phone, to be uploaded on the next run.

import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { setCurrentUser } from '@/db'
import { push, pull, foreignRows } from '@/lib/sync'
import { useMoney } from './money'
import { userName, setUserName } from '@/lib/prefs'

let client = supabase
/** Tests only: swap in a fake client (null = built without Supabase config). */
export function _setClient(c) { client = c }

let running = null
let queued = false
let timer = null
let signingOut = false // our own sign-out, as opposed to an expired session

const OTHER_ACCOUNT = 'This phone has data from another account.'

function sendError(e) {
  const m = `${e?.message ?? ''}`
  if (/signups? not allowed/i.test(m)) return 'This email isn’t set up for Payapa yet.'
  if (e?.status === 429 || /rate limit|security purposes/i.test(m)) return 'Too many tries. Wait a minute, then send a new code.'
  if (/fetch|network/i.test(m)) return 'No internet. Try again when you’re online.'
  return 'Couldn’t send the code. Try again.'
}

function syncState(e) {
  const m = `${e?.message ?? e ?? ''}`
  if (/jwt|refresh token|not authenticated|401/i.test(m)) return 'auth'
  if ((typeof navigator !== 'undefined' && navigator.onLine === false) || /fetch|network|timeout|load failed|5\d\d/i.test(m)) return 'offline'
  return 'error'
}

export const useSession = defineStore('session', {
  state: () => ({
    user: null, // { id, email }
    // unavailable | off (signed out) | idle | syncing | ok | offline | auth (sign in again) | error
    status: client ? 'off' : 'unavailable',
    lastSynced: null, // ISO instant of the last finished sync
    needsName: false, // signed in, and neither the account nor this phone has a first name yet
    remoteName: null, // the first name saved on the Supabase account (user_metadata.name)
  }),

  actions: {
    _signedIn(u) {
      this.user = { id: u.id, email: u.email }
      setCurrentUser(u.id)
      // The name saved on the account wins at sign-in (a new phone gets it back); with none, ask once.
      this.remoteName = u.user_metadata?.name?.trim() || null
      if (this.remoteName) setUserName(this.remoteName)
      this.needsName = !this.remoteName && !userName.value.trim()
    },
    _signedOut() {
      this.user = null
      this.needsName = false
      this.remoteName = null
      setCurrentUser(null)
      this.status = client ? 'off' : 'unavailable'
    },

    /** Restore a saved session; call before the first sync. */
    async init() {
      if (!client) { this.status = 'unavailable'; return }
      const { data } = await client.auth.getSession()
      const u = data?.session?.user
      if (u && (await foreignRows(u.id))) await client.auth.signOut({ scope: 'local' }).catch(() => {})
      else if (u) { this._signedIn(u); this.status = 'idle' }
      // A SIGNED_OUT we didn't ask for is an expired session: keep the account shown and ask to sign in again.
      client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT' && this.user && !signingOut) this.status = 'auth' })
    },

    async sendCode(email) {
      const { error } = await client.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } })
      if (error) throw new Error(sendError(error))
    },

    /** Check the code, refuse a phone holding another account's rows, then upload everything. */
    async verify(email, code) {
      const { data, error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
      if (error || !data?.user) {
        throw new Error(/fetch|network/i.test(error?.message ?? '') ? 'No internet. Try again when you’re online.' : 'That code didn’t work. Check it or send a new one.')
      }
      if (await foreignRows(data.user.id)) {
        await client.auth.signOut({ scope: 'local' })
        throw new Error(OTHER_ACCOUNT)
      }
      this._signedIn(data.user)
      this.sync() // the first backup runs in the background; the sheet can close now
    },

    /** Save the first name on this phone now, and on the account when online (else with the next sync). */
    async saveName(name) {
      setUserName(name.trim())
      this.needsName = false
      try { await this._pushName() } catch (e) { console.warn('name', e) }
    },

    async _pushName() {
      const n = userName.value.trim()
      if (!client || !this.user || !n || n === this.remoteName) return
      const { error } = await client.auth.updateUser({ data: { name: n } })
      if (error) throw new Error(error.message || 'Name not saved')
      this.remoteName = n
    },

    /** Stops syncing. Every row stays on the phone. */
    async signOut() {
      clearTimeout(timer)
      signingOut = true
      this._signedOut()
      try { if (client) await client.auth.signOut({ scope: 'local' }) } catch { /* offline: the local session is cleared anyway */ } finally { signingOut = false }
    },

    /** Push, then pull, one run at a time; a request during a run queues one more. */
    sync() {
      if (!client || !this.user) return Promise.resolve()
      if (running) { queued = true; return running }
      running = (async () => {
        do {
          queued = false
          await this._runOnce()
        } while (queued)
      })().finally(() => { running = null })
      return running
    },

    async _runOnce() {
      const user = this.user
      if (!user) return
      const still = () => this.user?.id === user.id // signed out (or switched) mid-run: leave the status alone
      this.status = 'syncing'
      try {
        await push(client, user.id)
        const changed = await pull(client)
        if (changed.length) useMoney().applyRemote(changed)
        if (!still()) return
        await this._pushName()
        this.status = 'ok'
        this.lastSynced = new Date().toISOString()
      } catch (e) {
        console.warn('sync', e)
        if (still()) this.status = syncState(e)
      }
    },

    /** Sync a moment after a change, so a burst of edits makes one run. */
    soon(ms = 2000) {
      if (!this.user) return
      clearTimeout(timer)
      timer = setTimeout(() => this.sync(), ms)
    },
  },
})
