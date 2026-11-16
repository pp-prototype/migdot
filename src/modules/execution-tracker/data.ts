// Date arithmetic adapted from execution-tracker d2c9035 + reviewed working tree,
// src/storage.js. Preview fixtures below are synthetic and contain no user data.
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
export const sampleDay = '2026-11-16'
export const days = Array.from({ length: 28 }, (_, index) => shiftDay(sampleDay, index - 27))
export const routines = [
  { id: 'exercise', title: '몸을 깨우는 30분', detail: '운동 · 하루 한 번', createdOn: shiftDay(sampleDay, -20) },
  { id: 'meal', title: '건강한 한 끼 기록', detail: '식습관 · 하루 한 번', createdOn: shiftDay(sampleDay, -15) },
  { id: 'journal', title: '하루를 돌아보는 기록', detail: '회고 · 하루 한 번', createdOn: shiftDay(sampleDay, -10) },
]
export type Task = { id: string; title: string; date: string; done: boolean }
export const tasks: Task[] = [
  { id: 'plan', title: '이번 주 기획안 완성하기', date: sampleDay, done: false },
  { id: 'read', title: '읽고 싶었던 책 20쪽 읽기', date: sampleDay, done: true },
  { id: 'review', title: '프로젝트 변경 사항 검토하기', date: sampleDay, done: false },
  { id: 'past-plan', title: '이번 주 일정 정리하기', date: shiftDay(sampleDay, -1), done: true },
  { id: 'past-notes', title: '학습 메모 정리하기', date: shiftDay(sampleDay, -1), done: false },
]
export const records = Object.fromEntries(routines.flatMap((routine, index) => days
  .filter((day, dayIndex) => day >= routine.createdOn && (day === sampleDay ? index !== 1 : (dayIndex + index) % 4 !== 0))
  .map(day => [`${routine.id}:${day}`, true])))
export function taskProgress(items: Task[]) {
  const done = items.filter(item => item.done).length
  return { done, total: items.length, remaining: items.length - done, percent: items.length ? done / items.length * 100 : 0 }
}
export function validDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
