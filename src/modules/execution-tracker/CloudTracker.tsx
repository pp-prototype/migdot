import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/context'
import { supabase } from '../../shared/lib/supabase'
import { shiftDay, validDay } from './data'
import { dayRows, effortLabels, elapsedDays, FIRST_LEVEL_DAYS, parseWorkspace, routineProgress, seoulDay, type CloudTask, type Routine, type RoutineCheck, type Workspace } from './workspace'
import Executioner from './Executioner'
import ActionButton from './ActionButton'
import RoutinePanel, { RoutineCheckDetails } from './RoutinePanel'
import base from './tracker.module.css'
import scene from './experience.module.css'
import styles from './workspace.module.css'

type Editor = { kind: 'task'; task?: CloudTask } | { kind: 'schedule'; task: CloudTask } | { kind: 'routine'; routine?: Routine } | { kind: 'check'; routine: Routine; day: string; check?: RoutineCheck } | { kind: 'journal'; day: string }
function Dialog({ title, busy, close, children }: { title: string; busy: boolean; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = ref.current
    node?.showModal()
    node?.querySelector<HTMLElement>('input, textarea')?.focus()
    return () => { node?.close(); if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog ref={ref} className={scene.dialog} aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) close() }}><div className={scene.dialogHeading}><h2>{title}</h2><ActionButton icon="close" label="닫기" disabled={busy} onClick={close} /></div>{children}</dialog>
}

export default function CloudTracker() {
  const auth = useAuth()
  const owner = auth.user!.id
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [reloadRequired, setReloadRequired] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const sequence = useRef(0)
  const writeLock = useRef(false)
  const pendingRequest = useRef<{ id: string; signature: string } | null>(null)
  const { '*': subpath = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const load = useCallback(async () => {
    const request = ++sequence.current
    try {
      const { data, error } = await supabase!.rpc('get_execution_workspace')
      if (error) throw error
      const next = parseWorkspace(data, owner)
      if (request === sequence.current) { setWorkspace(next); setError(''); setReloadRequired(false) }
    } catch {
      if (request === sequence.current) { setReloadRequired(true); setError('기록을 불러오지 못했습니다. 다시 연결한 뒤 최신 기록을 불러오세요.') }
    }
  }, [owner])
  const invalidate = useCallback(() => { sequence.current++ }, [])
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) void load() })
    return () => { cancelled = true; invalidate() }
  }, [load, invalidate])
  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); if (!writeLock.current && !editor && document.visibilityState === 'visible') void load() }
    const offline = () => setOnline(false)
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', refresh) }
  }, [load, editor])
  async function change(command: string, payload: Record<string, unknown>, message: string) {
    if (!workspace || writeLock.current || !navigator.onLine || reloadRequired) return false
    writeLock.current = true; setBusy(true); setError(''); setNotice('')
    const request = ++sequence.current
    try {
      const signature = JSON.stringify({ command, payload })
      const requestId = pendingRequest.current?.signature === signature ? pendingRequest.current.id : crypto.randomUUID()
      pendingRequest.current = { id: requestId, signature }
      const { data, error } = await supabase!.rpc('change_execution_workspace', { expected_revision: workspace.revision, command, payload: { ...payload, request_id: requestId } })
      if (error) throw error
      const next = parseWorkspace(data, owner)
      if (request === sequence.current) {
        const before = command === 'check_routine' ? routineProgress(workspace).find(entry => entry.routine.id === payload.id) : undefined
        const after = before ? routineProgress(next).find(entry => entry.routine.id === before.routine.id) : undefined
        const levelUp = before && after && after.level > before.level
        setWorkspace(next)
        setNotice(data.replayed ? '앞서 저장된 요청을 확인했습니다. 중복 처리하지 않았습니다. 추가 수정은 다시 열어 진행하세요.' : levelUp ? `${after.routine.title} · 레벨 ${after.level} 달성! 미니 익스큐셔너가 성장했어요.` : message)
        pendingRequest.current = null
      }
      return true
    } catch (failure) {
      if (request !== sequence.current) return false
      const code = (failure as { code?: string }).code
      setReloadRequired(true)
      if (code === '40001' || code === '22023') pendingRequest.current = null
      setError(code === '40001' ? '다른 화면에서 기록이 변경되었습니다. 입력은 유지됩니다. 최신 기록을 불러온 뒤 내용을 확인해 다시 저장하세요.' : '저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 최신 기록을 불러와 반영 여부를 확인한 뒤 다시 시도하세요.')
      return false
    } finally { writeLock.current = false; setBusy(false) }
  }
  const errorPanel = <div className={styles.feedback}>{!online && <p role="alert">오프라인입니다. 연결이 돌아온 후 저장할 수 있습니다.</p>}{error && <div role="alert"><p>{error}</p><p>연결·모듈 권한·Supabase 마이그레이션 적용 상태를 확인하세요.</p><ActionButton icon="refresh" label="최신 기록 불러오기" disabled={busy} onClick={() => void load()} /></div>}<p role="status">{notice}</p>{busy && <p role="status">서버에 저장하는 중입니다…</p>}</div>
  if (!workspace) return <section className={`${base.tracker} ${styles.workspace}`}><h1>익스큐셔너</h1>{errorPanel}{!error && <p role="status">나의 집행록을 불러오는 중입니다…</p>}</section>
  const w = workspace
  const today = w.today
  const isRecords = subpath === 'records'
  const rawDate = params.get('date') ?? today
  const date = validDay(rawDate) && rawDate <= today && rawDate >= '2000-01-01' ? rawDate : today
  const displayedDay = isRecords ? date : today
  const dayJournal = w.days.find(d => d.day === displayedDay)
  const closed = w.days.find(d => d.day === today)?.closed ?? false
  const locked = busy || !online || reloadRequired
  const readOnly = locked || closed
  const current = w.tasks.find(t => t.id === w.active_id && t.status === 'open' && t.scheduled_date <= today)
  const open = w.tasks.filter(t => t.status === 'open' && t.scheduled_date <= today)
  const carried = open.filter(t => t.scheduled_date < today)
  const fresh = open.filter(t => t.scheduled_date === today)
  const completed = w.tasks.filter(t => t.status === 'completed' && t.completed_at && seoulDay(t.completed_at) === today)
  const future = w.tasks.filter(t => t.status === 'open' && t.scheduled_date > today)
  const paused = w.tasks.filter(t => t.status === 'paused')
  const rows = dayRows(w, displayedDay)
  const routines = routineProgress(w)
  const pendingRoutineCount = routines.filter(entry => !entry.checked).length
  function taskCard(task: CloudTask) {
    const changes = w.events.filter(e => e.task_id === task.id && e.action === 'schedule_task').length
    return <li key={task.id} className={styles.task} data-active={task.id === current?.id || undefined}><div><span className={styles.tag}>{task.status === 'completed' ? '집행 완료' : task.id === current?.id ? '지금 실행하는 일' : task.status === 'paused' ? '보류' : task.scheduled_date > today ? '예정' : task.scheduled_date < today ? '이어온 과업' : '오늘 계획'}</span><h3>{task.title}</h3>{task.next_action && <p>첫 행동 · {task.next_action}</p>}<p className={styles.meta}>최초 계획 {task.original_date} · 현재 일정 {task.scheduled_date}<br />최초 계획 후 {elapsedDays(task.original_date, today)}일 · 현재 일정 경과 {elapsedDays(task.scheduled_date, today)}일 · 직접 일정 변경 {changes}회</p></div><div className={styles.actions}>
      {task.status === 'open' && task.scheduled_date <= today && <><ActionButton icon={task.id === current?.id ? 'pause' : 'play'} label={task.id === current?.id ? '잠시 멈추기' : '시작하기'} disabled={readOnly} onClick={() => void change('start_task', { id: task.id }, task.id === current?.id ? '집중 대상을 해제했습니다.' : '집중할 과업을 선택했습니다.')} /><ActionButton icon="check" label="완료" tone="primary" disabled={readOnly} onClick={() => void change('complete_task', { id: task.id }, '집행 완료. 작은 일도 중요한 임무였다.')} /></>}
      {task.status === 'completed' ? <ActionButton icon="undo" label="완료 취소" disabled={readOnly} onClick={() => void change('reopen_task', { id: task.id }, '완료를 취소했습니다. 변경 이력은 보존합니다.')} /> : <><ActionButton icon="calendar" label="일정 조정" disabled={readOnly} onClick={() => setEditor({ kind: 'schedule', task })} />{task.status === 'paused' ? <ActionButton icon="undo" label="오늘로 복귀" disabled={readOnly} onClick={() => void change('resume_task', { id: task.id }, '오늘 목록으로 복귀했습니다.')} /> : <ActionButton icon="pause" label="보류" disabled={readOnly} onClick={() => void change('pause_task', { id: task.id }, '과업을 보류했습니다. 자동 이월 대상에서 제외합니다.')} />}</>}
      <ActionButton icon="edit" label="수정" disabled={readOnly} onClick={() => setEditor({ kind: 'task', task })} />
      <ActionButton icon="trash" label="과업 취소" tone="danger" disabled={readOnly} onClick={() => { if (window.confirm('과업을 취소할까요? 완료로 계산하지 않으며 과거 계획과 변경 이력은 남습니다.')) void change('cancel_task', { id: task.id }, '과업을 취소했습니다. 과거 기록에는 취소로 남습니다.') }} />
    </div></li>
  }
  function taskGroup(title: string, tasks: CloudTask[], empty: string, surface?: 'carry' | 'done') {
    return <section className={styles.panel} data-surface={surface}><div className={styles.panelHeading}><h2>{title} <span>{tasks.length}</span></h2></div>{tasks.length ? <ul className={styles.taskList}>{tasks.map(taskCard)}</ul> : <p className={styles.empty}>{empty}</p>}</section>
  }
  return <div className={`${base.tracker} ${styles.workspace}`}>
    <header className={styles.workspaceHeader}>
      <div>
        <h1>익스큐셔너</h1>
        <p><time dateTime={today}>{today}</time> · 한국 시간</p>
      </div>
      <nav className={base.tabs} aria-label="실행 트래커 메뉴">
        <NavLink to="/execution-tracker" end>오늘</NavLink>
        <NavLink to="/execution-tracker/records">기록</NavLink>
      </nav>
    </header>
    {errorPanel}
    {subpath !== '' && !isRecords ? <p>페이지를 찾을 수 없습니다. <Link to="/execution-tracker">오늘로 이동</Link></p> : <>
      {!isRecords ? <>
        <div className={styles.toolbar} role="group" aria-label="오늘의 작업">
          <ActionButton icon="plus" label="과업 등록" visibleLabel="과업 등록" tone="primary" disabled={readOnly} onClick={() => setEditor({ kind: 'task' })} />
          {closed
            ? <ActionButton icon="unlock" label="마감 다시 열기" visibleLabel="마감 다시 열기" disabled={locked} onClick={() => void change('reopen_day', { day: today }, '오늘의 마감을 다시 열었습니다.')} />
            : <ActionButton icon="moon" label="하루 마감하기" visibleLabel="하루 마감" disabled={locked} onClick={() => setEditor({ kind: 'journal', day: today })} />}
          <ActionButton icon="refresh" label="기록 새로고침" disabled={locked} onClick={() => void load()} />
        </div>
        <section className={`${scene.scene} ${styles.scene}`}>
          <div className={scene.sceneCopy}>
            <h2>{closed ? '오늘의 집행은 여기까지.' : current ? '하나의 과업에 집중하자.' : carried.length ? '이어온 일부터 하나씩.' : '작은 과업 하나로 시작하자.'}</h2>
            {current && <p>지금 집중 · {current.title}</p>}
            <ul className={styles.daySummary}>
              <li>오늘 계획 <strong>{fresh.length}</strong></li>
              <li>이어온 미완료 <strong>{carried.length}</strong></li>
              <li>오늘 완료 <strong>{completed.length}</strong></li>
            </ul>
          </div>
          <div className={scene.characterArea}><Executioner mood={closed ? 'rest' : current ? 'working' : notice.startsWith('집행 완료') ? 'proud' : 'ready'} /></div>
        </section>
        {closed && <div className={styles.closed}><h2>오늘을 정리했습니다.</h2><p>남은 일은 완료로 바뀌지 않습니다. 다음 날 자동으로 이어집니다.</p><p>오늘 알게 된 것 · {dayJournal?.reflection || '남긴 회고가 없습니다.'}</p><p>내일의 첫 행동 · {dayJournal?.tomorrow || '아직 정하지 않았습니다.'}</p></div>}
        <div className={styles.todayLayout}>
          <div>
            {taskGroup('오늘 계획한 과업', fresh, '아직 오늘 계획한 과업이 없습니다. 작은 일 하나부터 등록하세요.')}
            {taskGroup('이전부터 이어온 과업', carried, '이전 날짜에서 이어온 미완료 과업이 없습니다.', 'carry')}
            {carried.length > 0 && <p className={styles.note}>경과 일수는 미완료 상태로 지난 기간입니다. 직접 미룬 횟수나 성향을 뜻하지 않습니다. 첫 행동을 줄이거나, 일정을 조정하거나, 보류할 수 있습니다.</p>}
            {taskGroup('오늘 완료한 과업', completed, '오늘 완료한 과업이 아직 없습니다.', 'done')}
            {(future.length > 0 || paused.length > 0) && <details className={styles.panel} data-surface="carry"><summary>예정·보류한 과업 {future.length + paused.length}개</summary><ul className={styles.taskList}>{[...future, ...paused].map(taskCard)}</ul></details>}
          </div>
          <div>
            <RoutinePanel routines={routines} readOnly={readOnly} edit={routine => setEditor({ kind: 'routine', routine })} editCheck={(routine, check) => setEditor({ kind: 'check', routine, day: today, check })} change={change} today={today} />
          </div>
        </div>
      </> : <>
        <section className={styles.panel}><div className={base.dateBrowser}><button disabled={date <= '2000-01-01'} aria-label="이전 날짜" onClick={() => setParams({ date: shiftDay(date, -1) })}>←</button><label>조회 날짜<input type="date" min="2000-01-01" max={today} value={date} onChange={e => { if (validDay(e.target.value)) setParams({ date: e.target.value }) }} /></label><button disabled={date >= today} aria-label="다음 날짜" onClick={() => setParams({ date: shiftDay(date, 1) })}>→</button><button onClick={() => setParams({ date: today })}>오늘</button></div><div className={styles.panelHeading}><div><h2>{date} 계획과 결과</h2><p>당일 완료 {rows.filter(r => r.completed).length} / 당시 대상 {rows.length} · 이어짐 {rows.filter(r => r.carried).length} · 일정 조정 {rows.filter(r => r.moved).length}</p><p className={styles.note}>과업 수는 작업량이 아닙니다. 이후 완료는 과거 당일 완료율을 바꾸지 않습니다.</p></div></div><ul className={styles.taskList}>{rows.map(row => <li key={row.task.id} className={styles.task}><div><h3>{row.task.title}</h3><p>{row.completed ? '당일 완료' : row.moved ? `일정 조정 → ${row.task.scheduled_date}` : row.task.status === 'paused' ? '보류' : row.task.status === 'cancelled' ? '취소' : '미완료 · 다음 날로 이어짐'}</p>{!row.completed && row.current.status === 'completed' && row.current.completed_at && seoulDay(row.current.completed_at) > date && <p>이후 {seoulDay(row.current.completed_at)} 완료</p>}</div></li>)}</ul>{!rows.length && <p className={styles.empty}>이 날짜의 과업 기록이 없습니다.</p>}</section>
        <section className={styles.panel} data-surface="routine"><div className={styles.panelHeading}><h2>루틴 실천 기록</h2></div><ul className={styles.taskList}>{w.routines.filter(r => r.created_on <= date).map(r => {
          const check = w.checks.find(c => c.routine_id === r.id && c.day === date)
          return <li className={styles.routineCard} key={r.id}>
            <div className={styles.routineHeader}><h3>{r.title}{r.archived ? ' · 보관됨' : ''}</h3><span>{check ? '실천함' : '기록 없음'}</span></div>
            <RoutineCheckDetails check={check} />
          </li>
        })}</ul><p className={styles.note}>실천 기록은 오늘 화면에서 변경합니다. 미실천은 벌점이나 이월 대상이 아닙니다.</p></section>
        <section className={styles.closed}><h2>하루의 회고 · {dayJournal?.closed ? '마감됨' : '열려 있음'}</h2><p>오늘 알게 된 것 · {dayJournal?.reflection || '남긴 회고가 없습니다.'}</p><p>내일의 첫 행동 · {dayJournal?.tomorrow || '남긴 내용이 없습니다.'}</p>{dayJournal?.closed ? <ActionButton icon="unlock" label="마감 다시 열기" disabled={locked} onClick={() => void change('reopen_day', { day: date }, '선택한 날짜의 마감을 다시 열었습니다.')} /> : <ActionButton icon="edit" label="회고 수정·마감" disabled={locked} onClick={() => setEditor({ kind: 'journal', day: date })} />}<p className={styles.note}>과거 회고를 수정해도 과업 완료 시각을 과거로 바꾸지 않습니다.</p></section>
      </>}
    </>}
    <div className={base.bottom}><Link to="/">← MIG DOT 메인</Link><Link to="/documentations?doc=%2Fdocs%2Fdocumentations%2Fexecution-tracker%2Foverview.md">사용 안내 →</Link></div>
    {editor && <Dialog title={editor.kind === 'task' ? editor.task ? '과업 수정' : '과업 등록' : editor.kind === 'schedule' ? '일정 조정' : editor.kind === 'routine' ? editor.routine ? '루틴 수정' : '루틴 등록' : editor.kind === 'check' ? '루틴 상세 기록' : `${editor.day} 하루 마감`} busy={busy} close={() => setEditor(null)}>
      <form onSubmit={async e => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const text = (key: string) => String(form.get(key) ?? '').trim()
        let command: string; let payload: Record<string, unknown>
        if (editor.kind === 'task') { command = editor.task ? 'edit_task' : 'create_task'; payload = { id: editor.task?.id, title: text('title'), next_action: text('next_action'), day: text('day') || today } }
        else if (editor.kind === 'schedule') { command = 'schedule_task'; payload = { id: editor.task.id, day: text('day') } }
        else if (editor.kind === 'routine') { command = editor.routine ? 'edit_routine' : 'create_routine'; payload = { id: editor.routine?.id, title: text('title'), goal: text('goal'), expected_outcome: text('expected_outcome'), practice_cue: text('practice_cue'), minimum_action: text('minimum_action') } }
        else if (editor.kind === 'check') { command = 'check_routine'; payload = { id: editor.routine.id, day: editor.day, checked: true, practice_note: text('practice_note'), effort: text('effort') } }
        else { command = 'close_day'; payload = { day: editor.day, reflection: text('reflection'), tomorrow: text('tomorrow') } }
        if (await change(command, payload, editor.kind === 'journal' ? '하루의 회고를 저장했습니다.' : '기록을 저장했습니다.')) setEditor(null)
      }}><fieldset className={styles.form} disabled={busy}>
        {editor.kind === 'task' ? <><label>과업 이름<input required maxLength={100} name="title" pattern=".*\S.*" defaultValue={editor.task?.title} /></label><label>첫 행동 · 선택<input maxLength={160} name="next_action" defaultValue={editor.task?.next_action} placeholder="예: 문서를 열고 목차 세 가지 적기" /></label>{!editor.task && <label>계획 날짜<input type="date" name="day" min={today} max={shiftDay(today, 3660)} defaultValue={today} required /></label>}</> : editor.kind === 'schedule' ? <><p>최초 계획일과 기존 이력은 유지합니다. 예정일까지 자동 이월하지 않습니다.</p><label>다시 실행할 날짜<input type="date" name="day" min={today} max={shiftDay(today, 3660)} defaultValue={shiftDay(today, 1)} required /></label></> : editor.kind === 'routine' ? <>
          <label>루틴 이름<input name="title" required maxLength={100} pattern=".*\S.*" defaultValue={editor.routine?.title} placeholder="예: 점심 먹고 15분 걷기" /></label>
          <label>이 루틴의 목표<input name="goal" required maxLength={160} pattern=".*\S.*" defaultValue={editor.routine?.goal} placeholder="예: 오후에 덜 지치기" /></label>
          <label>기대 결과<input name="expected_outcome" required maxLength={160} pattern=".*\S.*" defaultValue={editor.routine?.expected_outcome} placeholder="예: 오후 업무를 시작할 때 졸음이 줄어든다" /></label>
          <label>시작 신호<input name="practice_cue" required maxLength={120} pattern=".*\S.*" defaultValue={editor.routine?.practice_cue} placeholder="예: 점심을 먹고 자리에서 일어나면" /></label>
          <label>가장 작은 실천<input name="minimum_action" required maxLength={120} pattern=".*\S.*" defaultValue={editor.routine?.minimum_action} placeholder="예: 건물 밖까지 걷기" /></label>
          <p className={styles.note}>새 루틴은 레벨 1에서 시작합니다. 가장 작은 실천을 한 날도 1 XP이며, 누적 {FIRST_LEVEL_DAYS}일을 채우면 레벨 2가 됩니다.</p>
        </> : editor.kind === 'check' ? <>
          <p>{editor.routine.title} · {editor.day}</p>
          <label>실천 내용 · 선택<textarea name="practice_note" rows={4} maxLength={600} defaultValue={editor.check?.practice_note} placeholder="무엇을 얼마나 했나요? 달라진 점이나 어려웠던 점도 남길 수 있어요." /></label>
          <label>오늘의 난이도 · 선택<select name="effort" defaultValue={editor.check?.effort ?? ''}><option value="">선택 안 함</option>{Object.entries(effortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </> : <>{editor.day === today && pendingRoutineCount > 0 && <p>오늘 실천 기록이 없는 루틴이 {pendingRoutineCount}개 있습니다.</p>}<p>미완료가 있어도 마감할 수 있습니다. 다음 날 이어지며 언제든 다시 열 수 있습니다.</p><label>오늘 알게 된 것 · 선택<textarea name="reflection" rows={4} maxLength={1000} defaultValue={w.days.find(d => d.day === editor.day)?.reflection} /></label><label>내일의 첫 행동 · 선택<input name="tomorrow" maxLength={160} defaultValue={w.days.find(d => d.day === editor.day)?.tomorrow} /></label><p className={styles.note}>회고의 첫 행동을 적어도 새 과업을 자동 생성하지 않습니다.</p></>}
        {error && <div role="alert"><p>{error}</p><ActionButton icon="refresh" label="최신 기록 불러오기" disabled={busy} onClick={() => void load()} /></div>}
        {!online && <p role="alert">오프라인입니다. 입력을 유지하고 있습니다. 연결이 돌아오면 저장하세요.</p>}
        <ActionButton icon="check" label={busy ? '저장 중…' : editor.kind === 'journal' ? '하루 마감 완료' : '저장'} tone="primary" type="submit" disabled={locked} />{busy && <p role="status">저장 중…</p>}<p className={styles.note}>서버 저장을 확인한 뒤 화면에 반영합니다.</p></fieldset>
      </form>
    </Dialog>}
  </div>
}
