import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const sources = import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const categories = [{ id: 'documentation', title: 'Documentation' }, { id: 'meetings', title: 'Meeting Report' }, { id: 'updates', title: 'Development Update' }]
const documents = Object.entries(sources).map(([path, content]) => ({ path, content, category: path.split('/')[2], title: content.match(/^# (.+)$/m)?.[1] ?? path }))

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const category = params.get('type') ?? 'documentation'
  const matches = documents.filter(doc => doc.category === category && `${doc.title} ${doc.content}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const selected = matches.find(doc => doc.path === params.get('doc')) ?? matches[0]
  return <><p className="eyebrow">WORKSPACE / RECORDS</p><h1>기록과 문서</h1><p className="intro">결정의 배경부터 현재 기능의 사용법까지.</p><nav className="tabs" aria-label="문서 유형">{categories.map(item => <button aria-pressed={category === item.id} key={item.id} onClick={() => setParams({ type: item.id })}>{item.title}</button>)}</nav>
    <div className="reports"><aside><label htmlFor="search">문서 검색</label><input id="search" type="search" placeholder="제목 또는 내용" value={query} onChange={e => setQuery(e.target.value)} /><ul>{matches.map(doc => <li key={doc.path}><button aria-current={selected?.path === doc.path ? 'page' : undefined} onClick={() => setParams({ type: category, doc: doc.path })}>{doc.title}</button></li>)}</ul>{matches.length === 0 && <p>검색 결과가 없습니다.</p>}</aside><article className="markdown">{selected ? <Markdown remarkPlugins={[remarkGfm]}>{selected.content}</Markdown> : <p>표시할 문서가 없습니다.</p>}<Link to="/">MIG DOT 홈으로</Link></article></div></>
}
