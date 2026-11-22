import { Link } from 'react-router-dom'
import { Icon } from '../../shared/Icon'
import ActionButton from './ActionButton'
import TrackerNavigation from './TrackerNavigation'
import base from './tracker.module.css'
import styles from './reminders.module.css'

const reminders = [
  { time: '17:00', label: '오후 5시', title: '미완료 과업', description: '오늘 할 과업이나 이전에 이월된 과업이 남아 있을 때', icon: 'calendar' },
  { time: '21:00', label: '오후 9시', title: '루틴 실천', description: '오늘 실천 기록이 없는 루틴이 있을 때', icon: 'check' },
] as const

export default function ReminderSettingsPage() {
  return <div className={base.tracker}>
    <p className={base.breadcrumb}><Link to="/">메인</Link> / <Link to="/execution-tracker">익스큐셔너</Link> / 알림 설정</p>
    <div className={base.heading}><div><h1>알림 설정</h1><p>과업과 루틴을 마무리할 시간을 알려드려요.</p></div></div>
    <TrackerNavigation />
    <section className={styles.schedule} aria-labelledby="reminder-schedule">
      <header className={styles.heading}><h2 id="reminder-schedule">알림 일정</h2><span>매일 · 한국 시간</span></header>
      <ul className={styles.list}>{reminders.map(reminder => <li key={reminder.time}>
        <span className={styles.icon}><Icon name={reminder.icon} /></span>
        <div className={styles.copy}><h3>{reminder.title}</h3><p>{reminder.description}</p></div>
        <time dateTime={reminder.time}>{reminder.label}</time>
      </li>)}</ul>
    </section>
    <section className={styles.device} aria-labelledby="reminder-device">
      <div className={styles.deviceHeading}>
        <div><h2 id="reminder-device">이 기기의 푸시 알림</h2><p id="reminder-status">푸시 연결 준비 중입니다.</p></div>
        <ActionButton icon="bell" label="알림 켜기" visibleLabel="알림 켜기" tone="primary" disabled aria-describedby="reminder-status" />
      </div>
      <details className={styles.install}>
        <summary>홈 화면에 추가하는 방법</summary>
        <ul>
          <li><strong>iPhone·iPad</strong>에서 Safari의 공유 메뉴를 열고 ‘홈 화면에 추가’를 선택하세요.</li>
          <li><strong>Android</strong>에서 Chrome 메뉴를 열고 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 선택하세요.</li>
        </ul>
      </details>
    </section>
  </div>
}
