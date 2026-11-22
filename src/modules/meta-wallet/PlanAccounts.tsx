import { useEffect, useRef, useState, type FormEvent } from 'react'
import styles from './wallet.module.css'

export type AccountKind = '일반 부채' | '카드' | '대출' | '저축'
export type PlanAccount = { id: string; kind: AccountKind; name: string; balance: number | null; goal: number | null }
export type AccountPayment = { date: string; amount: number }
export type AccountEditor = { kind: AccountKind; account?: PlanAccount }

const money = (value: number) => `${value.toLocaleString('ko-KR')}원`
const numeric = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 1_000_000_000_000
const debtKinds: AccountKind[] = ['일반 부채', '카드', '대출']

type Props = {
  accounts: PlanAccount[]
  editor: AccountEditor | null
  paymentFor: (id: string) => AccountPayment | undefined
  edit: (editor: AccountEditor | null) => void
  save: (account: PlanAccount, payment?: AccountPayment) => void
}

export default function PlanAccounts({ accounts, editor, paymentFor, edit, save }: Props) {
  const debts = accounts.filter(account => account.kind !== '저축')
  const savings = accounts.filter(account => account.kind === '저축')
  const debtTotal = debts.reduce((sum, account) => sum + (account.balance ?? 0), 0)
  const savedTotal = savings.reduce((sum, account) => sum + (account.balance ?? 0), 0)
  const dateLabel = (date: string) => date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3')
  const renderAccount = (account: PlanAccount) => {
    const payment = paymentFor(account.id)
    const isSavings = account.kind === '저축'
    const progress = account.goal && account.balance !== null ? Math.min(100, Math.floor(account.balance / account.goal * 100)) : null
    return <li key={account.id}>
      <div className={styles.accountRow}>
        <div><strong>{account.name}</strong><small>{account.kind}</small></div>
        <button type="button" className={styles.ghost} aria-label={`${account.name} 계좌 수정`} onClick={() => edit({ kind: account.kind, account })}>수정</button>
      </div>
      <p>{isSavings ? '현재 저축액' : '남은 부채'} <strong>{account.balance === null ? '미입력' : money(account.balance)}</strong>
        {isSavings && account.goal !== null && <> · 목표 {money(account.goal)}</>}</p>
      {progress !== null && <div className={styles.accountProgress}><progress value={progress} max={100} aria-label={`${account.name} 목표 달성률`} /><span>{progress}%</span></div>}
      {payment && <p className={styles.detail}>{dateLabel(payment.date)} · {isSavings ? '다음 저축' : '다음 납부'} {money(payment.amount)}</p>}
    </li>
  }

  return <div className={styles.accountArea}>
    <div className={styles.accountGrid}>
      <section className={styles.panel}>
        <h2>부채 · 카드 · 대출</h2>
        <p className={styles.detail}>{debts.some(account => account.balance !== null) ? `입력한 남은 부채 ${money(debtTotal)}` : '남은 부채와 다음 납부액을 기록하세요.'}</p>
        <ul className={styles.accountList}>{debts.map(renderAccount)}</ul>
        <button className={styles.ghost} onClick={() => edit({ kind: '일반 부채' })}>부채·카드·대출 추가</button>
      </section>
      <section className={styles.panel}>
        <h2>저축 계좌와 목표</h2>
        <p className={styles.detail}>{savings.length ? `현재 저축 합계 ${money(savedTotal)}` : '계좌별 현재 저축액과 목표를 기록하세요.'}</p>
        <ul className={styles.accountList}>{savings.map(renderAccount)}</ul>
        <button className={styles.ghost} onClick={() => edit({ kind: '저축' })}>저축 계좌 추가</button>
      </section>
    </div>
    {editor && <AccountForm key={editor.account?.id ?? editor.kind} editor={editor}
      payment={editor.account && paymentFor(editor.account.id)} close={() => edit(null)} save={save} />}
  </div>
}

function AccountForm({ editor, payment, close, save }: {
  editor: AccountEditor; payment?: AccountPayment; close: () => void; save: Props['save']
}) {
  const { account } = editor
  const [kind, setKind] = useState(editor.kind)
  const [name, setName] = useState(account?.name ?? '')
  const [balance, setBalance] = useState(account?.balance == null ? '' : String(account.balance))
  const [goal, setGoal] = useState(account?.goal == null ? '' : String(account.goal))
  const [schedule, setSchedule] = useState(Boolean(payment))
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '')
  const [date, setDate] = useState(payment?.date ?? '')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const isSavings = kind === '저축'
  const valid = Boolean(name.trim()) && (isSavings ? numeric(balance) : balance === '' || numeric(balance))
    && (!isSavings || goal === '' || (numeric(goal) && Number(goal) > 0))
    && (!schedule || (numeric(amount) && Number(amount) > 0 && Boolean(date)))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid) return
    save({ id: account?.id ?? crypto.randomUUID(), kind, name: name.trim(),
      balance: balance === '' ? null : Number(balance), goal: isSavings && goal !== '' ? Number(goal) : null },
    schedule ? { date, amount: Number(amount) } : undefined)
  }

  return <section className={styles.panel}>
    <h2 tabIndex={-1} ref={heading}>{isSavings ? '저축 계좌' : '부채·카드·대출'} {account ? '수정' : '추가'}</h2>
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.accountFields}>
        {!isSavings && <label>종류<select value={kind} onChange={event => setKind(event.target.value as AccountKind)}>{debtKinds.map(item => <option key={item}>{item}</option>)}</select></label>}
        <label>{isSavings ? '계좌 이름' : '부채 이름'}<input required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>{isSavings ? '현재 저축액 (원)' : '남은 부채 (원)'}<input type="number" inputMode="numeric" min="0" max="1000000000000" required={isSavings} value={balance} onChange={event => setBalance(event.target.value)} /></label>
        {isSavings && <label>목표 저축액 (원)<input type="number" inputMode="numeric" min="1" max="1000000000000" value={goal} onChange={event => setGoal(event.target.value)} /></label>}
      </div>
      <label className={styles.checkbox}><input type="checkbox" checked={schedule} onChange={event => setSchedule(event.target.checked)} />{isSavings ? '다음 저축 납입을 생활비 계산에 반영' : '다음 상환액을 생활비 계산에 반영'}</label>
      {schedule && <div className={styles.accountFields}>
        <label>{isSavings ? '다음 납입액 (원)' : '다음 상환액 (원)'}<input type="number" inputMode="numeric" min="1" max="1000000000000" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label>{isSavings ? '다음 납입일' : '다음 납부일'}<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
      </div>}
      <p className={styles.detail}>입력한 다음 일정이 예정 입출금에 연결돼요.</p>
      <div className={styles.entryOptions}><button className={styles.submit} disabled={!valid}>계좌 저장</button><button type="button" className={styles.ghost} onClick={close}>취소</button></div>
    </form>
  </section>
}
