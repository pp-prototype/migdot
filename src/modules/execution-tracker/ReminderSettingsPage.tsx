import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../shared/Icon'
import { useAuth } from '../../shared/auth/context'
import {
  disableExecutionPush, enableExecutionPush, executionPushEnabled, executionPushKey,
  executionPushSupport, registerExecutionPush,
} from '../../shared/lib/executionPush'
import ActionButton from './ActionButton'
import TrackerNavigation from './TrackerNavigation'
import base from './tracker.module.css'
import styles from './reminders.module.css'

const reminders = [
  { time: '17:00', label: '오후 5시', title: '미완료 과업', description: '오늘 할 과업이나 이전에 이월된 과업이 남아 있을 때', icon: 'calendar' },
  { time: '21:00', label: '오후 9시', title: '루틴 실천', description: '진행 중인 루틴 중 오늘 실천 기록이 없는 항목이 있을 때', icon: 'check' },
] as const

type DeviceState = 'loading' | 'install' | 'unsupported' | 'denied' | 'off' | 'on' | 'error'

const deviceMessage: Record<DeviceState, string> = {
  loading: '이 기기의 구독 상태를 확인하는 중입니다.',
  install: '홈 화면에 추가한 후 앱 아이콘으로 열어 주세요.',
  unsupported: '이 브라우저에서는 푸시 알림을 지원하지 않습니다.',
  denied: '기기나 브라우저의 알림 설정에서 이 앱의 알림을 허용해 주세요.',
  off: '이 기기의 알림이 꺼져 있습니다.',
  on: '이 기기에서 과업과 루틴 알림을 받습니다.',
  error: '알림 상태를 확인하지 못했습니다. 화면을 새로고침해 주세요.',
}

function DeviceControls() {
  const auth = useAuth()
  const configured = auth.status === 'ready' && Boolean(executionPushKey)
  const support = configured ? executionPushSupport() : null
  const [device, setDevice] = useState<DeviceState>('loading')
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  useEffect(() => {
    if (support !== 'supported') return
    let active = true
    async function read() {
      try {
        const worker = await registerExecutionPush()
        const subscription = await worker.pushManager.getSubscription()
        const state = Notification.permission === 'denied' ? 'denied'
          : subscription && await executionPushEnabled(subscription) ? 'on' : 'off'
        if (active) { setRegistration(worker); setDevice(state) }
      } catch {
        if (active) setDevice('error')
      }
    }
    void read()
    return () => { active = false }
  }, [support, auth.user?.id])

  const state = support === 'install' || support === 'unsupported' ? support : device

  async function toggle() {
    if (!registration || busy || (state !== 'on' && state !== 'off')) return
    setBusy(true)
    setFailure('')
    try {
      if (state === 'on') {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) await disableExecutionPush(subscription)
        setDevice('off')
      } else {
        await enableExecutionPush(registration)
        setDevice('on')
      }
    } catch {
      if (Notification.permission === 'denied') setDevice('denied')
      else {
        try {
          const subscription = await registration.pushManager.getSubscription()
          const enabled = subscription && await executionPushEnabled(subscription)
          setDevice(enabled ? 'on' : 'off')
        } catch { setDevice('error') }
        setFailure('알림 설정을 변경하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.')
      }
    } finally {
      setBusy(false)
    }
  }

  const message = auth.status === 'preview' ? '체험 모드에서는 푸시 구독을 사용하지 않습니다.'
    : !configured ? '이 환경의 푸시 발송 설정이 아직 연결되지 않았습니다.'
    : deviceMessage[state]
  const label = busy ? '변경 중…' : state === 'on' ? '알림 끄기' : '알림 켜기'
  return <>
    <div className={styles.deviceHeading}>
      <div><h2 id="reminder-device">이 기기의 푸시 알림</h2><p id="reminder-status" role="status">{message}</p></div>
      <ActionButton icon="bell" label={label} visibleLabel={label} tone={state === 'on' ? 'default' : 'primary'}
        disabled={!configured || busy || (state !== 'on' && state !== 'off')} aria-describedby="reminder-status" onClick={() => void toggle()} />
    </div>
    {failure && <p className={styles.failure} role="alert">{failure}</p>}
  </>
}

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
      <DeviceControls />
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
