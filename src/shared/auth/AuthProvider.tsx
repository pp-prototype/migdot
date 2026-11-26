import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { disconnectExecutionPush } from '../lib/executionPush'
import { hasSupabaseSettings, localPreview, supabase } from '../lib/supabase'
import { parseAccess } from './access'
import { AuthContext, type AuthState } from './context'

const initial: AuthState = {
  status: localPreview ? 'preview' : supabase ? 'loading' : 'unconfigured',
  user: null, access: null, error: '',
}
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial)
  const session = useRef<Session | null>(null)
  const generation = useRef(0)
  const mounted = useRef(false)
  const logoutPending = useRef(false)
  const request = useRef<AbortController | null>(null)
  const invalidate = useCallback(() => { generation.current++; request.current?.abort() }, [])

  const load = useCallback(async (next: Session | null) => {
    const id = ++generation.current
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const previousUser = session.current?.user.id
    session.current = next
    if (!next || !supabase) {
      if (mounted.current) setState({ status: 'anonymous', user: null, access: null, error: '' })
      return
    }
    if (previousUser !== next.user.id) setState({ status: 'loading', user: null, access: null, error: '' })
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      // Verify the stored identity with Auth; local metadata is never an authorization source.
      const { data: identity, error: identityError } = await supabase.auth.getUser(next.access_token)
      if (controller.signal.aborted) throw new Error('Timed out')
      if (identityError || identity.user?.id !== next.user.id) throw new Error('Invalid session')
      const { data, error } = await supabase.rpc('get_app_access').abortSignal(controller.signal)
      if (error) throw error
      const access = parseAccess(data, identity.user.id)
      if (mounted.current && id === generation.current && !logoutPending.current) setState({ status: 'ready', user: identity.user, access, error: '' })
    } catch {
      if (mounted.current && id === generation.current && !logoutPending.current) setState({ status: 'error', user: null, access: null, error: '로그인 또는 접근 권한을 확인하지 못했습니다. 연결과 계정 상태를 확인해 주세요.' })
    } finally { clearTimeout(timeout) }
  }, [])
  const refresh = useCallback(async () => {
    if (!supabase || logoutPending.current) return
    if (session.current) return load(session.current)
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      setState({ status: 'error', user: null, access: null, error: '로그인 상태를 확인하지 못했습니다.' })
      return
    }
    await load(data.session)
  }, [load])

  useEffect(() => {
    mounted.current = true
    if (!supabase) return () => { mounted.current = false }
    let timer: ReturnType<typeof setTimeout> | undefined
    const client = supabase
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      // Keep this callback synchronous: SDK calls here can deadlock the auth lock.
      if (logoutPending.current) return
      if (session.current?.user.id !== next?.user.id) {
        generation.current++
        request.current?.abort()
        session.current = null
        setState({ status: next ? 'loading' : 'anonymous', user: null, access: null, error: '' })
      }
      clearTimeout(timer)
      timer = setTimeout(() => { if (mounted.current) void load(next) }, 0)
    })
    const startGeneration = generation.current
    void client.auth.getSession().then(({ data: current, error }) => {
      if (!mounted.current || generation.current !== startGeneration || logoutPending.current) return
      if (error) setState({ status: 'error', user: null, access: null, error: '로그인 상태를 확인하지 못했습니다.' })
      else void load(current.session)
    })
    const recheck = () => { if (document.visibilityState === 'visible') void refresh() }
    const interval = setInterval(recheck, 30000)
    window.addEventListener('focus', recheck)
    window.addEventListener('online', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      mounted.current = false; invalidate()
      clearTimeout(timer); clearInterval(interval); data.subscription.unsubscribe()
      window.removeEventListener('focus', recheck); window.removeEventListener('online', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [load, refresh, invalidate])

  const signOut = useCallback(async () => {
    if (!supabase) return
    logoutPending.current = true; generation.current++; request.current?.abort(); session.current = null
    setState({ status: 'loading', user: null, access: null, error: '' })
    try {
      await disconnectExecutionPush().catch(() => undefined)
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      setState({ status: 'anonymous', user: null, access: null, error: '' })
    } catch {
      setState({ status: 'error', user: null, access: null, error: '로그아웃을 완료하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.' })
    } finally { logoutPending.current = false }
  }, [])
  const canAccess = (moduleId: string) => (state.status === 'preview' && moduleId !== 'meta-wallet') || (state.status === 'ready' && state.access?.approved === true && state.access.module_ids.includes(moduleId))
  return <AuthContext.Provider value={{ ...state, refresh, signOut, canAccess }}>{children}{state.status === 'preview' && <div className="development-banner">로컬 개발 체험 · 실제 로그인과 접근 제한은 Supabase 설정 후 검증합니다. 배포 빌드에는 적용되지 않습니다.</div>}{!supabase && hasSupabaseSettings && <div className="development-banner">Supabase URL과 공개 키를 모두 설정해 주세요.</div>}</AuthContext.Provider>
}
