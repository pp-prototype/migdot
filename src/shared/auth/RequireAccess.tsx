import { Link, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './context'

export default function RequireAccess({ moduleId, ownerOnly = false, children }: { moduleId?: string; ownerOnly?: boolean; children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <p role="status">접근 권한을 확인하는 중입니다…</p>
  if (auth.status === 'anonymous') return <Navigate replace to={`/login?${new URLSearchParams({ next: location.pathname + location.search })}`} />
  if (auth.status === 'unconfigured') return <section className="access-panel"><h1>로그인 설정이 필요합니다.</h1><p>서비스 연결 설정이 완료되면 이용할 수 있습니다.</p><Link to="/">메인으로 이동</Link></section>
  if (auth.status === 'error') return <section className="access-panel" role="alert"><h1>접근 권한을 확인하지 못했습니다.</h1><p>{auth.error}</p><button onClick={() => void auth.refresh()}>다시 확인</button><button onClick={() => void auth.signOut()}>로그아웃 다시 시도</button><Link to="/">메인으로 이동</Link></section>
  const allowed = ownerOnly ? auth.status === 'ready' && auth.access?.approved && auth.access.role === 'owner' : moduleId && auth.canAccess(moduleId)
  if (!allowed) return <section className="access-panel"><span className="eyebrow">ACCESS REQUIRED</span><h1>이 공간의 이용 권한이 필요합니다.</h1><p>{auth.status === 'preview' ? 'Supabase 설정 후 실제 운영자 계정으로 로그인해 주세요.' : auth.access?.approved ? '운영자에게 이 모듈의 이용 권한을 요청해 주세요.' : '로그인은 완료되었습니다. 운영자가 권한 관리 화면에서 계정을 확인하고 승인할 수 있습니다. 사용자 ID는 문의할 때만 사용하세요.'}</p>{auth.user && <p className="account-id">내 사용자 ID: {auth.user.id}</p>}<button onClick={() => void auth.refresh()}>권한 다시 확인</button><Link to="/">메인으로 이동</Link></section>
  return <>{children}</>
}
