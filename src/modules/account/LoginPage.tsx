import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/context'
import { safeReturnPath } from '../../shared/auth/access'
import { supabase } from '../../shared/lib/supabase'

export default function LoginPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const next = safeReturnPath(params.get('next'))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (auth.status === 'ready') return <Navigate to={next} replace />
  async function login() {
    if (!supabase || pending) return
    setPending(true); setError('')
    try {
      const redirect = new URL('/auth/callback', window.location.origin)
      redirect.searchParams.set('next', next)
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect.toString() } })
      if (error) throw error
    } catch { setError('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'); setPending(false) }
  }
  return <section className="login-card"><span className="eyebrow">ONE ACCOUNT, YOUR WORKSPACE</span><h1>나의 도구로 들어가기</h1><p>한 번의 로그인으로 허용된 앱을 이용하세요.<br />모듈을 사용할 수 있어도 다른 사람의 기록은 공유되지 않습니다.</p>
    <div className="login-symbol" aria-hidden="true">M<span>●</span></div>
    {supabase ? <button className="login-button" disabled={pending || auth.status === 'loading'} onClick={() => void login()}>{pending ? 'Google로 이동 중…' : 'Google로 계속하기'}</button> : <p className="auth-note">로그인 연결 설정이 아직 준비되지 않았습니다.</p>}
    {(error || auth.error) && <p className="auth-error" role="alert">{error || auth.error}</p>}
    <p className="auth-note">첫 로그인 후 운영자의 이용 승인이 필요합니다.<br />현재 브라우저에 로그인 상태가 유지되므로 공용 기기에서는 사용 후 로그아웃하세요.</p><Link className="text-link" to="/">메인으로 돌아가기 →</Link>
  </section>
}

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const [input] = useState(() => ({ code: params.get('code'), failed: params.has('error') || (params.has('sb_flow_id') && !/^[a-zA-Z0-9_-]{8,64}$/.test(params.get('sb_flow_id') ?? '')), flowId: params.get('sb_flow_id'), next: safeReturnPath(params.get('next')) }))
  const exchange = useRef<ReturnType<NonNullable<typeof supabase>['auth']['exchangeCodeForSession']> | null>(null)
  const [failed, setFailed] = useState(false)
  const { refresh } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    let cancelled = false
    // Never retain OAuth codes or provider errors in browser history.
    window.history.replaceState(null, '', '/auth/callback')
    if (!supabase || !input.code || input.failed) return
    exchange.current ??= supabase.auth.exchangeCodeForSession(input.code, input.flowId ? { flowId: input.flowId } : undefined)
    void exchange.current.then(async ({ error }) => {
      if (cancelled) return
      if (error) { setFailed(true); return }
      await refresh()
      if (!cancelled) navigate(input.next, { replace: true })
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [input, navigate, refresh])
  const invalid = failed || input.failed || !input.code || !supabase
  return <section className="login-card"><h1>{invalid ? '로그인을 완료하지 못했습니다.' : '로그인을 확인하고 있습니다.'}</h1>{invalid ? <><p>로그인을 취소했거나 연결이 만료되었습니다. 다시 시작해 주세요.</p><Link className="text-link" to={`/login?${new URLSearchParams({ next: input.next })}`}>로그인 다시 시작 →</Link></> : <p role="status">계정과 접근 권한을 확인하는 중입니다…</p>}</section>
}
