import Executioner from './Executioner'
import TrackerNavigation from './TrackerNavigation'
import styles from './workspace.module.css'

export default function TrackerHeader({ day, preview = false }: { day?: string; preview?: boolean }) {
  return <header className={styles.workspaceHeader}>
    <div className={styles.identity}>
      <span className={styles.headerMark} aria-hidden="true"><Executioner mood="ready" level={1} /></span>
      <div>
        <h1>익스큐셔너</h1>
        {day && <p><time dateTime={day}>{day}</time> · {preview ? '예시 날짜' : '한국 시간'}</p>}
      </div>
    </div>
    <TrackerNavigation />
  </header>
}
