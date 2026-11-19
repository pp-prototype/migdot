import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { firstLetter, firstLetterBack } from './clues'
import type { Progress, ProgressAction } from './progress'
import { drawPerson, drawScene, lockPile, sceneHeight, sceneWidth } from './scene'
import './autumn.css'

const fallingLeaves = Array.from({ length: 44 }, (_, i) => ({
  left: `${(i * 37) % 113 - 10}%`,
  '--leaf-size': `${6 + (i * 7) % 12}px`,
  '--leaf-alpha': .42 + (i % 6) * .1,
  animationDelay: `${-i * 1.23}s`,
  animationDuration: `${15 + i % 10}s`,
}))

function Person() {
  return <canvas width={180} height={340} aria-hidden="true" ref={element => {
    if (element) drawPerson(element)
  }} />
}

const firstLetterId = 'first-letter'
const leafPileLockId = 'leaf-pile-lock'

export default function AutumnLetter({ progress, save }: {
  progress: Progress
  save: (action: ProgressAction) => void
}) {
  const [letterBack, setLetterBack] = useState(false)
  const walking = progress.currentMap === 'second-trail'
  const [nextRequested, setNextRequested] = useState(false)
  const lockFound = progress.discoveries.includes(leafPileLockId)
  const firstLetterAcquired = progress.letters.acquired.includes(firstLetterId)
  const digits = progress.puzzles.leafPileLock
  const [lockView, setLockView] = useState<'chest' | 'dial' | null>(null)
  const [turnedDials, setTurnedDials] = useState<number[]>([])
  const firstDial = useRef<HTMLButtonElement>(null)
  const lockDialog = useRef<HTMLDialogElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const canopy = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current && canopy.current) drawScene(canvas.current, canopy.current, walking)
  }, [walking])

  function openLetter() {
    save({ type: 'read-letter', id: firstLetterId, side: 'front' })
    setLetterBack(false)
    dialog.current?.showModal()
  }

  useEffect(() => {
    if (!lockView) return
    lockDialog.current?.showModal()
    if (lockView === 'dial') firstDial.current?.focus()
  }, [lockView])

  function openLock() {
    save({ type: 'discover', id: leafPileLockId })
    setTurnedDials([])
    setLockView('dial')
  }

  function rotateDial(index: number) {
    setTurnedDials(current => current.includes(index) ? current : [...current, index])
    save({ type: 'rotate-lock-dial', index })
  }

  function startWalking() {
    dialog.current?.close()
    save({ type: 'visit-map', id: 'second-trail' })
  }

  return <main className="autumn">
    <div className="autumn-stage">
      <section className={`autumn-scene ${walking ? 'autumn-scene-walking' : ''}`}
        aria-label={walking ? '함께 걷는 가을 산책로' : '가을 산책로'}>
        <canvas ref={canvas} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape" aria-hidden="true" />
        {walking && <div className="autumn-clouds" aria-hidden="true">
          <i /><i /><i />
        </div>}
        <canvas ref={canopy} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape autumn-canopy" aria-hidden="true" />
        <div className="autumn-falling" aria-hidden="true">
          {fallingLeaves.map((style, i) => <i key={i} style={style as CSSProperties} />)}
        </div>
        {!walking && <button className="autumn-object autumn-person" aria-label="인물에게 편지 받기"
          onClick={openLetter}><Person /></button>}
        {walking && <button type="button" className="autumn-lock-pile"
          style={{ left: `${lockPile.x / sceneWidth * 100}%`, top: `${lockPile.y / sceneHeight * 100}%` }}
          aria-label="낙엽 더미 살펴보기" onClick={() => setLockView('chest')} />}
      </section>
      {walking && <>
        <div className="autumn-walk-fade" aria-hidden="true" />
        <div className="autumn-walk-items">
          {firstLetterAcquired && <button className="autumn-walk-control" type="button" aria-label="첫 편지 다시 읽기" onClick={openLetter}>
            <span className="autumn-envelope" aria-hidden="true" />
          </button>}
          {lockFound && <button className="autumn-walk-control" type="button" aria-label="자물쇠 다시 열기" onClick={openLock}>
            <span className="autumn-lock-icon" aria-hidden="true" />
          </button>}
        </div>
        <div className="autumn-next">
          <p role="status" className={nextRequested ? '' : 'autumn-visually-hidden'}>
            {nextRequested ? '다음 산책길은 준비 중이야.' : '함께 가을 산책을 시작했어.'}
          </p>
          <button className="autumn-walk-control" type="button" aria-label="다음 산책길" onClick={() => setNextRequested(true)}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
      </>}
    </div>

    <dialog ref={dialog} className={`autumn-dialog ${walking ? '' : 'autumn-dialog-delivery'}`} aria-labelledby="autumn-letter-title">
      {!walking && <div className="autumn-delivery-person" aria-hidden="true"><Person /></div>}
      <div className="autumn-paper">
        <button className="autumn-close" aria-label="편지 닫기" onClick={() => dialog.current?.close()}>×</button>
        <article className="autumn-box-letter" aria-live="polite">
          <h2 id="autumn-letter-title">첫 편지</h2>
          <p className="autumn-letter-face" key={String(letterBack)}>{letterBack ? firstLetterBack : firstLetter}</p>
        </article>
        {!walking && <button className="autumn-return" onClick={startWalking}>영상이랑 걷기</button>}
        {walking && <button className="autumn-page-corner" type="button" onClick={() => {
          if (!letterBack) save({ type: 'read-letter', id: firstLetterId, side: 'back' })
          setLetterBack(!letterBack)
        }}
          aria-label={letterBack ? '편지 앞면 보기' : '편지 뒷면 보기'} />}
      </div>
    </dialog>

    <dialog ref={lockDialog}
      className={`autumn-dialog autumn-lock-dialog ${lockView === 'chest' ? 'autumn-chest-dialog' : ''}`}
      aria-label={lockView === 'chest' ? '낙엽 아래 숨겨진 상자' : '네 자리 다이얼 자물쇠'}
      onClose={() => setLockView(null)}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
      {lockView === 'chest' && <div className="autumn-chest">
        <div className="autumn-chest-lid" aria-hidden="true" />
        <div className="autumn-chest-front" aria-hidden="true" />
        <button className="autumn-chest-lock" type="button" aria-label="상자에 걸린 자물쇠 살펴보기" onClick={openLock}>
          <span className="autumn-chest-shackle" aria-hidden="true" />
          <span className="autumn-chest-padlock" aria-hidden="true"><i /><i /><i /><i /></span>
        </button>
      </div>}
      {lockView === 'dial' && <div className="autumn-lock">
        <div className="autumn-lock-shackle" aria-hidden="true" />
        <div className="autumn-lock-body">
          <div className="autumn-lock-wheels">
            {digits.map((digit, index) => <button key={index} type="button" className="autumn-lock-wheel"
              ref={index === 0 ? firstDial : undefined}
              aria-label={`${index + 1}번째 다이얼, 현재 ${digit}`} onClick={() => rotateDial(index)}>
              <span className={`autumn-lock-drum ${turnedDials.includes(index) ? 'autumn-lock-drum-turning' : ''}`}
                aria-hidden="true" key={digit}>
                {[-2, -1, 0, 1].map(offset => <span key={offset}>{(digit + 10 + offset) % 10}</span>)}
              </span>
            </button>)}
          </div>
        </div>
      </div>}
    </dialog>
  </main>
}
