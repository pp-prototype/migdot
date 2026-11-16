import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../../shared/Icon'
import { days, records, routines, sampleDay, shiftDay, taskProgress, tasks, validDay, type Task } from './data'
import styles from './tracker.module.css'

const root = '/execution-tracker'
function TaskList({ items }: { items: Task[] }) {
  return items.length ? <ul className={styles.taskList}>{items.map((task, index) => <li key={task.id}><span className={`${styles.taskMark} ${task.done ? styles.complete : ''}`} aria-hidden="true">{task.done ? '✓' : String(index + 1).padStart(2, '0')}</span><div><span className={styles.itemLabel}>{task.done ? '완료' : '미완료'}</span><h3 className={task.done ? styles.doneTitle : ''}>{task.title}</h3></div><span className={`${styles.state} ${task.done ? styles.complete : ''}`}>{task.done ? '완료' : '예정'}</span></li>)}</ul> : <p className={styles.empty}>이 날짜에는 등록한 과업이 없습니다.</p>
}
export default function TrackerPage() {
  const { '*': subpath = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const isRecords = subpath === 'records'
  const dayParam = params.get('date') ?? sampleDay
  const date = validDay(dayParam) && dayParam >= days[0] && dayParam <= sampleDay ? dayParam : sampleDay
  const selected = routines.find(item => item.id === params.get('routine')) ?? routines[0]
  const progress = taskProgress(tasks.filter(task => task.date === sampleDay))
  const routineCount = routines.filter(routine => records[`${routine.id}:${sampleDay}`]).length
  const selectedDays = days.filter(day => records[`${selected.id}:${day}`]).length
  function selectDate(day: string) {
    if (!validDay(day) || day < days[0] || day > sampleDay) return
    setParams({ date: day, routine: selected.id })
  }
  return <div className={styles.tracker}>
    <p className={styles.breadcrumb}><Link to="/">메인</Link> / 실행 트래커</p>
    <div className={styles.heading}><div><p className={styles.eyebrow}>작은 실행을 차곡차곡</p><h1>실행 트래커</h1><p>오늘 끝낼 일과 나를 위한 좋은 습관을 구분해 살펴보세요.</p></div><span className={styles.preview}>미리보기</span></div>
    <div className={styles.notice}><Icon name="documentations" /><p>예시 기록을 살펴보는 읽기 전용 화면입니다. 기준일은 {sampleDay}이며 실제 오늘의 기록이 아닙니다. 완료 처리·저장·집중 실행은 제공하지 않습니다.</p></div>
    <nav className={styles.tabs} aria-label="실행 트래커 메뉴"><NavLink to={root} end>오늘</NavLink><NavLink to={`${root}/records`}>기록</NavLink></nav>
    {subpath !== '' && !isRecords ? <section className={styles.empty}><h2>페이지를 찾을 수 없습니다.</h2><Link to={root}>오늘 화면으로 이동</Link></section> : !isRecords ? <>
      <section className={styles.summary} aria-labelledby="summary-title"><div className={styles.summaryTop}><div><p className={styles.eyebrow}>오늘의 과업 · 예시 기준일 {sampleDay}</p><h2 id="summary-title">{progress.total ? `${progress.remaining}개의 과업이 남았어요` : '등록한 과업이 없어요'}</h2></div><span className={styles.fraction}>{progress.done}<small> / {progress.total}</small></span></div><div className={styles.progress} role="progressbar" aria-label="필수 과업 완료" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total || 1}><span style={{ width: `${progress.percent}%` }} /></div><p>진행률은 필수 과업만으로 계산합니다. 선택 루틴의 실천 여부는 포함하지 않습니다.</p></section>
      <div className={styles.todayGrid}><section className={styles.panel} aria-labelledby="task-title"><div className={styles.sectionTitle}><div><h2 id="task-title">필수 과업</h2><p>예시 기준일에 끝내기로 한 일</p></div><span>{progress.total}개</span></div><TaskList items={tasks.filter(task => task.date === sampleDay)} /><p className={styles.panelFoot}>타이머 종료와 과업 완료는 별개로 다룹니다.</p></section>
      <section className={styles.panel} aria-labelledby="routine-title"><div className={styles.sectionTitle}><div><h2 id="routine-title">선택 루틴</h2><p>해야만 하는 일보다, 나를 위한 좋은 실천</p></div><span>{routineCount} / {routines.length} 실천</span></div><ul className={styles.routineList}>{routines.map(routine => <li key={routine.id}><span className={`${styles.routineMark} ${records[`${routine.id}:${sampleDay}`] ? styles.practiced : ''}`} aria-hidden="true">{records[`${routine.id}:${sampleDay}`] ? '✓' : '·'}</span><div><h3>{routine.title}</h3><p>{routine.detail}</p></div><span className={styles.routineState}>{records[`${routine.id}:${sampleDay}`] ? '실천함' : '기록 없음'}</span></li>)}</ul><Link className={styles.panelLink} to={`${root}/records`}>루틴 기록 살펴보기 <Icon name="arrow" /></Link></section></div>
    </> : <>
      <div className={styles.recordHeading}><div><h2>꾸준함의 기록</h2><p>최근 28일의 루틴 실천과 날짜별 과업을 확인하세요.</p></div><span className={styles.period}>{days[0]} ~ {sampleDay}</span></div>
      <section className={styles.panel}><div className={styles.dateBrowser}><button aria-label="이전 날짜" disabled={date <= days[0]} onClick={() => selectDate(shiftDay(date, -1))}>←</button><label>조회 날짜<input type="date" aria-label="조회 날짜" min={days[0]} max={sampleDay} value={date} onChange={event => selectDate(event.target.value)} /></label><button aria-label="다음 날짜" disabled={date >= sampleDay} onClick={() => selectDate(shiftDay(date, 1))}>→</button><button onClick={() => selectDate(sampleDay)}>기준일</button></div>
      <div className={styles.routineTabs} role="group" aria-label="루틴 선택">{routines.map(routine => <button key={routine.id} aria-pressed={routine.id === selected.id} onClick={() => setParams({ date, routine: routine.id })}>{routine.title}</button>)}</div>
      <div className={styles.heatmapHeading}><h3>{selected.title}</h3><span>28일 중 {selectedDays}일 실천</span></div><div className={styles.heatmap} aria-label="최근 28일 실천 기록">{days.map(day => <button key={day} disabled={day < selected.createdOn} aria-label={`${day} ${day < selected.createdOn ? '생성 전' : records[`${selected.id}:${day}`] ? '실천함' : '기록 없음'}`} aria-pressed={date === day} className={records[`${selected.id}:${day}`] ? styles.filled : ''} onClick={() => selectDate(day)}>{Number(day.slice(-2))}</button>)}</div><div className={styles.legend}><span><i />기록 없음</span><span><i className={styles.filled} />실천함</span><span>흐린 날짜는 생성 전입니다.</span></div><p className={styles.selectedState} role="status">{date} · {date < selected.createdOn ? '생성 전' : records[`${selected.id}:${date}`] ? '실천함' : '기록 없음'}</p></section>
      <section className={`${styles.panel} ${styles.history}`}><div className={styles.sectionTitle}><div><h2>{date} 과업</h2><p>등록된 예시 기록만 표시합니다.</p></div></div><TaskList items={tasks.filter(task => task.date === date)} /></section><p className={styles.footnote}>실천하지 않은 날짜는 실패로 표시하지 않습니다. 기록 조회는 완료 상태를 변경하지 않습니다.</p>
    </>}
    <div className={styles.bottom}><Link to="/">← MIG DOT 메인</Link><Link to={`/documentations?${new URLSearchParams({ doc: '/docs/documentations/execution-tracker/overview.md' })}`}>사용 안내 →</Link></div>
  </div>
}
