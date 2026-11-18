import { Suspense } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { modules } from './modules'
import { ModuleBoundary } from '../shared/ModuleBoundary'
import { Icon } from '../shared/Icon'
import { documents } from '../shared/documents/catalog'
import { useAuth } from '../shared/auth/context'
import RequireAccess from '../shared/auth/RequireAccess'
import LoginPage, { AuthCallbackPage } from '../modules/account/LoginPage'
import AccessAdminPage from '../modules/account/AccessAdminPage'

function Home() {
  const auth = useAuth()
  const { search } = useLocation()
  // Supabase can return a PKCE code to the configured Site URL.
  if (new URLSearchParams(search).has('code')) {
    return <Navigate to={{ pathname: '/auth/callback', search }} replace />
  }
  const apps = modules.filter(module => module.kind === 'app' && auth.canAccess(module.id))
  const recordModules = modules.filter(module => module.kind === 'records' && auth.canAccess(module.id))
  const recent = documents.filter(doc => (doc.category === 'meetings' || doc.category === 'updates') && auth.canAccess(doc.category)).slice(0, 4)
  return <>
    <section className="welcome">
      <div><p className="eyebrow">나만의 도구, 하나의 공간</p><h1>MIG DOT</h1><p>일상을 위한 앱과 만드는 과정의 기록을 한곳에서.</p></div>
      <div className="dot-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </section>
    {auth.status === 'ready' && !auth.access?.approved && <section className="auth-callout"><h2>이용 승인을 기다리고 있습니다.</h2><p>운영자가 앱의 권한 관리 화면에서 계정을 확인할 수 있습니다. 승인 후 이용 가능한 앱이 표시됩니다. 아래 ID는 문의할 때만 사용하세요.</p><p className="account-id">{auth.user?.id}</p><button onClick={() => void auth.refresh()}>권한 다시 확인</button></section>}
    {auth.status === 'loading' && <p role="status">이용 가능한 공간을 확인하는 중입니다…</p>}
    {auth.status === 'error' && <div className="auth-callout" role="alert"><p>{auth.error}</p><button onClick={() => void auth.refresh()}>다시 확인</button></div>}
    {auth.status === 'ready' && auth.access?.approved && auth.access.role === 'owner' && <section className="auth-callout" aria-labelledby="owner-title"><p className="eyebrow">WORKSPACE ADMIN</p><h2 id="owner-title">사용자 승인과 모듈 관리</h2><p>새로 로그인한 계정을 확인하고 이용 승인과 모듈별 접근 권한을 관리하세요.</p><Link className="text-link" to="/settings/access">승인 대기 사용자 확인 →</Link></section>}
    <section className="apps-section" aria-labelledby="apps-title">
      <div className="section-heading"><div><h2 id="apps-title">내 앱</h2><p>필요한 도구를 바로 시작하세요.</p></div><span className="count">{apps.length}개</span></div>
      {apps.length === 0 && <div className="empty-apps"><span className="empty-icon"><Icon name="grid" /></span><div><h3>{auth.status === 'anonymous' ? '로그인하고 나의 앱을 확인하세요' : '현재 이용 가능한 앱이 없습니다'}</h3><p>이용 승인을 받은 모듈이 이곳에 표시됩니다.</p></div><Link className="text-link" to="/login">로그인 안내 →</Link></div>}
      <div className="shortcut-grid">{apps.map(module => <Link className="card shortcut" key={module.id} to={module.path}><span className="module-icon"><Icon name="grid" /></span><h3>{module.title} {(module.id !== 'execution-tracker' || auth.status === 'preview') && <span className="preview-label">미리보기</span>}</h3><p>{module.description}</p><Icon name="arrow" /></Link>)}</div>
    </section>
    {recordModules.length > 0 && <section aria-labelledby="records-title">
      <div className="section-heading"><div><h2 id="records-title">기록과 안내</h2><p>결정의 배경부터 지금의 사용법까지.</p></div></div>
      <div className="shortcut-grid">{recordModules.map(module => <Link className={`card shortcut ${module.id}`} key={module.id} to={module.path}><span className="module-icon"><Icon name={module.id} /></span><h3>{module.title}</h3><p>{module.description}</p><Icon name="arrow" /></Link>)}</div>
    </section>
    }
    {recent.length > 0 && <section className="recent-section" aria-labelledby="recent-title">
      <div className="section-heading"><div><h2 id="recent-title">최근 기록</h2><p>조금씩 쌓이는 MIG DOT의 변화</p></div>{auth.canAccess('updates') && <Link className="text-link" to="/updates">업데이트 보기 <Icon name="arrow" /></Link>}</div>
      <div className="recent-list">{recent.map(doc => <Link key={doc.path} to={`/${doc.category}?${new URLSearchParams({ doc: doc.path })}`}><span className={`record-type ${doc.category}`}>{doc.category === 'meetings' ? '회의록' : '업데이트'}</span><span className="record-title">{doc.title}</span><time dateTime={doc.date}>{doc.date?.replaceAll('-', '.')}</time><Icon name="arrow" /></Link>)}</div>
    </section>}
  </>
}

function AppNavigation() {
  const auth = useAuth()
  const apps = modules.filter(module => module.kind === 'app' && auth.canAccess(module.id))

  if (apps.length === 0) return null

  return <nav className="app-nav" aria-label="내 앱">
    <div className="app-nav-inner">
      {apps.map(module => <NavLink key={module.id} to={module.path}>{module.title}</NavLink>)}
    </div>
  </nav>
}

export default function App() {
  const auth = useAuth()
  const recordModules = modules.filter(module => module.kind === 'records' && auth.canAccess(module.id))
  return <div className="app"><a className="skip-link" href="#main">본문으로 이동</a><header className="site-header"><div className="header-inner"><Link className="brand" to="/" aria-label="MIG DOT 메인">MIG<span className="brand-dot" />DOT</Link><nav aria-label="주 메뉴" style={{ gridTemplateColumns: `repeat(${recordModules.length + 1}, 1fr)` }}><NavLink to="/" end><Icon name="home" /><span>메인</span></NavLink>{recordModules.map(module => <NavLink key={module.id} to={module.path}><Icon name={module.id} /><span>{module.title}</span></NavLink>)}</nav><div className="auth-controls">{auth.status === 'ready' && auth.user ? <><span className="account-name" title={auth.user.email}>내 계정</span>{auth.access?.role === 'owner' && <Link to="/settings/access">권한 관리</Link>}<button onClick={() => void auth.signOut()}>로그아웃</button></> : <Link to="/login">{auth.status === 'preview' ? '로그인 설정' : '로그인'}</Link>}</div></div></header><AppNavigation /><main id="main" className="main-container"><Routes><Route path="/" element={<Home />} /><Route path="/login" element={<LoginPage />} /><Route path="/auth/callback" element={<AuthCallbackPage />} /><Route path="/settings/access" element={<RequireAccess ownerOnly><AccessAdminPage /></RequireAccess>} />{modules.map(({ id, path, kind, component: Page }) => <Route key={id} path={kind === 'app' ? `${path}/*` : path} element={<RequireAccess moduleId={id}><ModuleBoundary key={`${id}:${auth.user?.id ?? 'preview'}`}><Suspense fallback={<p role="status">모듈을 불러오는 중입니다…</p>}><Page /></Suspense></ModuleBoundary></RequireAccess>} />)}<Route path="*" element={<section className="not-found"><p className="eyebrow">404</p><h1>페이지를 찾을 수 없습니다.</h1><Link className="text-link" to="/">메인으로 이동 <Icon name="arrow" /></Link></section>} /></Routes></main><footer><span className="footer-brand">MIG DOT</span><span>작은 도구들이 연결되는 곳.</span><span className="footer-note">나의 일상을 위한 워크스페이스</span></footer></div>
}
