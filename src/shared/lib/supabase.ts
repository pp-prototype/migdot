import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const hasSupabaseSettings = Boolean(url || key)
function createPublicClient() {
  if (!url || !key || key.startsWith('sb_secret_')) return null
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) return null
    if (key.split('.').length === 3) {
      const payload = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')))
      if (payload.role !== 'anon') return null
    }
    return createClient(url, key, {
      auth: { flowType: 'pkce', detectSessionInUrl: false, storageKey: `migdot-${parsed.host.replace(/[^a-zA-Z0-9_-]/g, '-')}-auth` },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }) },
    })
  } catch { return null }
}
// Invalid/partial settings fail closed. Reject admin keys; never put them in VITE_ variables.
export const supabase = createPublicClient()
// This fallback cannot be enabled in a production build.
export const localPreview = import.meta.env.DEV && !hasSupabaseSettings
