import { useAuth } from '../../shared/auth/context'
import CloudLearner from './CloudLearner'
import TopicCard from './TopicCard'
import LearnerHeader from './LearnerHeader'
import LearnerTools from './LearnerTools'
import shell from './learner-shell.module.css'
import { cloudRecords, trialRecords } from './records'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { sampleWorkspace } from './sample-data'
import { boardPage, notePosition } from './board-layout'
import type { Note } from './types'
import reactImage from './assets/react.svg'
import designImage from './assets/design.svg'
import englishImage from './assets/english.svg'
import styles from './learner.module.css'

const images: Record<string, string> = { react: reactImage, design: designImage, english: englishImage }
const root = '/post-it-learner'

function NoteDetail({ note, close }: { note: Note; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    return () => { before?.focus() }
  }, [])
  return <dialog ref={dialog} className={styles.dialog} aria-label={note.title} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) close() }}><button className={styles.close} onClick={close} aria-label="닫기">×</button><img src={images[note.topic] ?? designImage} alt="학습 주제 예시 일러스트" /><p className={styles.date}>{note.date.slice(0, 10)}</p><h2>{note.title}</h2><p className={styles.body}>{note.body}</p><p className={styles.tag}># {note.tag}</p></dialog>
}

export default function LearnerPage() {
  const { status, user } = useAuth()
  const owner = user?.id
  const records = useMemo(() => owner ? cloudRecords(owner) : null, [owner])
  return <div className={shell.app}><div className={shell.content}>
    {status === 'preview' ? <DevelopmentLearner /> : records && <CloudLearner key={owner} records={records} />}
  </div></div>
}

function DevelopmentLearner() {
  const { '*': path = '' } = useParams()
  const [records] = useState(trialRecords)
  return path === 'try' || path.startsWith('try/')
    ? <CloudLearner records={records} trial />
    : <PreviewLearner />
}

function PreviewLearner() {
  const { '*': subpath = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') ?? ''
  const topicId = subpath.startsWith('topics/') ? subpath.slice(7) : null
  const topic = sampleWorkspace.topics.find(item => item.id === topicId)
  const requestedPage = Number(params.get('page') ?? '0')
  const notes = sampleWorkspace.notes.filter(note => note.topic === topicId && `${note.title} ${note.body} ${note.tag}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const stack = boardPage(notes, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0)
  const selected = sampleWorkspace.notes.find(note => note.id === params.get('note') && note.topic === topicId)
  function updateQuery(value: string) { setParams(value ? { q: value } : {}, { replace: true }) }
  function closeDetail() { const next = new URLSearchParams(params); next.delete('note'); setParams(next, { replace: true }) }
  const invalid = subpath !== '' && !topic
  return <div className={styles.learner}>
    <LearnerHeader root={root} inTopic={Boolean(topic)} />
    {topic && <div className={styles.title}><div><h2>{topic.name}</h2><p>{topic.description}</p></div></div>}
    <div className={styles.notice}>
      <p>예시 데이터로 둘러보는 화면입니다. 개인 기록을 불러오거나 저장하지 않습니다.</p>
      <Link className={styles.trialLink} to={`${root}/try`}>기록 기능 체험하기</Link>
    </div>
    {invalid ? <section className={styles.empty}><h2>학습 대상을 찾을 수 없습니다.</h2><Link to={root}>학습 대상 목록으로</Link></section> : <>
      {!topic && <h2>학습 대상 <span>{sampleWorkspace.topics.length}</span></h2>}
      <LearnerTools key={subpath} label={topic ? '포스트잇 검색' : '학습 대상 검색'} query={query} onSearch={updateQuery} />
      {!topic ? <div className={styles.topics}>{sampleWorkspace.topics.filter(item => `${item.name} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(item => <TopicCard key={item.id} to={`${root}/topics/${item.id}`} cover={images[item.id] ?? designImage} name={item.name} description={item.description} noteCount={sampleWorkspace.notes.filter(note => note.topic === item.id).length} />)}{sampleWorkspace.topics.every(item => !`${item.name} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p role="status">일치하는 학습 대상이 없습니다.</p>}</div> : <>
        <section className={styles.frame} aria-label={`${topic.name} 코르크 보드`}><div className={styles.board}>{stack.notes.map((note, index) => <button key={note.id} className={`${styles.note} ${styles[note.color]}`} style={notePosition(index)} onClick={() => { const next = new URLSearchParams(params); next.set('note', note.id); setParams(next) }}><span className={styles.pin} /><div className={styles.polaroid}><img src={images[note.topic] ?? designImage} alt="학습 주제 예시 일러스트" /><span>{note.date.slice(0, 10)}</span></div><h3>{note.title}</h3><p># {note.tag}</p></button>)}{notes.length === 0 && <p className={styles.empty} role="status">일치하는 기록이 없습니다.</p>}</div></section>
        <div className={styles.pagination}><span>{notes.length}장의 예시 기록 · 한 보드에 최대 12장</span><div><button disabled={stack.page === 0} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(stack.page - 1)); setParams(next) }}>최근</button><span>{stack.page + 1} / {stack.pages}</span><button disabled={stack.page === stack.pages - 1} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(stack.page + 1)); setParams(next) }}>이전 기록</button></div></div>
        <p className={styles.caption}>카드를 선택하면 자세히 볼 수 있습니다. 겹친 카드는 마우스를 올리거나 키보드로 선택하면 앞으로 나옵니다.</p>
      </>}
    </>}
    <div className={styles.bottom}><Link to="/">← MIG DOT 메인</Link><button onClick={() => navigate('/documentations')}>사용 안내 →</button></div>
    {selected && <NoteDetail key={selected.id} note={selected} close={closeDetail} />}
  </div>
}
