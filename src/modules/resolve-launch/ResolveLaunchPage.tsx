import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { useAuth } from '../../shared/auth/context'
import { Icon } from '../../shared/Icon'
import styles from './launch.module.css'
import MechaModel from './MechaModel'

type Condition = { id: string; text: string; minutes: number }
type Topic = { id: string; name: string; conditions: Condition[] }
type View = 'ready' | 'checking' | 'approved' | 'deferred'

const emptyCondition = (): Condition => ({ id: crypto.randomUUID(), text: '', minutes: 0 })
const example: Topic = {
  id: 'delivery',
  name: '야식 배달',
  conditions: [
    { id: 'food', text: '집에 바로 먹을 수 있는 음식이 있는지 확인했나요?', minutes: 0 },
    { id: 'budget', text: '배달비까지 포함해 이번 주 예산 안인가요?', minutes: 0 },
    { id: 'wait', text: '잠깐 기다린 뒤에도 주문하고 싶나요?', minutes: 10 },
  ],
}

const purchaseExample: Topic = {
  id: 'purchase',
  name: '할인 상품 구매',
  conditions: [
    { id: 'budget', text: '배송비까지 포함해서 여유 예산 안인가요?', minutes: 0 },
    { id: 'duplicate', text: '이미 가진 물건으로 대신할 수 없는지 확인했나요?', minutes: 0 },
    { id: 'wait', text: '잠깐 기다린 뒤에도 필요한 물건인가요?', minutes: 10 },
  ],
}
const examples = [example, purchaseExample]

function loadDeadlines(key?: string): Record<string, number> {
  if (!key) return {}
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
    return Object.fromEntries(Object.entries(saved).filter(([, value]) => Number.isFinite(value) && value > 0))
  } catch { return {} }
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

const assembly = ['동력 프레임', '센서 결합', '하체 도킹', '상체 도킹', '장갑 잠금', '추진기 결합']

function Mecha({ progress, view }: { progress: number; view: View }) {
  return <div className={styles.hangar} data-stage={Math.floor(progress)} data-view={view} aria-hidden="true">
    <div className={styles.hangarGrid} />
    <div className={styles.ring} />
    <div className={styles.deck} />
    <MechaModel progress={progress} launched={view === 'approved'} className={styles.robot} />
    <div className={styles.shutters} />
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
  const clock = remaining >= 60 ? `${Math.ceil(remaining / 60)}분` : `${remaining}초`
  function pointerPosition(event: PointerEvent<HTMLInputElement>) {
    const travel = Math.max(1, event.currentTarget.clientWidth - 38)
    return Math.round(Math.min(1, Math.max(0, (event.clientX - dragStart.current) / travel)) * 100)
  }
  return <li className={styles.condition} data-locked={engaged}>
    <div className={styles.conditionTitle}>
      <label htmlFor={`gear-${condition.id}`}>{condition.text}</label>
      <span>{engaged ? '잠금 완료' : waiting ? '대기' : '아직 확인 전'}</span>
    </div>
    {waiting ? <div className={styles.wait}>
      {deadline ? <p role="timer"><strong>{clock}</strong> 뒤에 다시 확인할 수 있어요.</p> : <button className={styles.secondary} onClick={start}>{condition.minutes}분 대기 시작</button>}
    </div> : <>
      {!engaged && <p id={`gear-help-${condition.id}`} className={styles.gearHelp}>
        {deadline && '대기가 끝났어요. 질문을 다시 확인해 주세요. '}
        끝까지 밀거나 End 키를 누르세요. 확인 버튼도 쓸 수 있어요.
      </p>}
      <div className={styles.gearRow}>
      <input className={styles.gear} id={`gear-${condition.id}`} type="range" min="0" max="100" step="1"
        disabled={engaged} aria-describedby={engaged ? undefined : `gear-help-${condition.id}`} value={engaged ? 100 : position} aria-valuetext={engaged ? '잠금 완료' : `${position}%`}
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
    </div></>}
  </li>
}

function TopicForm({ initial, cancel, save }: { initial?: Topic; cancel: () => void; save: (topic: Topic) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    const trigger = document.activeElement
    node?.showModal()
    return () => {
      node?.close()
      if (trigger instanceof HTMLElement) trigger.focus()
    }
  }, [])
  const [name, setName] = useState(initial?.name ?? '')
  const [conditions, setConditions] = useState(() => initial?.conditions ?? Array.from({ length: 3 }, emptyCondition))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || conditions.some(condition => !condition.text.trim())) return
    save({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), conditions: conditions.map(condition => ({ ...condition, text: condition.text.trim() })) })
  }
  return <dialog ref={dialog} className={styles.editorDialog} aria-labelledby="resolve-topic-editor" onCancel={event => { event.preventDefault(); cancel() }}>
    <form className={styles.editor} onSubmit={submit}>
    <h2 id="resolve-topic-editor">{initial ? '출격 주제 수정' : '새 출격 주제'}</h2>
    <label>주제 이름<input required maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="예: 새 운동화 사기" /></label>
    {conditions.map((condition, index) => <fieldset key={condition.id}>
      <legend>확인 조건 {index + 1}</legend>
      <label>조건 문구<input required placeholder="예: 이번 주 예산 안인가요?" maxLength={110} value={condition.text} onChange={event => {
        const text = event.target.value
        setConditions(items => items.map(item => item.id === condition.id ? { ...item, text } : item))
      }} /></label>
      <label>대기 시간 (분, 선택)<input type="number" min="0" max="1440" step="1" value={condition.minutes} onChange={event => {
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
  </dialog>
}

export default function ResolveLaunchPage() {
  const { user, status } = useAuth()
  const storageKey = user ? `migdot-resolve-launch:${user.id}` : status === 'preview' ? 'migdot-resolve-launch:preview' : undefined
  return <ControlRoom key={storageKey ?? 'preview'} storageKey={storageKey} />
}

function ControlRoom({ storageKey }: { storageKey?: string }) {
  const [topics, setTopics] = useState(() => loadTopics(storageKey))
  const [selected, setSelected] = useState(topics[0]?.id ?? '')
  const [editor, setEditor] = useState<Topic | 'new' | null>(null)
  const [view, setView] = useState<View>('ready')
  const [railOpen, setRailOpen] = useState(true)
  const [locked, setLocked] = useState<string[]>([])
  const deadlineKey = storageKey ? `${storageKey}:deadlines` : undefined
  const [deadlines, setDeadlines] = useState(() => loadDeadlines(deadlineKey))
  const outcome = useRef<HTMLHeadingElement>(null)
  const checking = useRef<HTMLParagraphElement>(null)
  const [now, setNow] = useState(Date.now)
  const [storageError, setStorageError] = useState(false)
  const topic = topics.find(item => item.id === selected)
  const complete = Boolean(topic && locked.length === topic.conditions.length)
  const progress = topic ? locked.length * 5 / topic.conditions.length : 0
  const deadlineFor = (condition: Condition) => deadlines[JSON.stringify([selected, condition.id])]
  const waiting = topic?.conditions.some(condition => (deadlineFor(condition) ?? 0) > now)

  useEffect(() => {
    if (view === 'checking') checking.current?.focus()
    if (view === 'approved' || view === 'deferred') outcome.current?.focus()
  }, [view])

  function updateDeadlines(next: Record<string, number>) {
    setDeadlines(next)
    if (!deadlineKey) return
    try {
      localStorage.setItem(deadlineKey, JSON.stringify(next))
    } catch {
      setStorageError(true)
    }
  }

  function clearTopicDeadlines(current: Topic) {
    const next = { ...deadlines }
    for (const condition of current.conditions) delete next[JSON.stringify([current.id, condition.id])]
    updateDeadlines(next)
  }

  useEffect(() => {
    if (!waiting || view !== 'checking') return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [waiting, view])

  function reset(next: View) {
    setLocked([])
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
    const previous = topics.find(item => item.id === next.id)
    if (previous) clearTopicDeadlines(previous)
    setTopics(updated)
    setSelected(next.id)
    setEditor(null)
    reset('ready')
  }

  function lockCondition(condition: Condition) {
    if (view !== 'checking') return
    if (condition.minutes && (deadlineFor(condition) ?? Infinity) > now) return
    setLocked(items => items.includes(condition.id) ? items : [...items, condition.id])
  }

  const status = view === 'approved' ? '출격 승인' : view === 'deferred' ? '격납 완료' : complete ? '합체 완료 · 출격 준비' : view === 'checking' ? '합체 진행 중' : '출격 대기'
  return <div className={styles.surface}><div className={styles.room}>
    <header className={styles.header}>
      <h1><span className={styles.emblem} aria-hidden="true"><i /></span>결심 출격 관제실</h1>
      <button className={styles.secondary} onClick={() => setEditor('new')}><Icon name="plus" />새 출격 주제</button>
    </header>
    {storageError && <p role="alert">브라우저에 주제를 저장하지 못했습니다. 이번 화면에서는 계속 사용할 수 있습니다.</p>}
    <p className={styles.intro}>내가 정한 조건을 확인하고, 지금 할지 결정해요.</p>
    <div className={styles.control} data-view={view} data-complete={complete}>
      <aside className={styles.rail} aria-label="승인 조작">
        <div className={styles.railHead}>
          <h2>승인 목록</h2>
          {topic && <span className={styles.counter} aria-live="polite">잠금 {locked.length} / {topic.conditions.length}</span>}
          <button className={styles.railToggle} aria-controls="resolve-launch-rail" aria-expanded={railOpen}
            aria-label={railOpen ? '승인 목록 접기' : '승인 목록 펼치기'} onClick={() => setRailOpen(value => !value)}><Icon name="chevron" /></button>
        </div>
        <div id="resolve-launch-rail" className={styles.console} data-open={railOpen}>
          {view === 'ready' && <div className={styles.examples}>
            <p>예시로 바로 시작하기</p>
            <div className={styles.actions}>{examples.map(sample => <button key={sample.id} className={styles.secondary} onClick={() => {
              if (topics.some(item => item.id === sample.id)) setSelected(sample.id)
              else saveTopic(sample)
              reset('checking')
            }}>{sample.name}</button>)}</div>
          </div>}
          <div className={styles.topicBar}>
            <label>출격 주제<select value={selected} onChange={event => { setSelected(event.target.value); reset('ready') }}>
              {!topics.length && <option value="">등록된 주제가 없습니다</option>}
              {topics.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            {topic && <button className={styles.secondary} onClick={() => setEditor(topic)}>주제 수정</button>}
          </div>
          {topic && <>
            {view === 'ready' && <>
              <ul className={styles.previewConditions} aria-label="선택한 주제의 확인 조건">
                {topic.conditions.map(condition => <li key={condition.id}>
                  <span>{condition.text}</span>
                  {condition.minutes > 0 && <small>{condition.minutes}분 대기</small>}
                </li>)}
              </ul>
              <div className={styles.actions}><button className={styles.primary} onClick={() => reset('checking')}>조건 확인 시작</button></div>
            </>}
            {view === 'checking' && <>
              <p ref={checking} tabIndex={-1} className={styles.gearHelp}>질문을 읽고, 내가 정한 기준을 충족했을 때 기어를 잠그세요.</p>
              <ul className={styles.conditions}>{topic.conditions.map(condition => <Gear key={condition.id} condition={condition}
                deadline={deadlineFor(condition)} now={now} engaged={locked.includes(condition.id)}
                lock={() => lockCondition(condition)} unlock={() => setLocked(items => items.filter(id => id !== condition.id))}
                start={() => {
                  const started = Date.now()
                  setNow(started)
                  updateDeadlines({ ...deadlines, [JSON.stringify([topic.id, condition.id])]: started + condition.minutes * 60_000 })
                }} />)}</ul>
              <div className={styles.actions}>
                <button className={styles.secondary} onClick={() => { clearTopicDeadlines(topic); setView('deferred') }}>오늘은 보류</button>
                <button className={styles.primary} disabled={!complete} onClick={() => { if (complete) { clearTopicDeadlines(topic); setView('approved') } }}>최종 출격 승인</button>
              </div>
            </>}
            {(view === 'approved' || view === 'deferred') && <>
              <div className={styles.outcome} data-outcome={view}>
                <h3 ref={outcome} tabIndex={-1}>{view === 'approved' ? '출격을 결정했어요' : '오늘은 보류했어요'}</h3>
                <p>{topic.name} · {view === 'approved' ? '정해 둔 조건을 모두 확인했어요.' : '다음에 이 주제를 다시 열어 확인할 수 있어요.'}</p>
              </div>
              <div className={styles.actions}><button className={styles.primary} onClick={() => reset('ready')}>관제실로 돌아가기</button></div>
            </>}
          </>}
        </div>
      </aside>
      <section className={styles.display} aria-label="격납고">
        <div className={styles.displayHead}><span>격납고</span><p role="status">{status}</p></div>
        <Mecha progress={progress} view={view} />
        <div className={styles.displayFoot}>
          <ol className={styles.phases} aria-label="메카 결합 단계">
            {assembly.map((label, index) => <li key={label} data-ready={index <= Math.floor(progress)}>
              <span aria-hidden="true" />{label}
            </li>)}
          </ol>
        </div>
      </section>
    </div>
    {editor && <TopicForm key={editor === 'new' ? 'new' : editor.id}
      initial={editor === 'new' ? undefined : editor} cancel={() => setEditor(null)} save={saveTopic} />}
  </div></div>
}
