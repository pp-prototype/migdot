import { Suspense } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { modules } from './modules'
import { ModuleBoundary } from '../shared/ModuleBoundary'
import { Icon } from '../shared/Icon'
import { documents } from '../shared/documents/catalog'

function Home() {
  const apps = modules.filter(module => module.kind === 'app')
  const recent = documents.filter(doc => doc.category === 'meetings' || doc.category === 'updates').slice(0, 4)
  return <>
    <section className="welcome">
      <div><p className="eyebrow">나만의 도구, 하나의 공간</p><h1>MIG DOT</h1><p>일상을 위한 앱과 만드는 과정의 기록을 한곳에서.</p></div>
      <div className="dot-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </section>
    <section className="apps-section" aria-labelledby="apps-title">
      <div className="section-heading"><div><h2 id="apps-title">내 앱</h2><p>필요한 도구를 바로 시작하세요.</p></div><span className="count">{apps.length}개</span></div>
      <div className="shortcut-grid">{apps.map(module => <Link className="card shortcut" key={module.id} to={module.path}><span className="module-icon"><Icon name="grid" /></span><h3>{module.title} <span className="preview-label">미리보기</span></h3><p>{module.description}</p><Icon name="arrow" /></Link>)}</div>
    </section>
    <section aria-labelledby="records-title">
      <div className="section-heading"><div><h2 id="records-title">기록과 안내</h2><p>결정의 배경부터 지금의 사용법까지.</p></div></div>
      <div className="shortcut-grid">{modules.filter(module => module.kind === 'records').map(module => <Link className={`card shortcut ${module.id}`} key={module.id} to={module.path}><span className="module-icon"><Icon name={module.id} /></span><h3>{module.title}</h3><p>{module.description}</p><Icon name="arrow" /></Link>)}</div>
    </section>
    <section className="recent-section" aria-labelledby="recent-title">
      <div className="section-heading"><div><h2 id="recent-title">최근 기록</h2><p>조금씩 쌓이는 MIG DOT의 변화</p></div><Link className="text-link" to="/updates">업데이트 보기 <Icon name="arrow" /></Link></div>
      <div className="recent-list">{recent.map(doc => <Link key={doc.path} to={`/${doc.category}?${new URLSearchParams({ doc: doc.path })}`}><span className={`record-type ${doc.category}`}>{doc.category === 'meetings' ? '회의록' : '업데이트'}</span><span className="record-title">{doc.title}</span><time dateTime={doc.date}>{doc.date?.replaceAll('-', '.')}</time><Icon name="arrow" /></Link>)}</div>
    </section>
  </>
}

export default function App() {
  return <div className="app"><a className="skip-link" href="#main">본문으로 이동</a><header className="site-header"><div className="header-inner"><Link className="brand" to="/" aria-label="MIG DOT 메인">MIG<span className="brand-dot" />DOT</Link><nav aria-label="주 메뉴"><NavLink to="/" end><Icon name="home" /><span>메인</span></NavLink>{modules.filter(module => module.kind === 'records').map(module => <NavLink key={module.id} to={module.path}><Icon name={module.id} /><span>{module.title}</span></NavLink>)}</nav><span className="workspace-label"><span />개인 워크스페이스</span></div></header><main id="main" className="main-container"><Routes><Route path="/" element={<Home />} />{modules.map(({ id, path, kind, component: Page }) => <Route key={id} path={kind === 'app' ? `${path}/*` : path} element={<ModuleBoundary key={id}><Suspense fallback={<p role="status">모듈을 불러오는 중입니다…</p>}><Page /></Suspense></ModuleBoundary>} />)}<Route path="*" element={<section className="not-found"><p className="eyebrow">404</p><h1>페이지를 찾을 수 없습니다.</h1><Link className="text-link" to="/">메인으로 이동 <Icon name="arrow" /></Link></section>} /></Routes></main><footer><span className="footer-brand">MIG DOT</span><span>작은 도구들이 연결되는 곳.</span><span className="footer-note">나의 일상을 위한 워크스페이스</span></footer></div>
}
