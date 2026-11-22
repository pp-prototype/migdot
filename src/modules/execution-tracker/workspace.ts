import { shiftDay, validDay } from './data'

export type CloudTask = {
  id: string; owner_id: string; title: string; next_action: string
  original_date: string; scheduled_date: string
  status: 'open' | 'completed' | 'paused' | 'cancelled'
  completed_at: string | null; created_at: string
}
export type TaskEvent = { id: number; task_id: string; action: string; happened_at: string; snapshot: CloudTask }
export type Routine = { id: string; title: string; created_on: string; archived: boolean
  goal: string; expected_outcome: string
  practice_cue: string; minimum_action: string; plan_since: string; plan_revision: number
}
export const effortLabels = { easy: '가벼웠어요', manageable: '할 만했어요', hard: '버거웠어요' } as const
export type RoutineCheck = { routine_id: string; day: string; practice_note: string; plan_revision: number; effort: keyof typeof effortLabels | null }
export type DayJournal = { day: string; closed: boolean; reflection: string; tomorrow: string }
export type Workspace = {
  today: string; revision: number; active_id: string | null
  tasks: CloudTask[]; events: TaskEvent[]; routines: Routine[]
  checks: RoutineCheck[]; days: DayJournal[]
}
const dayFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
export function seoulDay(timestamp: string) { return dayFormat.format(new Date(timestamp)) }
export function elapsedDays(from: string, to: string) {
  return Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86400000))
}
export function parseWorkspace(value: unknown, owner: string): Workspace {
  const w = value as Workspace
  if (!w || !validDay(w.today) || !Number.isSafeInteger(w.revision) || w.revision < 0 ||
    ![w.tasks, w.events, w.routines, w.checks, w.days].every(Array.isArray)) throw new Error('Invalid workspace')
  const taskValid = (t: CloudTask) => t && t.owner_id === owner && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.next_action === 'string' && validDay(t.original_date) && validDay(t.scheduled_date) && ['open', 'completed', 'paused', 'cancelled'].includes(t.status) && Number.isFinite(Date.parse(t.created_at)) && (t.completed_at === null || Number.isFinite(Date.parse(t.completed_at)))
  if (!w.tasks.every(taskValid) || !w.events.every(e => e && typeof e.action === 'string' && Number.isSafeInteger(e.id) && typeof e.task_id === 'string' && Number.isFinite(Date.parse(e.happened_at)) && taskValid(e.snapshot) && e.task_id === e.snapshot.id) ||
    !w.routines.every(r => r && 'owner_id' in r && r.owner_id === owner && typeof r.id === 'string' && typeof r.title === 'string' && validDay(r.created_on) && typeof r.archived === 'boolean' && typeof r.goal === 'string' && typeof r.expected_outcome === 'string' && typeof r.practice_cue === 'string' && typeof r.minimum_action === 'string' && validDay(r.plan_since) && Number.isSafeInteger(r.plan_revision)) ||
    !w.checks.every(c => c && 'owner_id' in c && c.owner_id === owner && typeof c.routine_id === 'string' && validDay(c.day) && typeof c.practice_note === 'string' && Number.isSafeInteger(c.plan_revision) && (c.effort === null || Object.hasOwn(effortLabels, c.effort))) ||
    !w.days.every(d => d && 'owner_id' in d && d.owner_id === owner && validDay(d.day) && typeof d.closed === 'boolean' && typeof d.reflection === 'string' && typeof d.tomorrow === 'string') ||
    !(w.active_id === null || typeof w.active_id === 'string')) throw new Error('Invalid workspace')
  return w
}

export const FIRST_LEVEL_DAYS = 7

function routineSuggestion(routine: Routine, checks: RoutineCheck[], today: string) {
  if (!routine.practice_cue || !routine.minimum_action) {
    return { title: '가볍게 시작하기', text: '이미 하고 있는 행동 뒤에 아주 작은 실천을 붙여 보세요. 예를 들어 양치가 끝나면 책을 한 문장 읽는 식이에요.', edit: true }
  }

  const currentPlan = checks.filter(check => check.plan_revision === routine.plan_revision && check.day >= routine.plan_since)
  const rated = currentPlan.filter(check => check.effort !== null)
    .sort((a, b) => b.day.localeCompare(a.day)).slice(0, 2)
  const since = shiftDay(today, -6)

  if (rated[0]?.effort === 'hard' || (routine.plan_since <= since && !currentPlan.some(check => check.day >= since))) {
    return { title: '작게 다시 시작하기', text: '다음 기회에 가장 쉬운 한 번을 해 보세요. 여전히 버겁다면 행동을 더 줄이거나 시작 신호를 바꿔 보세요.', edit: true }
  }

  if (currentPlan.length >= FIRST_LEVEL_DAYS && rated.length === 2 && rated.every(check => check.effort === 'easy')) {
    return { title: '다음 단계 시도하기', text: '같은 계획으로 7일 이상 실천했고 최근 두 번의 난이도 기록이 가벼웠어요. 여유가 있다면 시작 신호는 그대로 두고 분량이나 시간 중 하나만 조금 늘려 보세요.', edit: true }
  }

  return { title: '같은 신호에서 반복하기', text: '정해 둔 신호가 오면 가장 작은 실천을 해 보세요. 기록에 난이도를 남기면 다음 실천의 크기를 조정하는 데 도움이 돼요.', edit: false }
}

export function routineProgress(workspace: Workspace) {
  const { today } = workspace
  const byRoutine = new Map<string, RoutineCheck[]>()
  for (const check of workspace.checks) {
    if (check.day > today) continue
    const checks = byRoutine.get(check.routine_id) ?? []
    checks.push(check)
    byRoutine.set(check.routine_id, checks)
  }
  return workspace.routines.filter(routine => !routine.archived).map(routine => {
    const checks = byRoutine.get(routine.id) ?? []
    const todayCheck = checks.find(check => check.day === today)
    // A workspace has at most one saved check per routine and Seoul calendar day.
    const count = checks.length
    const level: 1 | 2 = count >= FIRST_LEVEL_DAYS ? 2 : 1
    return { routine, todayCheck, checked: Boolean(todayCheck), count, level, suggestion: routineSuggestion(routine, checks, today) }
  })
}

// Past-day results use event-time snapshots, never today's mutable task status.
export function dayRows(w: Workspace, day: string) {
  const byTask = new Map<string, TaskEvent[]>()
  for (const event of w.events) {
    if (seoulDay(event.happened_at) > day) continue
    const events = byTask.get(event.task_id) ?? []
    events.push(event); byTask.set(event.task_id, events)
  }
  return w.tasks.flatMap(current => {
    const events = (byTask.get(current.id) ?? [])
      .sort((a, b) => a.happened_at.localeCompare(b.happened_at) || a.id - b.id)
    if (!events.length) return []
    const earlier = events.filter(e => seoulDay(e.happened_at) < day).at(-1)?.snapshot
    const sameDay = events.filter(e => seoulDay(e.happened_at) === day)
    const belongs = (earlier?.status === 'open' && earlier.scheduled_date <= day) ||
      sameDay.some(e => (e.snapshot.status === 'open' && e.snapshot.scheduled_date <= day))
    if (!belongs) return []
    const task = events.at(-1)!.snapshot
    const completed = task.status === 'completed' && task.completed_at !== null && seoulDay(task.completed_at) === day
    const moved = task.status === 'open' && task.scheduled_date > day
    return [{ task, current, completed, moved, carried: task.status === 'open' && !moved }]
  })
}
