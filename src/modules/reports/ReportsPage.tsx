import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { modules } from '../../shell/modules'
import { documents } from '../../shared/documents/catalog'
import { Icon } from '../../shared/Icon'

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const { pathname } = useLocation()
  const page = modules.find(module => module.path === pathname.replace(/\/$/, ''))!
  const category = page.id
  const all = documents.filter(doc => doc.category === category)
  const matches = all.filter(doc => `${doc.title} ${doc.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const selected = matches.find(doc => doc.path === params.get('doc')) ?? matches[0]
  return <>
    <p className="breadcrumb"><Link to="/">메인</Link><span>/</span>{page.title}</p>
    <h1 className="page-title">{page.title}</h1><p className="intro">{page.description}</p>
    <button className="document-toggle" aria-expanded={listOpen} aria-controls="document-list" onClick={() => setListOpen(!listOpen)}><Icon name={category} />문서 목록 <span>{all.length}</span><Icon name="chevron" /></button>
    <div className={`reports ${listOpen ? 'list-open' : ''}`}><aside id="document-list"><div className="list-heading"><label htmlFor="search">문서 찾기</label><span>{matches.length}개</span></div><div className="search-field"><Icon name="search" /><input id="search" type="search" placeholder="제목이나 내용으로 검색" value={query} onChange={e => setQuery(e.target.value)} /></div><ul>{matches.map(doc => <li key={doc.path}><button aria-label={doc.title} aria-current={selected?.path === doc.path ? 'page' : undefined} onClick={() => { setParams({ doc: doc.path }); setListOpen(false) }}><span>{doc.title}</span>{doc.date && <time dateTime={doc.date}>{doc.date.replaceAll('-', '.')}</time>}</button></li>)}</ul>{matches.length === 0 && <p className="no-results">검색 결과가 없습니다.</p>}</aside><article className="markdown">{selected ? <><div className="document-meta"><span><Icon name={category} />{page.title}</span>{selected.date && <time dateTime={selected.date}>{selected.date.replaceAll('-', '.')}</time>}</div><Markdown remarkPlugins={[remarkGfm]}>{selected.content}</Markdown></> : <div className="no-results"><Icon name="search" /><h2>표시할 문서가 없습니다.</h2><p>다른 검색어로 찾아보세요.</p></div>}<div className="document-footer"><Link className="text-link" to="/">MIG DOT 홈으로 <Icon name="arrow" /></Link></div></article></div>
  </>
}
