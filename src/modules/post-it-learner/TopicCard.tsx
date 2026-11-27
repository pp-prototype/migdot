import { Link } from 'react-router-dom'
import shell from './learner-shell.module.css'
import styles from './topic-card.module.css'

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' })

export default function TopicCard({ to, cover, name, description, noteCount, latestUpload }: {
  to: string
  cover: string
  name: string
  description?: string
  noteCount: number
  latestUpload: string | null
}) {
  return <Link className={styles.card} to={to}>
    <div className={styles.image}><img src={cover} alt="" /></div>
    <div className={styles.content}>
      <div>
        <div className={styles.titleRow}>
          <h3>{name}</h3>
          <span className={styles.count} role="img" aria-label={`포스트잇 ${noteCount}장`}>
            <span className={`${shell.logo} ${styles.countIcon}`} aria-hidden="true" />
            {noteCount}
          </span>
        </div>
        {description && <p>{description}</p>}
      </div>
      <div className={styles.footer}>
        {latestUpload
          ? <span>최근 업로드 <time dateTime={latestUpload}>{dateFormat.format(new Date(latestUpload))}</time></span>
          : <span>업로드 없음</span>}
        <span className={styles.action}>보드 열기 <span className={styles.arrow} aria-hidden="true">↗</span></span>
      </div>
    </div>
  </Link>
}
