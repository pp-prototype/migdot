import { NavLink } from 'react-router-dom'
import styles from './tracker.module.css'

export default function TrackerNavigation() {
  return <nav className={styles.tabs} aria-label="실행 트래커 메뉴">
    <NavLink to="/execution-tracker" end>오늘</NavLink>
    <NavLink to="/execution-tracker/records">기록</NavLink>
    <NavLink to="/execution-tracker/reminders">알림 설정</NavLink>
  </nav>
}
