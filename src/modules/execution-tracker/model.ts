import { records, tasks, type Task } from './data'

export type Mission = Task & { nextAction: string; originalDate: string; reason?: string }
export type Journal = {
  tasks: Mission[]
  records: Record<string, boolean>
  activeId: string | null
  closed: boolean
  reflection: string
  tomorrow: string
}
export function createJournal(): Journal {
  return {
    tasks: tasks.map(task => ({ ...task, originalDate: task.date, nextAction: task.id === 'plan' ? '문서를 열고 목차 세 가지를 적기' : task.id === 'review' ? '가장 최근 변경 한 가지부터 확인하기' : '' })),
    records: { ...records }, activeId: null, closed: false, reflection: '', tomorrow: '',
  }
}
