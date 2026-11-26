import { Link } from 'react-router-dom'
import styles from './learner-shell.module.css'

export default function LearnerHeader({ root, inTopic = false }: { root: string; inTopic?: boolean }) {
  return <header className={styles.header}>
    <h1><span className={styles.logo} aria-hidden="true" />포스트잇 러너</h1>
    {inTopic && <Link to={root}>← 학습 주제 목록</Link>}
  </header>
}
