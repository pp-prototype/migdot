import { Suspense } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { modules } from './modules'
import { ModuleBoundary } from '../shared/ModuleBoundary'
import { supabase } from '../shared/lib/supabase'

function Home() {
  return <><p className="eyebrow">PERSONAL WORKSPACE / 01</p><h1>나의 도구를 하나의 공간에.</h1><p className="intro">필요한 앱을 연결하고, 만드는 과정을 기록합니다.</p>
    <div className="section-heading"><h2>내 모듈</h2><span>시작하는 공간</span></div>
    <div className="grid gap-5 md:grid-cols-2">{modules.map(module => <Link className="card" key={module.id} to={module.path}><span className="badge">사용 가능</span><h3>{module.title} ↗</h3><p>{module.description}</p></Link>)}
    <article className="card muted"><span className="badge">다음 단계</span><h3>첫 번째 앱 연결</h3><p>이식할 개인용 앱을 선정한 뒤 기능 모듈로 추가합니다.</p></article></div>
    <section className="status"><h2>프로젝트 상태</h2><p>개발 기반 구성 · v0.1.0</p><p>Supabase {supabase ? '클라이언트 설정됨 · 인증 미구현' : '미설정 · 로컬 문서 열람 가능'}</p></section></>
}

export default function App() {
  const location = useLocation()
  return <div className="app"><header><Link className="brand" to="/">MIG<span>●</span>DOT</Link><nav aria-label="주 메뉴"><NavLink to="/" end>홈</NavLink><NavLink to="/reports">기록과 문서</NavLink></nav><span className="workspace-label">개인 통합 워크스페이스</span></header><main id="main"><Routes><Route path="/" element={<Home />} />{modules.map(({ id, path, component: Page }) => <Route key={id} path={`${path}/*`} element={<ModuleBoundary key={location.pathname}><Suspense fallback={<p role="status">모듈을 불러오는 중입니다…</p>}><Page /></Suspense></ModuleBoundary>} />)}<Route path="*" element={<><h1>페이지를 찾을 수 없습니다.</h1><Link to="/">홈으로 이동</Link></>} /></Routes></main><footer>MIG DOT <span>작은 도구들이 연결되는 곳.</span></footer></div>
}
