import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { firstLetter, firstLetterBack } from './clues'
import type { Progress, ProgressAction } from './progress'
import { drawScene, lakesideBlinkingLamp, lakesideForegroundTrees, lockPile, sceneHeight, sceneWidth } from './scene'
import AutumnPhone from './AutumnPhone'
import Person from './Person'
import { useSoundEffect } from './useSoundEffect'
import dialSound from './audio/bgm-dial-lock.mp3'
import walkSound from './audio/bgm_walk-on-leaves.mp3'
import './autumn.css'

const fallingLeaves = (windy: boolean, lakeside: boolean) => Array.from({ length: lakeside ? 13 : windy ? 78 : 44 }, (_, i) => {
  const tree = lakesideForegroundTrees[i % 2 === 0 ? 1 : 0]
  const direction = tree.ginkgo ? -1 : 1
  const leafX = tree.x + direction * (28 + i * 13 % 65)
  const leafY = tree.y - tree.size * (98 + i * 7 % 16)
  return {
    left: `${lakeside ? leafX / sceneWidth * 100 : (i * 37) % 113 - 10}%`,
    '--leaf-size': `${6 + (i * 7) % 12}px`,
    '--leaf-alpha': .42 + (i % 6) * .1,
    '--leaf-origin': `${leafY / sceneHeight * 100}%`,
    '--leaf-direction': direction,
    animationDelay: `${-i * (windy ? .39 : 1.23)}s`,
    animationDuration: `${lakeside ? 21 + i % 8 : windy ? 4.8 + i % 8 * .58 : 15 + i % 10}s`,
  }
})

const lampPattern = [1, 1, 0, 1, 1, 1, 0, 1, 2, 0, 1, 1]
const lampPulses = lampPattern.flatMap((count, second) =>
  Array.from({ length: count }, (_, pulse) => second + .12 + pulse * .42))

const firstLetterId = 'first-letter'
const leafPileLockId = 'leaf-pile-lock'
const phoneId = 'trail-phone'

export default function AutumnLetter({ progress, save }: {
  progress: Progress
  save: (action: ProgressAction) => void
}) {
  const [letterBack, setLetterBack] = useState(false)
  const map = progress.currentMap
  const walking = map !== 'first-trail'
  const forest = map === 'third-trail'
  const lakeside = map === 'fourth-trail'
  const phoneFound = progress.discoveries.includes(phoneId)
  const { audioRef: footstepsAudio, play: playFootsteps } = useSoundEffect(2000)
  const { audioRef: dialAudio, play: playDial } = useSoundEffect(1000)
  const phoneDialog = useRef<HTMLDialogElement>(null)
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
    if (canvas.current && canopy.current) drawScene(canvas.current, canopy.current, map)
  }, [map])

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

  function openPhone() {
    save({ type: 'discover', id: phoneId })
    phoneDialog.current?.showModal()
  }

  function rotateDial(index: number) {
    playDial()
    setTurnedDials(current => current.includes(index) ? current : [...current, index])
    save({ type: 'rotate-lock-dial', index })
  }

  function startWalking() {
    dialog.current?.close()
    save({ type: 'visit-map', id: 'second-trail' })
  }

  return <main className="autumn">
    <audio ref={footstepsAudio} src={walkSound} preload="auto" />
    <audio ref={dialAudio} src={dialSound} preload="auto" />
    <div className="autumn-stage">
      <section className={`autumn-scene ${lakeside ? 'autumn-scene-lakeside' : forest ? 'autumn-scene-forest' : walking ? 'autumn-scene-walking' : ''}`}
        aria-label={lakeside ? '별이 뜬 네 번째 산책로' : forest ? '바람 부는 세 번째 산책로' : walking ? '함께 걷는 가을 산책로' : '가을 산책로'}>
        <canvas ref={canvas} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape" aria-hidden="true" />
        {walking && !lakeside && <div className="autumn-clouds" aria-hidden="true">
          {Array.from({ length: forest ? 9 : 3 }, (_, index) => <i key={index}
            style={forest ? {
              top: `${index * 7 % 35 - 6}%`,
              width: `${28 + index % 3 * 9}%`,
              animationDuration: `${36 + index % 4 * 7}s`,
              animationDelay: `${-(12 + index * 6)}s`,
              '--cloud-position': `${index * 37 % 113 - 12}%`,
            } as CSSProperties : undefined} />)}
        </div>}
        <canvas ref={canopy} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape autumn-canopy" aria-hidden="true" />
        {lakeside && <div className="autumn-lake-lamp" aria-hidden="true"
          style={{
            left: `${lakesideBlinkingLamp.x / sceneWidth * 100}%`,
            top: `${lakesideBlinkingLamp.y / sceneHeight * 100}%`,
          }}>
          {lampPulses.map(delay => <i key={delay} style={{
            animationDelay: `${delay}s`,
            animationDuration: `${lampPattern.length}s`,
          }} />)}
        </div>}
        <div className="autumn-falling" aria-hidden="true">
          {fallingLeaves(forest, lakeside).map((style, i) => <i key={i} style={style as CSSProperties} />)}
        </div>
        {!walking && <button className="autumn-object autumn-person" aria-label="인물에게 편지 받기"
          onClick={openLetter}><Person /></button>}
        {map === 'second-trail' && <button type="button" className="autumn-lock-pile"
          style={{ left: `${lockPile.x / sceneWidth * 100}%`, top: `${lockPile.y / sceneHeight * 100}%` }}
          aria-label="낙엽 더미 살펴보기" onClick={() => setLockView('chest')} />}
        {forest && <button className="autumn-phone-ground" type="button" aria-label="길가의 스마트폰 살펴보기" onClick={openPhone}>
          <span className="autumn-phone-icon" aria-hidden="true" />
        </button>}
      </section>
      {walking && <>
        <div key={map} className="autumn-walk-fade" aria-hidden="true" />
        <div className="autumn-walk-items">
          {firstLetterAcquired && <button className="autumn-walk-control" type="button" aria-label="첫 편지 다시 읽기" onClick={openLetter}>
            <span className="autumn-envelope" aria-hidden="true" />
          </button>}
          {lockFound && <button className="autumn-walk-control" type="button" aria-label="자물쇠 다시 열기" onClick={openLock}>
            <span className="autumn-lock-icon" aria-hidden="true" />
          </button>}
          {phoneFound && <button className="autumn-walk-control" type="button" aria-label="스마트폰 다시 보기" onClick={openPhone}>
            <span className="autumn-phone-icon" aria-hidden="true" />
          </button>}
        </div>
        <div className="autumn-next">
          {(forest || lakeside) && <button className="autumn-walk-control autumn-walk-back" type="button"
            aria-label={lakeside ? '세 번째 산책로로 돌아가기' : '두 번째 산책로로 돌아가기'}
            onClick={() => {
              playFootsteps()
              save({ type: 'visit-map', id: lakeside ? 'third-trail' : 'second-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
          <button className="autumn-walk-control" type="button" aria-label="다음 산책길"
            onClick={() => {
              playFootsteps()
              if (!lakeside) save({ type: 'visit-map', id: forest ? 'fourth-trail' : 'third-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
        <span className="autumn-visually-hidden" role="status">
          {lakeside ? '별이 뜬 호수공원에 도착했어.' : forest ? '바람 부는 세 번째 산책로에 도착했어.' : '함께 가을 산책을 시작했어.'}
        </span>
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
    <AutumnPhone dialog={phoneDialog} save={save} />
  </main>
}
