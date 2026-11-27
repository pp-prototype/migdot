import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import RecordEditor, { type Draft } from './RecordEditor'
import TopicCard from './TopicCard'
import LearnerHeader from './LearnerHeader'
import LearnerTools from './LearnerTools'
import { Icon } from '../../shared/Icon'
import shell from './learner-shell.module.css'
import { type LearningRecords, type NoteRecord, type TopicRecord } from './records'
import type { TopicActivity } from './topic-summaries'
import { thumbnailUrl } from './thumbnail'
import defaultCover from './assets/design.svg'
import styles from './cloud.module.css'

const paperTones = ['yellow', 'mint', 'peach', 'blue'] as const

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' })

type Library = { topics: (TopicRecord & TopicActivity)[]; topic: TopicRecord | null; notes: NoteRecord[] }

export default function CloudLearner({ records, trial = false }: { records: LearningRecords; trial?: boolean }) {
  const { '*': subpath = '' } = useParams()
  const path = trial ? subpath.slice(3).replace(/^\//, '') : subpath
  const root = trial ? '/post-it-learner/try' : '/post-it-learner'
  const topicId = /^topics\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.exec(path)?.[1]
  return <LibraryView key={path} records={records} root={root} trial={trial} topicId={topicId} invalid={Boolean(path && !topicId)} />
}

function LibraryView({ records, root, trial, topicId, invalid }: { records: LearningRecords; root: string; trial: boolean; topicId?: string; invalid: boolean }) {
  const [library, setLibrary] = useState<Library | null>(null)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState('')
  const [revision, setRevision] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const detail = useRef<HTMLElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const pendingFocus = useRef<string | null>(null)
  const addNote = useRef<HTMLButtonElement>(null)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') ?? ''
  const noteId = params.get('note')
  const refresh = () => setRevision(value => value + 1)

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') setRevision(value => value + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [])

  useEffect(() => {
    if (invalid) return
    let current = true
    async function read(): Promise<Library> {
      if (!topicId) return { topics: await records.loadTopics(), topic: null, notes: [] }
      const [topic, notes] = await Promise.all([records.loadTopic(topicId), records.loadNotes(topicId)])
      return { topics: [], topic, notes }
    }
    read().then(result => {
      if (!current) return
      setLibrary(result)
      setError(false)
    }).catch(() => {
      if (current) setError(true)
    })
    return () => { current = false }
  }, [records, topicId, invalid, revision])

  useEffect(() => {
    if (noteId && pendingFocus.current === noteId) {
      pendingFocus.current = null
      detail.current?.focus({ preventScroll: true })
      detail.current?.scrollIntoView({ block: 'start' })
    }
  }, [noteId])

  function openNote(id: string, button: HTMLButtonElement) {
    opener.current = button
    if (noteId === id) {
      detail.current?.focus({ preventScroll: true })
      detail.current?.scrollIntoView({ block: 'start' })
      return
    }
    pendingFocus.current = id
    updateParam('note', id)
  }

  function closeNote(deleted = false) {
    updateParam('note', '', true)
    const target = !deleted && opener.current?.isConnected ? opener.current : addNote.current
    target?.focus()
    opener.current = null
  }

  function updateParam(key: string, value: string, replace = false) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace })
  }

  function finish(message: string, createdTopic?: string, deleted?: boolean) {
    setDraft(null)
    if (createdTopic) {
      navigate(`${root}/topics/${createdTopic}`)
      return
    }
    if (deleted) closeNote(true)
    setStatus(message)
    refresh()
  }

  const topic = library?.topic
  const notes = library?.notes ?? []
  const selected = notes.find(note => note.id === noteId)
  const matches = (value: string) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  const visibleNotes = notes.filter(note => matches(`${note.title} ${note.body} ${note.tag}`))
  const visibleTopics = library?.topics.filter(item => matches(`${item.name} ${item.description}`)) ?? []
  const missing = invalid || (topicId && library && !topic)

  return <div className={styles.learner}>
    <LearnerHeader root={root} inTopic={Boolean(topicId)} />
    {library && !missing && (
      <div className={styles.heading}>
        <div>
          <h2 id={topic ? undefined : 'learning-topic-list'}>
            {topic ? topic.name : <>학습 대상 <span>{visibleTopics.length}개</span></>}
          </h2>
          {topic?.description && <p>{topic.description}</p>}
        </div>
      </div>
    )}

    {trial && <div className={styles.feedback}>
      <p>기록 기능 체험 · 작성한 기록은 이 탭에서만 유지되며 새로고침하면 초기화됩니다.</p>
      <Link to="/post-it-learner">예시 보드 보기</Link>
    </div>}
    {status && <p role="status">{status}</p>}
    {error && <div className={styles.feedback}>
      <p role="alert">기록을 불러오지 못했습니다. 연결 상태 또는 로그인 상태를 확인해 주세요.</p>
      <button onClick={refresh}>다시 불러오기</button>
    </div>}
    {missing ? <div className={styles.feedback}><h2>학습 주제를 찾을 수 없습니다.</h2><Link to={root}>학습 주제 목록</Link></div>
      : !library ? !error && <p role="status">기록을 불러오는 중입니다.</p>
        : <>
          <LearnerTools
            label={topic ? '포스트잇 검색' : '학습 주제 검색'}
            query={query}
            onSearch={value => updateParam('q', value, true)}
            create={<button ref={topic ? addNote : undefined} className={shell.create} onClick={() => {
              const id = crypto.randomUUID()
              setDraft(topic ? { kind: 'note', id, topic: topic.id } : { kind: 'topic', id })
            }}>
              <span className={`${shell.logo} ${shell.createPaper}`} aria-hidden="true"><Icon name="plus" /></span>
              {topic ? '새 포스트잇' : '새 학습 주제'}
            </button>}
            management={{ label: topic ? '보드 관리' : '목록 관리', actions: <>
              {topic && <button onClick={() => setDraft({ kind: 'topic', id: topic.id, record: topic })}><Icon name="edit" />주제 수정</button>}
              <button onClick={refresh}><Icon name="refresh" />새로고침</button>
            </> }}
          />
          {noteId && (
            <section key={noteId} ref={detail} id="learning-note-detail" className={styles.detail} aria-label="포스트잇 상세" tabIndex={-1}>
              <div className={styles.detailHeading}>
                {selected && <h2>{selected.title}</h2>}
                <button className={styles.backToBoard} onClick={() => closeNote()}><span aria-hidden="true">← </span>목록으로</button>
              </div>
              {selected ? <>
                {selected.photo_jpeg && <img className={styles.detailPhoto} src={thumbnailUrl(selected.photo_jpeg)} alt="포스트잇 첨부 사진" />}
                <p className={styles.body}>{selected.body}</p>
                <p className={styles.meta}>{dateFormat.format(new Date(selected.created_at))}{selected.tag && ` · #${selected.tag}`}</p>
                <button className={shell.detailAction} onClick={() => setDraft({ kind: 'note', id: selected.id, topic: selected.topic_id, record: selected })}><Icon name="edit" />포스트잇 수정</button>
              </> : <p role="status">포스트잇을 찾을 수 없습니다.</p>}
            </section>
          )}
          {topic ? visibleNotes.length > 0 && (
            <ul className={styles.board} aria-label="포스트잇 보드">
              {visibleNotes.map(note => <li key={note.id}>
                <button
                  className={styles.note}
                  data-tone={paperTones[Number.parseInt(note.id.slice(-1), 16) % paperTones.length]}
                  aria-current={noteId === note.id ? 'true' : undefined}
                  aria-controls={noteId === note.id ? 'learning-note-detail' : undefined}
                  onClick={event => openNote(note.id, event.currentTarget)}
                >
                  <span className={styles.pin} aria-hidden="true" />
                  {note.photo_jpeg && <img className={styles.notePhoto} src={thumbnailUrl(note.photo_jpeg)} alt="" />}
                  <strong>{note.title}</strong>
                  {!note.photo_jpeg && <span className={styles.noteExcerpt} aria-hidden="true">{note.body}</span>}
                  <span className={styles.meta}>{dateFormat.format(new Date(note.created_at))}{note.tag && ` · #${note.tag}`}</span>
                </button>
              </li>)}
            </ul>
          ) : (
            <section className={styles.topicList} aria-labelledby="learning-topic-list">
              <ul className={styles.grid}>
                {visibleTopics.map(item => <li key={item.id}>
                  <TopicCard
                    to={`${root}/topics/${item.id}`}
                    cover={item.thumbnail_jpeg ? thumbnailUrl(item.thumbnail_jpeg) : defaultCover}
                    name={item.name}
                    description={item.description}
                    noteCount={item.noteCount}
                    latestUpload={item.latestUpload}
                  />
                </li>)}
              </ul>
            </section>
          )}
          {(topic ? visibleNotes.length === 0 : visibleTopics.length === 0) &&
            <div className={styles.feedback}>
              <p role="status">{query.trim() ? '일치하는 검색 결과가 없습니다.' : topic
                ? '아직 포스트잇이 없습니다. 배운 내용을 한 장으로 남겨보세요.'
                : '아직 학습 주제가 없습니다. 기록할 주제를 먼저 만들어 보세요.'}</p>
              {query.trim() && <button onClick={() => updateParam('q', '', true)}>검색어 지우기</button>}
            </div>}
        </>}
    {draft && <RecordEditor key={draft.id} draft={draft} records={records} cancel={() => setDraft(null)} done={finish} />}
  </div>
}
