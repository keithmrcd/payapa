// The Supabase client, or null when the app was built without VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
// (then the app runs local-only, exactly as before milestone 7). The publishable key is public by design;
// Row Level Security is what keeps each account's rows private.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'payapa.auth' } })
  : null
