import PlanAccounts, { type AccountEditor, type AccountPayment, type PlanAccount } from './PlanAccounts'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../shared/auth/context'
import { supabase } from '../../shared/lib/supabase'
import { Icon } from '../../shared/Icon'
import styles from './wallet.module.css'

const won = new Intl.NumberFormat('ko-KR')
const money = (amount: number) => `${won.format(amount)}원`
const seoulDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
const currentSeoulDay = () => seoulDate.format(Date.now())
function offsetDate(today: string, days: number) {
  const date = new Date(today)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const dayDistance = (today: string, date: string) => (Date.parse(date) - Date.parse(today)) / 86_400_000
const dateLabel = (date: string) => new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', timeZone: 'UTC',
}).format(new Date(date))
const categories = ['수입', '상환', '저축', '특수비', '고정비', '필수 지출', '생활비 예약']

const pockets = [
  { id: 'repay', title: '갚을 돈', action: '상환 추가', category: '상환', categories: ['상환'] },
  { id: 'save', title: '모을 돈', action: '저축 추가', category: '저축', categories: ['저축'] },
  { id: 'spend', title: '써야 할 돈', action: '지출 추가', category: '필수 지출', categories: ['고정비', '필수 지출', '특수비', '생활비 예약'] },
] as const
type Pocket = typeof pockets[number]
const belongsToPocket = (pocket: Pocket, category: string) => pocket.categories.some(item => item === category)

type View = 'home' | 'journal' | 'plan'
type Entry = { amount: number | null; approximate: boolean; note: string }
type Event = { id: string; date: string; title: string; category: string; amount: number; topic?: string; settledOn?: string; accountId?: string }
type PlanChange = { date: string; before?: Event; after?: Event; dailyBefore: number | null; dailyAfter: number | null }
type Plan = { balance: number | null; confirmed: string; horizon: string; events: Event[]; history?: PlanChange[]; accounts?: PlanAccount[] }
type Workspace = { journal: Record<string, Entry>; plan: Plan }
const blank: Workspace = { journal: {}, plan: { balance: null, confirmed: '', horizon: '', events: [] } }

function makeSample(today: string): Workspace {
  return {
    journal: Object.fromEntries([
      [-5, 23000, '야근 후 배달'], [-4, 18000, '점심과 커피'], [-3, 25000, '야근하고 배달 주문'],
      [-2, 0, '집에서 식사'], [-1, 27000, '늦게 퇴근하고 배달'],
    ].map(([days, amount, note]) => [offsetDate(today, Number(days)), { amount: Number(amount), approximate: amount !== 0, note: String(note) }])),
    plan: { balance: 480000, confirmed: today, horizon: offsetDate(today, 7), events: [
      { id: 'shop', date: offsetDate(today, 1), title: '장보기', category: '생활비 예약', amount: 35000 },
      { id: 'card', date: offsetDate(today, 3), title: '카드 대금', category: '상환', amount: 200000 },
      { id: 'save', date: offsetDate(today, 5), title: '월급 전 저축', category: '저축', amount: 70000 },
      { id: 'special', date: offsetDate(today, 6), title: '경조사비', category: '특수비', amount: 70000 },
      { id: 'pay', date: offsetDate(today, 7), title: '월급', category: '수입', amount: 2400000 },
      { id: 'rent', date: offsetDate(today, 10), title: '월세', category: '고정비', amount: 700000 },
    ] },
  }
}

function project(plan: Plan, today: string) {
  const ordered = [...plan.events].sort((a, b) => a.date.localeCompare(b.date))
  const unsettled = ordered.filter(item => !item.settledOn)
  const pending = unsettled
    .filter(item => item.date >= today || ['상환', '고정비', '특수비', '필수 지출'].includes(item.category))
    .map(item => ({ ...item, cashDate: item.date < today ? today : item.date }))
    .sort((a, b) => a.cashDate.localeCompare(b.cashDate)
      || Number(b.category === '수입') - Number(a.category === '수입'))
  let balance = plan.balance ?? 0
  let minimum = balance
  let shortage: { date: string; amount: number } | undefined
  const timeline = pending.map((item, index) => {
    balance += item.category === '수입' ? item.amount : -item.amount
    if (pending[index + 1]?.cashDate !== item.cashDate) {
      minimum = Math.min(minimum, balance)
      if (balance < 0 && !shortage) shortage = { date: item.cashDate, amount: -balance }
    }
    return { ...item, balance }
  })
  const days = dayDistance(today, plan.horizon)
  const available = Math.max(0, minimum)
  const ready = plan.balance !== null && days > 0
  return { timeline, past: unsettled.filter(item => !pending.some(projected => projected.id === item.id)), settled: ordered.filter(item => item.settledOn), shortage: plan.balance === null ? undefined : shortage,
    available, days, daily: ready ? Math.floor(available / days) : null }
}

const topics = ['배달', '장보기', '커피', '택시', '외식']
function findPattern(journal: Workspace['journal'], recentDays: string[]) {
  const notes = recentDays.flatMap(date => journal[date] ? [{ date, ...journal[date] }] : [])
  if (notes.length < 4) return
  for (const topic of topics) {
    const matches = notes.filter(entry => entry.note.includes(topic))
    const amounts = matches.flatMap(entry => entry.amount != null && entry.amount > 0 ? [entry.amount] : [])
    if (amounts.length >= 3) {
      return { topic, matches, count: notes.length, average: Math.round(amounts.reduce((sum, value) => sum + value, 0) / amounts.length), countWithAmount: amounts.length }
    }
  }
}

type Draft = { id?: string; accountId?: string; title: string; amount: string; date: string; category: string; topic?: string }
const amountOkay = (value: string) => value !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100_000_000

type StoredWorkspace = { workspace: Workspace; revision: string | null }

function WalletDisclosure({ label, children, compact = false }: { label: string; children: ReactNode; compact?: boolean }) {
  return <details className={compact ? styles.eventManage : styles.past} onKeyDown={event => {
    if (event.key !== 'Escape' || !event.currentTarget.open) return
    event.stopPropagation()
    event.currentTarget.open = false
    event.currentTarget.querySelector('summary')?.focus()
  }}>
    <summary aria-label={compact ? label : undefined} title={compact ? label : undefined}>
      {!compact && label}<Icon name={compact ? 'more' : 'chevron'} />
    </summary>
    {children}
  </details>
}

export default function WalletPage() {
  const { user } = useAuth()
  const [attempt, setAttempt] = useState(0)

  return user && <PersonalWallet key={JSON.stringify([user.id, attempt])} ownerId={user.id} reload={() => setAttempt(value => value + 1)} />
}

function PersonalWallet({ ownerId, reload }: { ownerId: string; reload: () => void }) {
  const [stored, setStored] = useState<StoredWorkspace | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saveState, setSaveState] = useState<'saving' | 'failed' | 'conflict' | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadError, setReloadError] = useState(false)
  const [reviewLatest, setReviewLatest] = useState(false)
  const pending = useRef<{ change: StoredWorkspace; done?: () => void } | null>(null)
  const saving = useRef(false)
  const feedbackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (saveState === 'failed' || saveState === 'conflict' || reviewLatest) feedbackRef.current?.focus()
  }, [saveState, reviewLatest])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const { data, error } = await supabase!.from('meta_wallet_workspaces')
          .select('workspace, revision').eq('owner_id', ownerId).abortSignal(controller.signal).maybeSingle()
        if (error) throw error
        if (!controller.signal.aborted) setStored(data ?? { workspace: blank, revision: null })
      } catch {
        if (!controller.signal.aborted) setLoadFailed(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [ownerId])

  async function save(next: Workspace, done?: () => void) {
    if (!stored || saving.current) return
    const request = pending.current ?? { change: { workspace: next, revision: crypto.randomUUID() }, done }
    const { change } = request
    pending.current = request
    setReviewLatest(false)
    saving.current = true
    setSaveState('saving')
    try {
      const table = supabase!.from('meta_wallet_workspaces')
      const write = stored.revision === null
        ? table.insert({ owner_id: ownerId, ...change })
        : table.update(change).eq('owner_id', ownerId).eq('revision', stored.revision)
      const { data, error } = await write.select('revision').maybeSingle()
      if (error && error.code !== '23505') throw error
      if (!data) {
        // A retry may follow a committed write whose response never arrived.
        const latest = await supabase!.from('meta_wallet_workspaces')
          .select('revision').eq('owner_id', ownerId).maybeSingle()
        if (latest.error) throw latest.error
        if (latest.data?.revision !== change.revision) {
          setSaveState('conflict')
          return
        }
      }
      setStored(change)
      pending.current = null
      setSaveState(null)
      request.done?.()
    } catch {
      setSaveState('failed')
    } finally {
      saving.current = false
    }
  }

  if (loadFailed) return <section className="access-panel" role="alert">
    <h1>지갑을 불러오지 못했습니다.</h1>
    <button onClick={reload}>다시 불러오기</button>
  </section>
  if (!stored) return <p role="status">개인 지갑을 불러오는 중입니다…</p>

  async function loadLatest() {
    if (saving.current) return
    saving.current = true
    setReloading(true)
    setReloadError(false)
    try {
      const { data, error } = await supabase!.from('meta_wallet_workspaces')
        .select('workspace, revision').eq('owner_id', ownerId).maybeSingle()
      if (error) throw error
      setStored(data ?? { workspace: blank, revision: null })
      pending.current = null
      setSaveState(null)
      setReviewLatest(true)
    } catch {
      setReloadError(true)
    } finally {
      saving.current = false
      setReloading(false)
    }
  }

  const feedback = (saveState || reviewLatest) && <div className={styles.saveFeedback} ref={feedbackRef} tabIndex={-1}>
    {saveState === 'saving' && <p role="status">지갑에 저장하는 중입니다…</p>}
    {saveState === 'failed' && <>
      <p role="alert">변경 내용을 저장하지 못했습니다. 입력은 유지됩니다.</p>
      <button className={styles.ghost} onClick={() => { if (pending.current) void save(pending.current.change.workspace) }}>저장 다시 시도</button>
    </>}
    {saveState === 'conflict' && <>
      <p role="alert">지갑이 다른 곳에서 변경됐거나 권한이 바뀌었습니다. 최신 지갑을 불러와 입력 내용을 다시 확인하세요.</p>
      <button className={styles.ghost} disabled={reloading} onClick={() => void loadLatest()}>{reloading ? '불러오는 중…' : '최신 지갑 불러오기'}</button>
      {reloadError && <p role="alert">최신 지갑을 불러오지 못했습니다.</p>}
    </>}
    {reviewLatest && <p role="status">최신 지갑을 불러왔습니다. 입력 내용과 바뀐 금액을 확인한 뒤 다시 저장하세요.</p>}
  </div>

  return <WalletEditor workspace={stored.workspace} save={(next, done) => void save(next, done)} feedback={feedback} locked={saveState !== null} />
}

function WalletEditor({ workspace, save, feedback, locked }: { workspace: Workspace; save: (next: Workspace, done?: () => void) => void; feedback: ReactNode; locked: boolean }) {
  const [today, setToday] = useState(currentSeoulDay)
  useEffect(() => {
    const refresh = () => setToday(currentSeoulDay())
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  const recentDays = Array.from({ length: 7 }, (_, index) => offsetDate(today, index - 6))
  const [sample, setSample] = useState<Workspace | null>(null)
  const [view, setView] = useState<View>('home')
  const [openPocket, setOpenPocket] = useState<Pocket['id'] | null>(null)
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [approximate, setApproximate] = useState(true)
  const [editing, setEditing] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showMatches, setShowMatches] = useState(false)
  const [balanceDraft, setBalanceDraft] = useState('')
  const [horizonDraft, setHorizonDraft] = useState('')
  const [setup, setSetup] = useState<'balance' | 'horizon' | null>(null)
  const [periodMode, setPeriodMode] = useState<'date' | 'days'>('date')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [accountEditor, setAccountEditor] = useState<AccountEditor | null>(null)
  const [status, setStatus] = useState('')
  const [settling, setSettling] = useState<Event | null>(null)
  const [settledBalance, setSettledBalance] = useState('')
  const [selectedScheduleDate, setSelectedScheduleDate] = useState('')
  const pocketTrigger = useRef<HTMLButtonElement>(null)
  const setupTitle = useRef<HTMLHeadingElement>(null)
  const draftTitle = useRef<HTMLHeadingElement>(null)
  const scheduleTarget = useRef<HTMLLIElement>(null)
  const draftOpen = (draft !== null || settling !== null) && view === 'plan'
  useEffect(() => { if (setup) setupTitle.current?.focus() }, [setup])
  useEffect(() => { if (draftOpen) draftTitle.current?.focus() }, [draftOpen])
  useEffect(() => { if (view === 'plan' && selectedScheduleDate) scheduleTarget.current?.focus() }, [view, selectedScheduleDate])
  const current = sample ?? workspace
  const { journal, plan } = current
  const forecast = project(plan, today)
  const accounts = plan.accounts ?? []
  const linkedPayment = (id: string) => plan.events.find(item => item.accountId === id && !item.settledOn)
  const hasPeriod = forecast.days > 0
  const periodOutflows = forecast.timeline.filter(item => item.category !== '수입' && (!hasPeriod || item.cashDate < plan.horizon))
  const pocket = pockets.find(item => item.id === openPocket)
  const pocketItems = pocket ? periodOutflows.filter(item => belongsToPocket(pocket, item.category)) : []
  const pattern = findPattern(journal, recentDays)
  const previousToday = useRef(today)
  useEffect(() => {
    const previous = previousToday.current
    previousToday.current = today
    if (previous !== today && view === 'home' && date === previous && !editing && !amount && !note) setDate(today)
  }, [today, view, date, editing, amount, note])
  const entry = journal[date]
  const nearest = forecast.timeline[0]
  const selectedEvent = forecast.timeline.find(item => item.cashDate === selectedScheduleDate && item.category !== '수입')
  const daily = forecast.daily
  const recent = recentDays.flatMap(day => journal[day] ? [journal[day]] : [])
  const recorded = recent.filter(item => item.amount !== null)
  const total = recorded.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const max = Math.max(1, ...recorded.map(item => item.amount ?? 0))

  function update(next: Workspace, done?: () => void) {
    if (sample) {
      setSample(next)
      done?.()
    } else save(next, done)
  }

  function navigate(next: View) {
    setStatus('')
    setView(next)
    setAccountEditor(null)
    setSelectedScheduleDate('')
    setSettling(null)
    setSetup(null)
    if (next !== 'plan') setDraft(null)
    if (next !== 'plan') selectDay(today)
  }

  function selectDay(day: string, startEditing = false) {
    const saved = journal[day]
    setDate(day)
    setAmount(startEditing && saved?.amount != null ? String(saved.amount) : '')
    setNote(startEditing ? saved?.note ?? '' : '')
    setApproximate(startEditing ? saved?.approximate ?? true : true)
    setShowNote(startEditing && Boolean(saved?.note))
    setEditing(startEditing)
    setStatus('')
  }

  function changeExample() {
    setSample(sample ? null : makeSample(today))
    setView('home')
    setOpenPocket(null)
    setDate(today)
    setAmount('')
    setNote('')
    setApproximate(true)
    setShowNote(false)
    setEditing(false)
    setShowMatches(false)
    setAccountEditor(null)
    setSettling(null)
    setSetup(null)
    setDraft(null)
    setStatus('')
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if ((amount === '' && !note.trim()) || (amount !== '' && !amountOkay(amount))) return
    const value = amount === '' ? null : Number(amount)
    update({ ...current, journal: { ...journal, [date]: { amount: value, approximate: approximate && Boolean(value), note: note.trim() } } }, () => {
      setEditing(false)
      setAmount('')
      setNote('')
      setShowNote(false)
      setApproximate(true)
      if (view === 'home') setDate(currentSeoulDay())
      setStatus('하루 기록을 저장했어요.')
    })
  }

  function openBalance() {
    setBalanceDraft(plan.balance === null ? '' : String(plan.balance))
    setSetup('balance')
    setView('home')
  }

  function openHorizon() {
    setHorizonDraft(plan.horizon)
    setPeriodMode('date')
    setSetup('horizon')
    setView('home')
  }

  function saveBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!amountOkay(balanceDraft)) return
    update({ ...current, plan: { ...plan, balance: Number(balanceDraft), confirmed: today } }, () => {
      if (forecast.days > 0) setSetup(null)
      else openHorizon()
    })
  }

  function saveHorizon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const days = Number(horizonDraft)
    if (periodMode === 'days' && (!Number.isInteger(days) || days < 1 || days > 365)) return
    const horizon = periodMode === 'date' ? horizonDraft : offsetDate(today, days)
    if (!horizon || dayDistance(today, horizon) <= 0) return
    update({ ...current, plan: { ...plan, horizon } }, () => setSetup(null))
  }

  function openSettlement(item: Event) {
    setAccountEditor(null)
    setDraft(null)
    setSettling(item)
    setSettledBalance('')
    setStatus('')
  }

  function commitEvent(nextPlan: Plan, before?: Event, after?: Event, done?: () => void) {
    const change = { date: today, before, after, dailyBefore: forecast.daily, dailyAfter: project(nextPlan, today).daily }
    update({ ...current, plan: { ...nextPlan, history: [...(plan.history ?? []), change] } }, done)
  }

  function settleEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!settling || !amountOkay(settledBalance) || !plan.events.some(item => item.id === settling.id && !item.settledOn)) return
    const settled = { ...settling, settledOn: today }
    commitEvent({ ...withEvent(settled), balance: Number(settledBalance), confirmed: today }, settling, settled, () => {
      setSettling(null)
      setStatus('실제 잔액과 처리 내역을 저장했어요.')
    })
  }

  function editAccount(editor: AccountEditor | null) {
    setDraft(null)
    setSettling(null)
    setStatus('')
    setAccountEditor(editor)
  }

  function saveAccount(account: PlanAccount, payment?: AccountPayment) {
    const before = linkedPayment(account.id)
    const after: Event | undefined = payment && {
      id: before?.id ?? crypto.randomUUID(), accountId: account.id, date: payment.date, amount: payment.amount,
      title: account.name, category: account.kind === '저축' ? '저축' : '상환',
    }
    const next = {
      ...plan,
      accounts: [...accounts.filter(item => item.id !== account.id), account],
      events: [...plan.events.filter(item => item.id !== before?.id), ...(after ? [after] : [])],
    }
    const done = () => {
      setAccountEditor(null)
      setStatus('계좌 정보를 저장했어요.')
    }
    if (before || after) commitEvent(next, before, after, done)
    else update({ ...current, plan: next }, done)
  }

  function openEvent(item?: Event, category?: string) {
    const account = item?.accountId && accounts.find(account => account.id === item.accountId)
    if (account) {
      editAccount({ kind: account.kind, account })
      return
    }
    setView('plan')
    setSettling(null)
    setStatus('')
    setAccountEditor(null)
    setDraft(item ? { ...item, amount: String(item.amount) } : { title: '', amount: '', date: today, category: category ?? '상환' })
  }

  const eligibleAccounts = draft?.category === '상환' || draft?.category === '저축'
    ? accounts.filter(account => (account.kind === '저축') === (draft.category === '저축')
      && !plan.events.some(item => item.accountId === account.id && !item.settledOn && item.id !== draft.id))
    : []
  const draftRemoved = Boolean(draft?.id && !plan.events.some(item => item.id === draft.id && !item.settledOn))
  const candidate = draft && !draftRemoved && (!draft.accountId || eligibleAccounts.some(account => account.id === draft.accountId)) && draft.title.trim() && amountOkay(draft.amount) && Number(draft.amount) > 0 && draft.date
    ? { id: draft.id ?? 'draft', date: draft.date, title: draft.title.trim(), amount: Number(draft.amount), category: draft.category, topic: draft.topic, accountId: draft.accountId } : null
  function withEvent(item: Event): Plan {
    return { ...plan, events: [...plan.events.filter(previous => previous.id !== item.id), item] }
  }
  const scenario = candidate ? project(withEvent(candidate), today) : null

  const dailyText = (value: number | null) => value === null ? '계산 전' : money(value)
  function entryText(item: Entry) {
    return item.amount === null ? '메모만' : `${item.approximate ? '약 ' : ''}${money(item.amount)}`
  }

  const entryCard = <section className={styles.panel} aria-labelledby="entry-title">
    <h2 id="entry-title">{date === today ? '오늘 쓴 돈' : `${dateLabel(date)} 지출 기록`}</h2>
    {view === 'journal' && <label className={styles.datePicker}>기록 날짜<input type="date" max={today} value={date} onChange={event => {
      if (event.target.value && event.target.value <= today) selectDay(event.target.value)
    }} /></label>}
    {entry && !editing ? <div className={styles.saved}>
      <div><strong>{entryText(entry)}</strong>{entry.note && <p>{entry.note}</p>}</div>
      <button className={styles.ghost} onClick={() => selectDay(date, true)}>수정</button>
    </div> : <form className={styles.form} onSubmit={saveEntry}>
      <p className={styles.detail}>금액이나 메모 하나만 남겨도 돼요.</p>
      <div className={styles.quickEntry}>
        <label>하루 지출 (원)<input autoComplete="off" type="number" inputMode="numeric" min="0" max="100000000" step="1" value={amount} onChange={event => setAmount(event.target.value)} placeholder="기억나는 금액" /></label>
        <button className={styles.submit} disabled={amount === '' && !note.trim()} type="submit">하루 기록 저장</button>
      </div>
      <div className={styles.entryOptions}>
        <label className={styles.checkbox}><input type="checkbox" checked={approximate} onChange={event => setApproximate(event.target.checked)} />대략적인 금액</label>
        {!showNote && <button className={styles.ghost} type="button" onClick={() => setShowNote(true)}>메모 추가</button>}
        {entry && <button className={styles.ghost} type="button" onClick={() => selectDay(date)}>취소</button>}
      </div>
      {showNote && <label>하루 메모<textarea rows={2} maxLength={240} value={note} onChange={event => setNote(event.target.value)} placeholder="예: 야근하고 배달" /></label>}
    </form>}
    {(view === 'home' || view === 'journal') && <p className={styles.notice} role="status">{status}</p>}
  </section>

  const recentCard = <section className={styles.panel} aria-labelledby="weekly-title">
    <h2 id="weekly-title">최근 7일 지출</h2>
    <p className={styles.detail}>{recent.length}일 기록{recorded.length ? ` · 기록한 금액 ${recorded.some(item => item.approximate) ? '약 ' : ''}${money(total)}` : ''}</p>
    {(recent.length > 0 || view === 'journal') && <ul className={styles.week}>{recentDays.map(day => {
      const item = journal[day]
      const value = item?.amount ?? 0
      return <li key={day}><button onClick={() => { setView('journal'); selectDay(day) }} className={day === date ? styles.currentDay : undefined}>
        <span>{day === today ? '오늘' : dateLabel(day)}</span>
        <span className={styles.barTrack} aria-hidden="true">{value > 0 && <span className={styles.bar} style={{ width: `${Math.max(5, value / max * 100)}%` }} />}</span>
        <strong>{item ? entryText(item) : '기록 없음'}</strong>
        {item?.note && <small>{item.note}</small>}
      </button></li>
    })}</ul>}
    {pattern && <div className={styles.review}>
      <h3>이번 주 돌아보기</h3>
      <p>기록한 {pattern.count}일 중 {pattern.matches.length}일에 ‘{pattern.topic}’ 메모가 있었어요.</p>
      {pattern.matches.length === pattern.countWithAmount
        ? <p>해당 날짜의 하루 지출은 평균 약 {money(pattern.average)}이었어요. 비용을 잡아둘 때 참고할 수 있어요.</p>
        : <p>금액을 적은 {pattern.countWithAmount}일의 하루 지출은 평균 약 {money(pattern.average)}이었어요.</p>}
      <div className={styles.entryOptions}>
        <button className={styles.ghost} aria-expanded={showMatches} onClick={() => setShowMatches(!showMatches)}>{showMatches ? '기록 접기' : '해당 기록 보기'}</button>
        <button className={styles.submit} onClick={() => {
          setView('plan')
          setStatus('')
          setDraft({ title: `${pattern.topic} 비용`, amount: '', date: offsetDate(today, 7), category: '생활비 예약', topic: pattern.topic })
        }}>다음 주에 비용 잡기</button>
      </div>
      {showMatches && <ul className={styles.matches}>{pattern.matches.map(item => <li key={item.date}><strong>{dateLabel(item.date)}</strong> {item.note} · {entryText(item)}</li>)}</ul>}
    </div>}
    {plan.events.some(item => item.topic) && <div className={styles.followup}>
      <h3>잡아둔 생활비</h3>
      <ul className={styles.matches}>{plan.events.filter(item => item.topic).map(item => <li key={item.id}>
        <strong>{dateLabel(item.date)} {item.title} {money(item.amount)}</strong>
        <p>{item.date > today ? '예정' : journal[item.date] ? `그날 지출 일기 · ${entryText(journal[item.date])}` : '그날 기록 없음'}</p>
      </li>)}</ul>
    </div>}
  </section>

  const planEditor = <section className={styles.panel}>
    <h2 ref={draftTitle} tabIndex={-1}>{settling ? '입출금 처리 확인' : draft ? draft.id ? '일정 수정' : '일정 추가' : '오늘 생활비 계산'}</h2>
    {settling ? <form className={styles.form} onSubmit={settleEvent}>
      <p><strong>{settling.title}</strong> · 예정 금액 {money(settling.amount)}</p>
      <label>처리 후 확인한 잔액 (원)<input type="number" inputMode="numeric" min="0" max="100000000" required value={settledBalance} onChange={event => setSettledBalance(event.target.value)} /></label>
      <p className={styles.detail}>입출금이 끝난 뒤 실제 잔액을 입력하세요. 이 일정은 앞으로의 예상 입출금에서 빠져요.</p>
      <div className={styles.entryOptions}><button className={styles.submit} disabled={!amountOkay(settledBalance)}>처리 완료</button><button type="button" className={styles.ghost} onClick={() => setSettling(null)}>취소</button></div>
    </form> : draft ? <form className={styles.form} onSubmit={event => {
      event.preventDefault()
      if (!candidate) return
      const next = { ...candidate, id: draft.id ?? crypto.randomUUID() }
      commitEvent(withEvent(next), plan.events.find(item => item.id === next.id), next, () => {
        setDraft(null)
        setStatus('돈 계획에 반영했어요.')
      })
    }}>
      <label>이름<input maxLength={60} required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>항목<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value, accountId: undefined })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>날짜<input type="date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label>
      <label>금액 (원)<input type="number" min="1" max="100000000" required value={draft.amount} onChange={event => setDraft({ ...draft, amount: event.target.value })} /></label>
      {(eligibleAccounts.length > 0 || draft.accountId) && <label>계좌 연결 (선택)
        <select value={draft.accountId ?? ''} onChange={event => setDraft({ ...draft, accountId: event.target.value || undefined })}>
          <option value="">연결 없이 계획하기</option>
          {draft.accountId && !eligibleAccounts.some(account => account.id === draft.accountId) && <option value={draft.accountId} disabled>현재 연결할 수 없는 계좌</option>}
          {eligibleAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </label>}
      {draftRemoved && <p role="alert">최신 지갑에서 이 일정을 수정할 수 없습니다. 입력을 확인한 뒤 새 일정으로 추가할 수 있어요.</p>}
      {draft.topic && pattern?.topic === draft.topic && <p className={styles.detail}>‘{draft.topic}’ 메모가 있었던 날의 하루 지출 평균은 약 {money(pattern.average)}이에요. 예약할 비용을 직접 정해 주세요.</p>}
      {scenario && <div className={styles.review} aria-live="polite"><strong>반영 시 오늘 생활비 {dailyText(forecast.daily)} → {dailyText(scenario.daily)}</strong>
        {scenario.shortage && <p>{dateLabel(scenario.shortage.date)}에 {money(scenario.shortage.amount)} 부족 예상</p>}</div>}
      <div className={styles.entryOptions}><button className={styles.submit} disabled={!candidate}>돈 계획에 반영</button><button type="button" className={styles.ghost} onClick={() => setDraft(null)}>취소</button>
        {draftRemoved && <button type="button" className={styles.ghost} onClick={() => setDraft({ ...draft, id: undefined, accountId: undefined })}>새 일정으로 이어 쓰기</button>}
        {draft.id && !draftRemoved && <button className={styles.ghost} type="button" onClick={() => {
          commitEvent({ ...plan, events: plan.events.filter(item => item.id !== draft.id) }, plan.events.find(item => item.id === draft.id), undefined, () => {
            setDraft(null)
            setStatus('일정을 삭제했어요.')
          })
        }}>일정 삭제</button>}</div>
    </form> : <>
      <dl className={styles.calculation}>
        <div><dt>생활 기간</dt><dd>{forecast.days > 0 ? `${forecast.days}일` : '미설정'}</dd></div>
        <div><dt>생활비로 배분할 금액</dt><dd>{daily === null ? '계산 전' : money(forecast.available)}</dd></div>
        <div><dt>오늘 생활비</dt><dd>{dailyText(daily)}</dd></div>
      </dl>
      {forecast.shortage && <p className={styles.alert}>{dateLabel(forecast.shortage.date)}에 {money(forecast.shortage.amount)} 부족 예상</p>}
      <p className={styles.detail}>상환·저축·지출 소계는 생활 기간 중의 예정액이에요. 생활비는 이후 입력된 일정까지 감안해 계산해요. 현재 잔액에는 바로 쓸 수 있는 돈만 입력해 주세요.</p>
      <div className={styles.entryOptions}><button className={styles.ghost} onClick={openBalance}>잔액 확인</button><button className={styles.ghost} onClick={openHorizon}>생활 기간 설정</button></div>
    </>}
  </section>

  return <div className={styles.wallet}>
    <header className={styles.header} inert={locked}>
      <h1 className={styles.brand}><span className={styles.logo} aria-hidden="true">₩</span>메타 월렛</h1>
      <nav className={styles.tabs} aria-label="메타 월렛 메뉴">
        {([['home', '홈'], ['journal', '지출 일기'], ['plan', '돈 계획']] as const).map(([id, title]) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}>{title}</button>)}
      </nav>
    </header>
    <div className={styles.main}>
      {feedback}
      <div inert={locked}>
      <div className={styles.heading}>
        <div><p className={styles.date}><Icon name="calendar" /><time dateTime={today}>{dateLabel(today)} 기준</time></p><h2>{view === 'home' ? '오늘의 지갑' : view === 'journal' ? '지출 일기' : '돈 계획'}</h2></div>
        <button className={styles.demo} onClick={changeExample}>{sample ? '내 지갑으로 돌아가기' : '예시로 둘러보기'}</button>
      </div>
      {sample && <p className={styles.sampleNotice}>예시 지갑에서 체험 중이에요.</p>}

      {view === 'home' && <div className={styles.layout}>
        <div className={styles.stack}><section className={styles.hero} aria-labelledby="wallet-balance">
          <div className={styles.heroTop}><h2 id="wallet-balance">오늘 생활비</h2>{daily !== null && <span>입력한 일정 기준</span>}</div>
          {daily === null ? <p className={styles.unset}>계산 전</p> : <p className={styles.amount}>{won.format(daily)}<span>원</span></p>}
          <dl className={styles.heroBalance}><div><dt>현재 잔액</dt><dd>{plan.balance === null ? <button className={styles.heroLink} onClick={openBalance}>잔액 입력</button> : <button className={styles.heroLink} aria-label={`현재 잔액 ${money(plan.balance)} 수정`} onClick={openBalance}>{money(plan.balance)}</button>}</dd>
            {plan.confirmed && <dd className={styles.confirmed}>{plan.confirmed === today ? '오늘 확인' : `${dateLabel(plan.confirmed)} 확인`}</dd>}</div>
            {journal[today] && <div><dt>오늘 기록한 지출</dt><dd>{entryText(journal[today])}</dd></div>}</dl>
          {plan.balance !== null && daily === null && <div className={styles.actions}><button className={styles.primary} onClick={openHorizon}>생활비 계산 기간 정하기</button></div>}
          {daily !== null && <div className={styles.actions}><button className={styles.secondary} onClick={() => navigate('plan')}>생활비 계산 근거</button></div>}
        </section>
        {setup && <section className={styles.panel} aria-labelledby="setup-title">
          <h2 id="setup-title" ref={setupTitle} tabIndex={-1}>{setup === 'balance' ? '현재 잔액을 알려주세요' : '다음에 돈이 들어오는 날을 아나요?'}</h2>
          {setup === 'balance' ? <form className={styles.form} onSubmit={saveBalance}>
            <label>지금 쓸 수 있는 잔액 (원)<input type="number" inputMode="numeric" min="0" max="100000000" required value={balanceDraft} onChange={event => setBalanceDraft(event.target.value)} /></label>
            <div className={styles.entryOptions}><button className={styles.submit}>잔액 확인</button><button className={styles.ghost} type="button" onClick={() => setSetup(null)}>나중에</button></div>
          </form> : <form className={styles.form} onSubmit={saveHorizon}>
            {periodMode === 'date' ? <label>다음 입금 예정일<input type="date" min={offsetDate(today, 1)} required value={horizonDraft} onChange={event => setHorizonDraft(event.target.value)} /></label>
              : <label>이 돈으로 생활할 기간 (일)<input type="number" min="1" max="365" required value={horizonDraft} onChange={event => setHorizonDraft(event.target.value)} /></label>}
            <div className={styles.entryOptions}><button className={styles.submit}>기간 저장</button>
              <button className={styles.ghost} type="button" onClick={() => { setPeriodMode(periodMode === 'date' ? 'days' : 'date'); setHorizonDraft('') }}>{periodMode === 'date' ? '날짜를 모르겠어요' : '날짜로 입력'}</button>
              <button className={styles.ghost} type="button" onClick={() => setSetup(null)}>나중에</button></div>
          </form>}
        </section>}
        {entryCard}</div>
        <div className={styles.stack}><section className={styles.panel} aria-labelledby="upcoming">
          <h2 id="upcoming">다음 일정</h2>
          {forecast.shortage && <button className={styles.alert} onClick={() => { navigate('plan'); setSelectedScheduleDate(forecast.shortage?.date ?? '') }}>{dateLabel(forecast.shortage.date)}에 {money(forecast.shortage.amount)} 부족 예상</button>}
          {!forecast.shortage && nearest && <p className={styles.upcoming}>{dateLabel(nearest.date)} · {nearest.title} <strong>{money(nearest.amount)}</strong></p>}
          <div className={styles.entryOptions}>
            {nearest && <button className={styles.ghost} onClick={() => navigate('plan')}>전체 계획 보기</button>}
            <button className={styles.ghost} onClick={() => openEvent()}>다음 입금 또는 납부 추가</button>
          </div>
        </section>
        {recent.length > 0 && recentCard}</div>
      </div>}

      {view === 'journal' && <div className={styles.layout}>{entryCard}{recentCard}</div>}

      {view === 'plan' && <div className={styles.planLayout}>
        <section className={`${styles.panel} ${styles.pockets}`} aria-labelledby="pocket-title" onKeyDown={event => {
          if (event.key !== 'Escape' || !openPocket) return
          event.stopPropagation()
          setOpenPocket(null)
          pocketTrigger.current?.focus()
        }}>
          <div className={styles.pocketHeading}>
            <div>
              <h3 id="pocket-title">돈주머니</h3>
              <p className={styles.detail}>{hasPeriod ? `${dateLabel(today)} ~ ${dateLabel(offsetDate(plan.horizon, -1))} 예정액` : '생활 기간 미설정 · 남은 예정액 전체'}</p>
            </div>
            <p className={styles.pocketDaily}>오늘 생활비 <strong>{dailyText(daily)}</strong></p>
          </div>
          <div className={styles.pocketGrid}>
            {pockets.map(group => {
              const count = periodOutflows.filter(item => belongsToPocket(group, item.category)).reduce((sum, item) => sum + item.amount, 0)
              return <button type="button" key={group.id} ref={openPocket === group.id ? pocketTrigger : undefined} data-pocket={group.id} aria-expanded={openPocket === group.id} aria-controls="pocket-detail"
                onClick={() => setOpenPocket(openPocket === group.id ? null : group.id)}>
                <span>{group.title}</span><strong>{money(count)}</strong><Icon name="chevron" />
              </button>
            })}
          </div>
          <div id="pocket-detail" className={styles.pocketDetail} hidden={!pocket}>
            {pocket && <>
              <div className={styles.pocketHeading}>
                <h3>{pocket.title} 내역</h3>
                <button className={styles.submit} onClick={() => openEvent(undefined, pocket.category)}><Icon name="plus" />{pocket.action}</button>
              </div>
              {pocketItems.length ? <ul className={styles.pocketItems}>{pocketItems.map(item => <li key={item.id}>
                <button className={styles.ghost} onClick={() => openEvent(item)} aria-label={`${item.title} 계획 수정`}>
                  <span>{item.title}<small>{dateLabel(item.date)}{item.date < today ? ' · 미처리' : ''}</small></span>
                  <strong>{money(item.amount)}</strong><Icon name="edit" />
                </button>
              </li>)}</ul> : <p className={styles.detail}>이 범위에 예정된 내역이 없어요.</p>}
            </>}
          </div>
          <p className={styles.notice} role="status">{status}</p>
        </section>
        {draftOpen && planEditor}
        <PlanAccounts accounts={accounts} editor={accountEditor} paymentFor={linkedPayment} edit={editAccount} save={saveAccount} />
        <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>예정 입출금</h2>
          <p className={styles.detail}>{plan.balance === null ? '잔액을 입력하면 일정별 예상 잔액을 볼 수 있어요.' : `현재 잔액 ${money(plan.balance)} 기준`}</p>
          {forecast.timeline.length > 0 && <ol className={styles.schedule}>{forecast.timeline.map(item => <li key={item.id} ref={item.id === selectedEvent?.id ? scheduleTarget : undefined} tabIndex={item.id === selectedEvent?.id ? -1 : undefined} className={item.id === selectedEvent?.id ? styles.selectedEvent : undefined}>
            <div><strong>{item.title}</strong><small>{dateLabel(item.date)} · {item.category}{item.date < today ? ' · 미처리' : ''}</small></div>
            <div className={styles.eventAmount}><strong>{item.category === '수입' ? '+' : '−'}{money(item.amount)}</strong>{plan.balance !== null && <small>예상 잔액 {money(item.balance)}</small>}</div>
            <div className={styles.eventControls}>
              {item.date <= today && <button className={styles.ghost} aria-label={`${item.title} 처리 확인`} onClick={() => openSettlement(item)}>처리 확인</button>}
              <WalletDisclosure label={`${item.title} 관리`} compact>
                <button className={styles.ghost} aria-label={`${item.title} 수정`} onClick={() => openEvent(item)}><Icon name="edit" />수정</button>
              </WalletDisclosure>
            </div>
          </li>)}</ol>}
          {forecast.past.length > 0 && <WalletDisclosure label="날짜가 지난 일정"><ul className={styles.matches}>{forecast.past.map(item => <li key={item.id}>{dateLabel(item.date)} · {item.title} {money(item.amount)} <button className={styles.ghost} onClick={() => openEvent(item)}>수정</button>{item.category !== '생활비 예약' && <button className={styles.ghost} aria-label={`${item.title} 처리 확인`} onClick={() => openSettlement(item)}>처리 확인</button>}</li>)}</ul></WalletDisclosure>}
          {forecast.settled.length > 0 && <WalletDisclosure label="처리한 입출금"><ul className={styles.matches}>{forecast.settled.map(item => <li key={item.id}>{dateLabel(item.settledOn!)} 처리 · {item.title} {money(item.amount)} 예정</li>)}</ul></WalletDisclosure>}
          {Boolean(plan.history?.length) && <WalletDisclosure label="계획 변경 이력"><ol className={styles.matches}>{[...(plan.history ?? [])].reverse().map((change, index) => <li key={index}>
            <strong>{dateLabel(change.date)} · {change.after?.settledOn ? '처리 확인' : !change.before ? '추가' : !change.after ? '삭제' : '수정'}</strong>
            <p>{change.before && `${dateLabel(change.before.date)} ${change.before.title} ${money(change.before.amount)}`}{change.before && change.after && ' → '}{change.after && `${dateLabel(change.after.date)} ${change.after.title} ${money(change.after.amount)}`}</p>
            <small>하루 생활비 {dailyText(change.dailyBefore)} → {dailyText(change.dailyAfter)}</small>
          </li>)}</ol></WalletDisclosure>}
          <div className={styles.entryOptions}><button className={styles.ghost} onClick={() => openEvent(undefined, '수입')}>입금 추가</button>
            <button className={styles.ghost} onClick={() => openEvent(undefined, '고정비')}>고정비 추가</button>
            <button className={styles.ghost} onClick={() => openEvent(undefined, '필수 지출')}>필수 지출 추가</button></div>
        </section>
        {!draftOpen && planEditor}
      </div></div>}
      </div>
    </div>
  </div>
}
