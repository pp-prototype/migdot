import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { useAuth } from '../../shared/auth/context'
import { Icon } from '../../shared/Icon'
import styles from './launch.module.css'

type Condition = { id: string; text: string; minutes: number }
type Topic = { id: string; name: string; conditions: Condition[] }
type View = 'ready' | 'checking' | 'approved' | 'deferred'

const emptyCondition = (): Condition => ({ id: crypto.randomUUID(), text: '', minutes: 0 })
const example: Topic = {
  id: 'delivery',
  name: '야식 배달',
  conditions: [
    { id: 'food', text: '집에 먹을 게 있는지 확인했다.', minutes: 0 },
    { id: 'budget', text: '이번 주 배달 예산 안이다.', minutes: 0 },
    { id: 'wait', text: '잠깐 기다린 뒤에도 주문하고 싶다.', minutes: 10 },
  ],
}

function loadTopics(key?: string): Topic[] {
  if (!key) return [example]
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return [example]
    const topics = JSON.parse(raw) as Topic[]
    return Array.isArray(topics) && topics.every(topic => typeof topic.id === 'string' && typeof topic.name === 'string'
      && Array.isArray(topic.conditions) && topic.conditions.length >= 1 && topic.conditions.length <= 6
      && topic.conditions.every(condition => typeof condition.id === 'string' && typeof condition.text === 'string'
        && Number.isInteger(condition.minutes) && condition.minutes >= 0 && condition.minutes <= 1440)) ? topics : [example]
  } catch { return [example] }
}

function Mecha({ stage, view }: { stage: number; view: View }) {
  return <div className={styles.hangar} data-stage={stage} data-view={view} aria-hidden="true">
    <div className={styles.hangarGrid} />
    <div className={styles.ring} />
    <div className={styles.robot}>
      <div className={styles.legs}><i /><i /></div>
      <div className={styles.arms}><i /><i /></div>
      <div className={styles.body}><i /></div>
      <div className={styles.helmet}><i /></div>
    </div>
    <div className={styles.deck} />
    <div className={styles.steam}><i /><i /><i /><i /></div>
  </div>
}

function Gear({ condition, deadline, now, engaged, lock, unlock, start }: {
  condition: Condition
  deadline: number | undefined
  now: number
  engaged: boolean
  lock: () => void
  unlock: () => void
  start: () => void
}) {
  const [position, setPosition] = useState(0)
  const dragStart = useRef(0)
  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0
  const waiting = condition.minutes > 0 && (!deadline || remaining > 0)
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
  function pointerPosition(event: PointerEvent<HTMLInputElement>) {
    const travel = Math.max(1, event.currentTarget.clientWidth - 38)
    return Math.round(Math.min(1, Math.max(0, (event.clientX - dragStart.current) / travel)) * 100)
  }
  return <li className={styles.condition} data-locked={engaged}>
    <div className={styles.conditionTitle}>
      <label htmlFor={`gear-${condition.id}`}>{condition.text}</label>
      <span>{engaged ? '잠금 완료' : waiting ? '대기' : '확인 대기'}</span>
    </div>
    {waiting ? <div className={styles.wait}>
      {deadline ? <p>남은 대기 시간 <strong>{clock}</strong></p> : <button className={styles.secondary} onClick={start}>{condition.minutes}분 대기 시작</button>}
    </div> : <div className={styles.gearRow}>
      <input className={styles.gear} id={`gear-${condition.id}`} type="range" min="0" max="100" step="1"
        disabled={engaged} value={engaged ? 100 : position} aria-valuetext={engaged ? '잠금 완료' : `${position}%`}
        onChange={event => {
          const next = Number(event.target.value)
          setPosition(next === 100 ? 0 : next)
          if (next === 100) lock()
        }}
        onPointerDown={event => {
          if (event.button !== 0) return
          event.preventDefault()
          event.currentTarget.focus({ preventScroll: true })
          event.currentTarget.setPointerCapture(event.pointerId)
          dragStart.current = event.clientX
        }}
        onPointerMove={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setPosition(pointerPosition(event))
        }}
        onPointerUp={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          if (pointerPosition(event) >= 96) lock()
          setPosition(0)
        }}
        onPointerCancel={() => setPosition(0)} />
      <button className={styles.secondary} onClick={engaged ? unlock : lock} aria-label={`${condition.text} ${engaged ? '잠금 해제' : '확인'}`}>
        {engaged ? '해제' : '확인'}
      </button>
    </div>}
  </li>
}

function TopicForm({ initial, cancel, save }: { initial?: Topic; cancel: () => void; save: (topic: Topic) => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [conditions, setConditions] = useState(() => initial?.conditions ?? Array.from({ length: 3 }, emptyCondition))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || conditions.some(condition => !condition.text.trim())) return
    save({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), conditions: conditions.map(condition => ({ ...condition, text: condition.text.trim() })) })
  }
  return <form className={styles.editor} onSubmit={submit}>
    <h2>{initial ? '출격 주제 수정' : '새 출격 주제'}</h2>
    <label>주제 이름<input required maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="예: 새 운동화 사기" /></label>
    {conditions.map((condition, index) => <fieldset key={condition.id}>
      <legend>확인 조건 {index + 1}</legend>
      <label>조건 문구<input required maxLength={110} value={condition.text} onChange={event => {
        const text = event.target.value
        setConditions(items => items.map(item => item.id === condition.id ? { ...item, text } : item))
      }} /></label>
      <label>대기 시간 (분)<input required type="number" min="0" max="1440" step="1" value={condition.minutes} onChange={event => {
        const minutes = Number(event.target.value)
        setConditions(items => items.map(item => item.id === condition.id ? { ...item, minutes } : item))
      }} /></label>
      {conditions.length > 1 && <button type="button" className={styles.secondary} onClick={() => setConditions(items => items.filter(item => item.id !== condition.id))}>조건 {index + 1} 삭제</button>}
    </fieldset>)}
    <p>대기 시간이 0분이면 바로 확인할 수 있어요.</p>
    <div className={styles.actions}>
      {conditions.length < 6 && <button type="button" className={styles.secondary} onClick={() => setConditions(items => [...items, emptyCondition()])}>조건 추가</button>}
      <button type="button" className={styles.secondary} onClick={cancel}>닫기</button>
      <button className={styles.primary}>주제 저장</button>
    </div>
  </form>
}

export default function ResolveLaunchPage() {
  const { user } = useAuth()
  const storageKey = user ? `migdot-resolve-launch:${user.id}` : undefined
  return <ControlRoom key={storageKey ?? 'preview'} storageKey={storageKey} />
}

function ControlRoom({ storageKey }: { storageKey?: string }) {
  const [topics, setTopics] = useState(() => loadTopics(storageKey))
  const [selected, setSelected] = useState(topics[0]?.id ?? '')
  const [editor, setEditor] = useState<Topic | 'new' | null>(null)
  const [view, setView] = useState<View>('ready')
  const [locked, setLocked] = useState<string[]>([])
  const [deadlines, setDeadlines] = useState<Record<string, number>>({})
  const [now, setNow] = useState(Date.now)
  const [storageError, setStorageError] = useState(false)
  const topic = topics.find(item => item.id === selected)
  const complete = Boolean(topic && locked.length === topic.conditions.length)
  const stage = topic ? complete ? 3 : Math.floor(locked.length * 3 / topic.conditions.length) : 0
  const waiting = Object.values(deadlines).some(deadline => deadline > now)

  useEffect(() => {
    if (!waiting || view !== 'checking') return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [waiting, view])

  function reset(next: View) {
    setLocked([])
    setDeadlines({})
    setView(next)
  }

  function saveTopic(next: Topic) {
    const updated = topics.some(item => item.id === next.id)
      ? topics.map(item => item.id === next.id ? next : item)
      : [...topics, next]
    try {
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
      setStorageError(false)
    } catch { setStorageError(true) }
    setTopics(updated)
    setSelected(next.id)
    setEditor(null)
    reset('ready')
  }

  function lockCondition(condition: Condition) {
    if (view !== 'checking') return
    if (condition.minutes && !(deadlines[condition.id] && deadlines[condition.id] <= now)) return
    setLocked(items => items.includes(condition.id) ? items : [...items, condition.id])
  }

  const status = view === 'approved' ? '출격 승인' : view === 'deferred' ? '격납고 복귀' : complete ? '합체 완료 · 출격 준비' : '출격 대기'
  return <div className={styles.surface}><div className={styles.room}>
    <header className={styles.header}>
      <h1><span aria-hidden="true"><Icon name="check" /></span>결심 출격 관제실</h1>
      <button className={styles.secondary} onClick={() => setEditor('new')}>새 출격 주제</button>
    </header>
    {storageError && <p role="alert">브라우저에 주제를 저장하지 못했습니다. 이번 화면에서는 계속 사용할 수 있습니다.</p>}
    {editor ? <TopicForm initial={editor === 'new' ? undefined : editor} cancel={() => setEditor(null)} save={saveTopic} /> : <>
      <div className={styles.topicBar}>
        <label>출격 주제<select value={selected} onChange={event => { setSelected(event.target.value); reset('ready') }}>
          {!topics.length && <option value="">등록된 주제가 없습니다</option>}
          {topics.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        {topic && <button className={styles.secondary} onClick={() => setEditor(topic)}>주제 수정</button>}
      </div>
      {topic && <div className={styles.control} data-view={view} data-complete={complete}>
        <section className={styles.display} aria-label="격납고">
          <p role="status">{status}</p>
          <Mecha stage={stage} view={view} />
          {view === 'checking' && <p className={styles.counter} aria-live="polite">잠금 {locked.length} / {topic.conditions.length}</p>}
        </section>
        <section className={styles.console} aria-labelledby="launch-topic">
          <h2 id="launch-topic">{topic.name}</h2>
          {view === 'ready' && <div className={styles.actions}><button className={styles.primary} onClick={() => reset('checking')}>출격 요청</button></div>}
          {view === 'checking' && <>
            <ul className={styles.conditions}>{topic.conditions.map(condition => <Gear key={condition.id} condition={condition}
              deadline={deadlines[condition.id]} now={now} engaged={locked.includes(condition.id)}
              lock={() => lockCondition(condition)} unlock={() => setLocked(items => items.filter(id => id !== condition.id))}
              start={() => {
                const started = Date.now()
                setNow(started)
                setDeadlines(items => ({ ...items, [condition.id]: started + condition.minutes * 60_000 }))
              }} />)}</ul>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={() => reset('deferred')}>격납고 복귀</button>
              <button className={styles.primary} disabled={!complete} onClick={() => { if (complete) setView('approved') }}>최종 출격 승인</button>
            </div>
          </>}
          {(view === 'approved' || view === 'deferred') && <>
            <p>{view === 'approved' ? '조건 확인을 마치고 출격을 결정했어요.' : '지금은 출격하지 않기로 했어요.'}</p>
            <div className={styles.actions}><button className={styles.primary} onClick={() => reset('ready')}>관제실로 돌아가기</button></div>
          </>}
        </section>
      </div>}
    </>}
  </div></div>
}
