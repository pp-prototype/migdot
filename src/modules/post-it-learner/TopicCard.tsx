import { Link } from 'react-router-dom'
import styles from './topic-card.module.css'

export default function TopicCard({ to, cover, name, description, noteCount }: {
  to: string
  cover: string
  name: string
  description?: string
  noteCount?: number
}) {
  return <Link className={styles.card} to={to}>
    <div className={styles.image}><img src={cover} alt="" /></div>
    <div className={styles.content}>
      <div>
        <h3>{name}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className={styles.footer}>
        {noteCount !== undefined && <span>포스트잇 {noteCount}장</span>}
        <span className={styles.action}>보드 열기 <span className={styles.arrow} aria-hidden="true">↗</span></span>
      </div>
    </div>
  </Link>
}
