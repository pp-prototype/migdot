import { validDay } from './data'

export type CloudTask = {
  id: string; owner_id: string; title: string; next_action: string
  original_date: string; scheduled_date: string
  status: 'open' | 'completed' | 'paused' | 'cancelled'
  completed_at: string | null; created_at: string
}
export type TaskEvent = { id: number; task_id: string; action: string; happened_at: string; snapshot: CloudTask }
export type Routine = { id: string; title: string; created_on: string; archived: boolean }
export type DayJournal = { day: string; closed: boolean; reflection: string; tomorrow: string }
export type Workspace = {
  today: string; revision: number; active_id: string | null
  tasks: CloudTask[]; events: TaskEvent[]; routines: Routine[]
  checks: { routine_id: string; day: string }[]; days: DayJournal[]
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
    !w.routines.every(r => r && 'owner_id' in r && r.owner_id === owner && typeof r.id === 'string' && typeof r.title === 'string' && validDay(r.created_on) && typeof r.archived === 'boolean') ||
    !w.checks.every(c => c && 'owner_id' in c && c.owner_id === owner && typeof c.routine_id === 'string' && validDay(c.day)) ||
    !w.days.every(d => d && 'owner_id' in d && d.owner_id === owner && validDay(d.day) && typeof d.closed === 'boolean' && typeof d.reflection === 'string' && typeof d.tomorrow === 'string') ||
    !(w.active_id === null || typeof w.active_id === 'string')) throw new Error('Invalid workspace')
  return w
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
