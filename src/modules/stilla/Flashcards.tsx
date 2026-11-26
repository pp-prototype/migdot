import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../shared/Icon'
import { gradeCard, ratings, shuffledCardIds, type Card, type Grade, type Workspace } from './workspace'
import styles from './stilla.module.css'

type Props = {
  workspace: Workspace
  cards: Card[]
  due: Card[]
  busy: boolean
  commit: (workspace: Workspace) => Promise<boolean>
  onCapture: () => void
}

const grades: Grade[] = ['again', 'hard', 'remembered', 'easy']
const batchSize = 5

export default function Flashcards({ workspace, cards, due, busy, commit, onCapture }: Props) {
  const [kind, setKind] = useState('all')
  const [scope, setScope] = useState('due')
  const session = workspace.flashSession
  const byId = new Map(cards.map(card => [card.id, card]))
  const remaining = session?.cards.slice(session.cursor).flatMap(id => {
    const card = byId.get(id)
    return card ? [card] : []
  }) ?? []
  const current = remaining[0]

  if (session && current) {
    const position = session.cards.indexOf(current.id, session.cursor)
    return <FlipCard key={current.id} card={current} position={position + 1} total={session.cards.length} busy={busy}
      rate={grade => commit(gradeCard(workspace, current.id, position, grade, 'flashSession'))} />
  }

  const pool = (scope === 'due' ? due : cards).filter(card => kind === 'all' || card.kind === kind)
  return <section className={`${styles.panel} ${styles.review}`}>
    <div className={styles.flashHeading}><Icon name="stilla" /><h2>플래시카드</h2></div>
    {Boolean(session?.cards.length) && <p className={styles.flashDone} role="status">{session?.cursor}장 공부를 마쳤어요.</p>}
    {cards.length ? <>
      <div className={styles.flashOptions}>
        <label>공부할 범위<select value={scope} onChange={event => setScope(event.target.value)} disabled={busy}>
          <option value="due">지금 복습할 카드</option>
          <option value="all">저장된 모든 카드</option>
        </select></label>
        <label>카드 유형<select value={kind} onChange={event => setKind(event.target.value)} disabled={busy}>
          <option value="all">모든 유형</option>
          <option>뜻 떠올리기</option>
          <option>문장 해석</option>
          <option>빈칸 채우기</option>
        </select></label>
      </div>
      <p className={styles.muted} role="status">{pool.length ? `선택한 카드 ${pool.length}장 · 섞어서 출제해요` : '이 범위에 공부할 카드가 없어요.'}</p>
      <button className={styles.primary} disabled={busy || !pool.length} onClick={() => void commit({
        ...workspace, flashSession: { cards: shuffledCardIds(pool, batchSize), cursor: 0 },
      })}>{pool.length ? `${Math.min(pool.length, batchSize)}장 공부하기` : '공부 시작'} <Icon name="arrow" /></button>
    </> : <>
      <p>뜻이 있는 단어나 해석이 있는 문장을 담으면 카드가 생겨요.</p>
      <button className={styles.primary} onClick={onCapture}>단어장에 담기 <Icon name="arrow" /></button>
    </>}
  </section>
}

function FlipCard({ card, position, total, busy, rate }: {
  card: Card; position: number; total: number; busy: boolean; rate: (grade: Grade) => Promise<boolean>
}) {
  const [revealed, setRevealed] = useState(false)
  const surface = useRef<HTMLButtonElement>(null)
  useEffect(() => { surface.current?.focus({ preventScroll: true }) }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (busy || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return
      if (event.code === 'Space' && (target === surface.current || target === document.body)) {
        event.preventDefault()
        setRevealed(value => !value)
      }
      const grade = /^[1-4]$/.test(event.key) ? grades[Number(event.key) - 1] : undefined
      if (grade && revealed) {
        event.preventDefault()
        void rate(grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, rate, revealed])

  return <section className={styles.flashStudy} aria-label="플래시카드 공부">
    <div className={styles.sectionLine}><h2>{card.kind}</h2><span>{position} / {total}장</span></div>
    <progress value={position - 1} max={total} aria-label="플래시카드 진행" />
    <button ref={surface} type="button" className={styles.flashSurface} data-side={revealed ? 'back' : 'front'}
      aria-label={revealed ? '앞면으로 돌아가기' : '카드 뒤집기'} aria-describedby="stilla-flash-content" aria-keyshortcuts="Space"
      aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>
      <span className={styles.flashSide}>{revealed ? '뒷면' : '앞면'}</span>
      <span id="stilla-flash-content" className={styles.flashContent} aria-live="polite">
        <span className={revealed ? styles.flashPrompt : styles.flashText}>{card.prompt}</span>
        {revealed && <><strong className={styles.flashText}>{card.answer}</strong>{card.context && <span className={styles.muted}>{card.context}</span>}</>}
      </span>
      <span className={styles.muted}>{revealed ? '앞면 보기' : '누르거나 Space로 답 보기'}</span>
    </button>
    {revealed && <div className={styles.flashGrades} role="group" aria-label="기억한 정도">
      {grades.map((grade, index) => <button key={grade} type="button" aria-keyshortcuts={String(index + 1)} disabled={busy}
        className={grade === 'remembered' ? styles.primary : undefined} onClick={() => void rate(grade)}>
        <strong>{ratings[grade].label}</strong><span>{ratings[grade].interval}</span>
      </button>)}
    </div>}
    {revealed && <p className={styles.muted}>숫자 1–4로도 기록할 수 있어요.</p>}
  </section>
}
