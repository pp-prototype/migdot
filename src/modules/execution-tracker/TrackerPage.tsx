import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../../shared/Icon'
import { days, routines, sampleDay, shiftDay, validDay, type Task } from './data'
import styles from './tracker.module.css'

import { createJournal } from './model'
import Experience from './Experience'
import { useAuth } from '../../shared/auth/context'
import CloudTracker from './CloudTracker'
import TrackerHeader from './TrackerHeader'
import ReminderSettingsPage from './ReminderSettingsPage'
import TrackerNavigation from './TrackerNavigation'

const root = '/execution-tracker'
function TaskList({ items }: { items: Task[] }) {
  return items.length ? <ul className={styles.taskList}>{items.map((task, index) => <li key={task.id}><span className={`${styles.taskMark} ${task.done ? styles.complete : ''}`} aria-hidden="true">{task.done ? '✓' : String(index + 1).padStart(2, '0')}</span><div><span className={styles.itemLabel}>{task.done ? '완료' : '미완료'}</span><h3 className={task.done ? styles.doneTitle : ''}>{task.title}</h3></div><span className={`${styles.state} ${task.done ? styles.complete : ''}`}>{task.done ? '완료' : '예정'}</span></li>)}</ul> : <p className={styles.empty}>이 날짜에는 등록한 과업이 없습니다.</p>
}
export default function TrackerPage() {
  const auth = useAuth()
  const { '*': subpath } = useParams()
  if (auth.status === 'preview') return <PreviewTracker />
  return subpath === 'reminders' ? <ReminderSettingsPage /> : <CloudTracker />
}
function PreviewTracker() {
  const [journal, setJournal] = useState(createJournal)
  const { records, tasks } = journal
  const { '*': subpath = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const isRecords = subpath === 'records'
  const dayParam = params.get('date') ?? sampleDay
  const date = validDay(dayParam) && dayParam >= days[0] && dayParam <= sampleDay ? dayParam : sampleDay
  const selected = routines.find(item => item.id === params.get('routine')) ?? routines[0]
  const selectedDays = days.filter(day => records[`${selected.id}:${day}`]).length
  function selectDate(day: string) {
    if (!validDay(day) || day < days[0] || day > sampleDay) return
    setParams({ date: day, routine: selected.id })
  }
  if (subpath === 'reminders') return <ReminderSettingsPage />
  return <div className={styles.tracker}>
    <TrackerHeader day={sampleDay} preview />
    <div className={styles.notice}><Icon name="documentations" /><p>예시 데이터로 체험 중입니다. 변경 내용은 저장되지 않으며 새로고침하거나 모듈을 벗어나면 초기화됩니다. 예시 기준일: {sampleDay}.</p></div>
    <TrackerNavigation />
    {subpath !== '' && !isRecords ? <section className={styles.empty}><h2>페이지를 찾을 수 없습니다.</h2><Link to={root}>오늘 화면으로 이동</Link></section> : !isRecords ? <Experience journal={journal} setJournal={setJournal} /> : <>
      <div className={styles.recordHeading}><div><h2>꾸준함의 기록</h2><p>최근 28일의 루틴 실천과 날짜별 과업을 확인하세요.</p></div><span className={styles.period}>{days[0]} ~ {sampleDay}</span></div>
      <section className={styles.panel}><div className={styles.dateBrowser}><button aria-label="이전 날짜" disabled={date <= days[0]} onClick={() => selectDate(shiftDay(date, -1))}>←</button><label>조회 날짜<input type="date" aria-label="조회 날짜" min={days[0]} max={sampleDay} value={date} onChange={event => selectDate(event.target.value)} /></label><button aria-label="다음 날짜" disabled={date >= sampleDay} onClick={() => selectDate(shiftDay(date, 1))}>→</button><button onClick={() => selectDate(sampleDay)}>기준일</button></div>
      <div className={styles.routineTabs} role="group" aria-label="루틴 선택">{routines.map(routine => <button key={routine.id} aria-pressed={routine.id === selected.id} onClick={() => setParams({ date, routine: routine.id })}>{routine.title}</button>)}</div>
      <div className={styles.heatmapHeading}><h3>{selected.title}</h3><span>28일 중 {selectedDays}일 실천</span></div><div className={styles.heatmap} aria-label="최근 28일 실천 기록">{days.map(day => <button key={day} disabled={day < selected.createdOn} aria-label={`${day} ${day < selected.createdOn ? '생성 전' : records[`${selected.id}:${day}`] ? '실천함' : '기록 없음'}`} aria-pressed={date === day} className={records[`${selected.id}:${day}`] ? styles.filled : ''} onClick={() => selectDate(day)}>{Number(day.slice(-2))}</button>)}</div><div className={styles.legend}><span><i />기록 없음</span><span><i className={styles.filled} />실천함</span><span>흐린 날짜는 생성 전입니다.</span></div><p className={styles.selectedState} role="status">{date} · {date < selected.createdOn ? '생성 전' : records[`${selected.id}:${date}`] ? '실천함' : '기록 없음'}</p></section>
      <section className={`${styles.panel} ${styles.history}`}><div className={styles.sectionTitle}><div><h2>{date} 과업</h2><p>예시 기록과 이번 체험에서 변경한 기준일의 과업을 표시합니다.</p></div></div><TaskList items={tasks.filter(task => task.date === date)} /></section><p className={styles.footnote}>실천하지 않은 날짜는 실패로 표시하지 않습니다. 기록 조회는 완료 상태를 변경하지 않습니다.</p>
    </>}
    <div className={styles.bottom}><Link to="/">← MIG DOT 메인</Link><Link to={`/documentations?${new URLSearchParams({ doc: '/docs/documentations/execution-tracker/overview.md' })}`}>사용 안내 →</Link></div>
  </div>
}
