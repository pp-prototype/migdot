import { Suspense } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { modules } from './modules'
import { ModuleBoundary } from '../shared/ModuleBoundary'

function Home() {
  return <><p className="eyebrow">PERSONAL WORKSPACE / 01</p><h1>MIG DOT</h1><p className="intro">필요한 앱을 연결하고, 만드는 과정을 기록합니다.</p>
    <div className="section-heading"><h2>모듈 앱 목록</h2><span>{modules.length}개의 모듈</span></div>
    <div className="grid gap-5 md:grid-cols-3">{modules.map(module => <Link className="card" key={module.id} to={module.path}><span className="badge">사용 가능</span><h3>{module.title} ↗</h3><p>{module.description}</p></Link>)}
    </div></>

}

export default function App() {
  const location = useLocation()
  return <div className="app"><header><Link className="brand" to="/">MIG<span>●</span>DOT</Link><nav aria-label="주 메뉴"><NavLink to="/" end>메인</NavLink>{modules.map(module => <NavLink key={module.id} to={module.path}>{module.title}</NavLink>)}</nav><span className="workspace-label">개인 통합 워크스페이스</span></header><main id="main"><Routes><Route path="/" element={<Home />} />{modules.map(({ id, path, component: Page }) => <Route key={id} path={path} element={<ModuleBoundary key={location.pathname}><Suspense fallback={<p role="status">모듈을 불러오는 중입니다…</p>}><Page /></Suspense></ModuleBoundary>} />)}<Route path="*" element={<><h1>페이지를 찾을 수 없습니다.</h1><Link to="/">홈으로 이동</Link></>} /></Routes></main><footer>MIG DOT <span>작은 도구들이 연결되는 곳.</span></footer></div>
}
