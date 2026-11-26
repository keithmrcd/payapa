import { TABLES } from '@/lib/sync'

// A tiny in-memory stand-in for the parts of supabase-js that sync uses.
export function fakeClient() {
  const tables = Object.fromEntries(TABLES.map((t) => [t.remote, []]))
  let clock = 0
  const calls = []
  const auth = {
    user: null,
    signInWithOtp: async ({ email }) => (auth.otpError ? { error: auth.otpError } : (auth.sentTo = email, { error: null })),
    verifyOtp: async ({ email, token }) => (token === '123456' ? (auth.user = { id: auth.nextUserId ?? 'u1', email, user_metadata: { ...(auth.metadata ?? {}) } }, { data: { user: auth.user, session: {} }, error: null }) : { data: {}, error: { message: 'Token has expired or is invalid', status: 403 } }),
    updateUser: async ({ data }) => { if (auth.updateError) return { error: auth.updateError }; auth.metadata = { ...(auth.metadata ?? {}), ...data }; auth.updates = (auth.updates ?? 0) + 1; return { data: { user: { ...auth.user, user_metadata: auth.metadata } }, error: null } },
    signOut: async () => { auth.user = null; auth.signedOut = (auth.signedOut ?? 0) + 1; return { error: null } },
    getSession: async () => ({ data: { session: auth.user ? { user: auth.user } : null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  }
  return {
    tables, calls, auth,
    from(name) {
      const rows = tables[name]
      return {
        async upsert(recs, opts) {
          calls.push({ name, n: recs.length, opts })
          for (const r of recs) {
            const i = rows.findIndex((x) => x.id === r.id && x.user_id === r.user_id)
            const synced_at = `2026-11-26T00:00:${String(++clock).padStart(2, '0')}.000000+00:00`
            if (i === -1) rows.push({ ...r, synced_at })
            // Like the schema trigger: an older copy keeps the stored row, re-stamped so the sender pulls it back.
            else rows[i] = Date.parse(r.updated_at) > Date.parse(rows[i].updated_at) ? { ...r, synced_at } : { ...rows[i], synced_at }
          }
          return { error: null }
        },
        select() {
          let filter = () => true
          let limit = Infinity
          const q = {
            gte(col, v) { filter = (r) => Date.parse(r[col]) >= Date.parse(v); return q },
            // Only the keyset form sync uses: synced_at.gt."T",and(synced_at.eq."T",id.gt.ID)
            or(expr) {
              const m = expr.match(/^synced_at\.gt\."([^"]+)",and\(synced_at\.eq\."([^"]+)",id\.gt\.(.+)\)$/)
              if (!m) throw new Error(`fake or() can't parse ${expr}`)
              const at = Date.parse(m[1]); const id = m[3]
              filter = (r) => Date.parse(r.synced_at) > at || (Date.parse(r.synced_at) === at && r.id > id)
              return q
            },
            order() { return q },
            limit(n) { limit = n; return q },
            then(resolve) {
              const data = rows.filter(filter).sort((a, b) => (a.synced_at < b.synced_at ? -1 : a.synced_at > b.synced_at ? 1 : a.id < b.id ? -1 : 1)).slice(0, limit)
              resolve({ data, error: null })
            },
          }
          return q
        },
      }
    },
  }
}
