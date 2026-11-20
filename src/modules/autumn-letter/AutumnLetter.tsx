import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { firstLetter, firstLetterBack, fourthLetter, fourthLetterHint, skyPhotoId, thirdLetter } from './clues'
import type { Progress, ProgressAction } from './progress'
import AutumnSettings from './AutumnSettings'
import { dogTrailLetter, dogTrailTrees, drawScene, lakesideBlinkingLamp, lakesideCloseupLamp, lakesideForegroundTrees, lakesideLetter, lakesideSilhouette, lockPile, sceneHeight, sceneWidth } from './scene'
import AutumnDogWalk from './AutumnDogWalk'
import AutumnPhone from './AutumnPhone'
import Person from './Person'
import { useSoundEffect } from './useSoundEffect'
import dialSound from './audio/bgm-dial-lock.mp3'
import walkSound from './audio/bgm_walk-on-leaves.mp3'
import './autumn.css'

const fallingLeaves = (windy: boolean, lakeside: boolean, dogTrail: boolean) => Array.from({ length: dogTrail ? 84 : lakeside ? 13 : windy ? 78 : 44 }, (_, i) => {
  const tree = lakesideForegroundTrees[i % 2 === 0 ? 1 : 0]
  const [dogTreeX, dogTreeY, dogTreeSize] = dogTrailTrees[4 + i % 6]
  const sourceX = dogTrail ? dogTreeX : tree.x
  const sourceY = dogTrail ? dogTreeY : tree.y
  const size = dogTrail ? dogTreeSize : tree.size
  const direction = sourceX > sceneWidth / 2 ? -1 : 1
  const leafX = sourceX + direction * (dogTrail ? (18 + i * 17 % 32) * size : 28 + i * 13 % 65)
  const leafY = sourceY - size * (dogTrail ? 82 + i * 7 % 27 : 98 + i * 7 % 16)
  return {
    left: `${dogTrail || lakeside ? leafX / sceneWidth * 100 : (i * 37) % 113 - 10}%`,
    '--leaf-size': `${6 + (i * 7) % 12}px`,
    '--leaf-alpha': .42 + (i % 6) * .1,
    '--leaf-origin': `${leafY / sceneHeight * 100}%`,
    '--leaf-direction': direction,
    animationDelay: `${-i * (dogTrail ? .61 : windy ? .39 : 1.23)}s`,
    animationDuration: `${dogTrail ? 12 + i % 10 : lakeside ? 21 + i % 8 : windy ? 4.8 + i % 8 * .58 : 15 + i % 10}s`,
  }
})

const lampPattern = [1, 1, 0, 1, 1, 1, 0, 1, 2, 0, 1, 1]
const lampPulses = lampPattern.flatMap((count, second) =>
  Array.from({ length: count }, (_, pulse) => second + .12 + pulse * .42))

const firstLetterId = 'first-letter'
const thirdLetterId = 'third-letter'
const fourthLetterId = 'fourth-letter'
const letters = {
  [firstLetterId]: { title: '첫 편지', text: firstLetter },
  [thirdLetterId]: { title: '세 번째 편지', text: thirdLetter },
  [fourthLetterId]: { title: '네 번째 편지', text: fourthLetter },
}
const letterOrder = [firstLetterId, thirdLetterId, fourthLetterId] as const
type LetterId = keyof typeof letters
const leafPileLockId = 'leaf-pile-lock'
const phoneId = 'trail-phone'

export default function AutumnLetter({ progress, save }: {
  progress: Progress
  save: (action: ProgressAction) => void
}) {
  const [activeLetter, setActiveLetter] = useState<LetterId>(firstLetterId)
  const showingFirst = activeLetter === firstLetterId
  const [letterBack, setLetterBack] = useState(false)
  const map = progress.currentMap
  const walking = map !== 'first-trail'
  const forest = map === 'third-trail'
  const closeup = map === 'lakeside-bench'
  const silhouetteVisible = closeup && progress.discoveries.includes(skyPhotoId)
  const dogTrail = map === 'fifth-trail'
  const lakeside = map === 'fourth-trail' || closeup
  const lakeLamp = closeup ? lakesideCloseupLamp : lakesideBlinkingLamp
  const phoneFound = progress.discoveries.includes(phoneId)
  const { audioRef: footstepsAudio, play: playFootsteps } = useSoundEffect(2000)
  const { audioRef: dialAudio, play: playDial } = useSoundEffect(1000)
  const phoneDialog = useRef<HTMLDialogElement>(null)
  const lockFound = progress.discoveries.includes(leafPileLockId)
  const firstLetterAcquired = progress.letters.acquired.includes(firstLetterId)
  const thirdLetterAcquired = progress.letters.acquired.includes(thirdLetterId)
  const collectedLetters = letterOrder.filter(id => progress.letters.acquired.includes(id))
  const currentLetterIndex = collectedLetters.indexOf(activeLetter)
  const previousLetter = collectedLetters[currentLetterIndex - 1]
  const nextLetter = collectedLetters[currentLetterIndex + 1]
  const canBrowseLetters = collectedLetters.length > 1
  const digits = progress.puzzles.leafPileLock
  const [lockView, setLockView] = useState<'chest' | 'dial' | null>(null)
  const [turnedDials, setTurnedDials] = useState<number[]>([])
  const firstDial = useRef<HTMLButtonElement>(null)
  const lockDialog = useRef<HTMLDialogElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const lakesideDialogue = useRef<HTMLDialogElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const canopy = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current && canopy.current) drawScene(canvas.current, canopy.current, map)
  }, [map])

  function selectLetter(id: LetterId) {
    save({ type: 'read-letter', id, side: 'front' })
    setActiveLetter(id)
    setLetterBack(false)
  }

  function openLetter(id: LetterId) {
    selectLetter(id)
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

  function approachBench() {
    playFootsteps()
    save({ type: 'visit-map', id: 'lakeside-bench' })
  }

  function takeHand() {
    lakesideDialogue.current?.close()
    playFootsteps()
    save({ type: 'visit-map', id: 'fifth-trail' })
  }

  return <main className="autumn">
    <audio ref={footstepsAudio} src={walkSound} preload="auto" />
    <audio ref={dialAudio} src={dialSound} preload="auto" />
    <div className="autumn-stage">
      <section className={`autumn-scene ${dogTrail ? 'autumn-scene-dog-trail' : closeup ? 'autumn-scene-lake-closeup' : lakeside ? 'autumn-scene-lakeside' : forest ? 'autumn-scene-forest' : walking ? 'autumn-scene-walking' : ''}`}
        aria-label={dogTrail ? '강아지 둘과 걷는 다섯 번째 산책로' : closeup ? '호숫가 벤치와 가로등' : lakeside ? '별이 뜬 네 번째 산책로' : forest ? '바람 부는 세 번째 산책로' : walking ? '함께 걷는 가을 산책로' : '가을 산책로'}>
        <canvas ref={canvas} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape" aria-hidden="true" />
        {walking && !lakeside && !dogTrail && <div className="autumn-clouds" aria-hidden="true">
          {Array.from({ length: forest ? 9 : 3 }, (_, index) => <i key={index}
            style={forest ? {
              top: `${index * 7 % 35 - 6}%`,
              width: `${28 + index % 3 * 9}%`,
              animationDuration: `${36 + index % 4 * 7}s`,
              animationDelay: `${-(12 + index * 6)}s`,
              '--cloud-position': `${index * 37 % 113 - 12}%`,
            } as CSSProperties : undefined} />)}
        </div>}
        {closeup && <div className="autumn-lake-waves" aria-hidden="true">
          {Array.from({length: 30}, (_, index) => <i key={index} style={{
            left: `${index * 37 % 103 - 5}%`,
            top: `${index * 23 % 95}%`,
            width: `${3 + index * 5 % 9}%`,
            animationDelay: `${-index * .53}s`,
            animationDuration: `${4 + index % 5}s`,
          }} />)}
        </div>}
        <canvas ref={canopy} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape autumn-canopy" aria-hidden="true" />
        {lakeside && <div className="autumn-lake-lamp" aria-hidden="true"
          style={{
            left: `${lakeLamp.x / sceneWidth * 100}%`,
            top: `${lakeLamp.y / sceneHeight * 100}%`,
          }}>
          {lampPulses.map(delay => <i key={delay} style={{
            animationDelay: `${delay}s`,
            animationDuration: `${lampPattern.length}s`,
          }} />)}
        </div>}
        {silhouetteVisible && <button type="button" className="autumn-lake-silhouette"
          aria-label="가로등 아래 남자와 대화하기" aria-haspopup="dialog"
          onClick={() => lakesideDialogue.current?.showModal()}
          style={{
            left: `${lakesideSilhouette.x / sceneWidth * 100}%`,
            top: `${lakesideSilhouette.y / sceneHeight * 100}%`,
          }}><Person /></button>}
        {!closeup && <div className="autumn-falling" aria-hidden="true">
          {fallingLeaves(forest, lakeside, dogTrail).map((style, i) => <i key={i} style={style as CSSProperties} />)}
        </div>}
        {closeup && <button className="autumn-scene-letter" type="button" aria-label="벤치 위 편지 읽기"
          style={{ left: `${lakesideLetter.x / sceneWidth * 100}%`, top: `${lakesideLetter.y / sceneHeight * 100}%` }}
          onClick={() => openLetter(thirdLetterId)} />}
        {map === 'fourth-trail' && <button className="autumn-bench-approach" type="button"
          aria-label="가로등과 벤치 쪽으로 다가가기" onClick={approachBench} />}
        {!walking && <button className="autumn-object autumn-person" aria-label="인물에게 편지 받기"
          onClick={() => openLetter(firstLetterId)}><Person /></button>}
        {map === 'second-trail' && <button type="button" className="autumn-lock-pile"
          style={{ left: `${lockPile.x / sceneWidth * 100}%`, top: `${lockPile.y / sceneHeight * 100}%` }}
          aria-label="낙엽 더미 살펴보기" onClick={() => setLockView('chest')} />}
        {forest && <button className="autumn-phone-ground" type="button" aria-label="길가의 스마트폰 살펴보기" onClick={openPhone}>
          <span className="autumn-phone-icon" aria-hidden="true" />
        </button>}
        {dogTrail && <>
          <AutumnDogWalk />
          <button className="autumn-scene-letter" type="button" aria-label="나무에 놓인 편지 읽기"
            style={{ left: `${dogTrailLetter.x / sceneWidth * 100}%`, top: `${dogTrailLetter.y / sceneHeight * 100}%` }}
            onClick={() => openLetter(fourthLetterId)} />
        </>}
      </section>
      {walking && <>
        <div key={map} className="autumn-walk-fade" aria-hidden="true" />
        <div className="autumn-walk-items">
          {firstLetterAcquired && <button className="autumn-walk-control" type="button" aria-label={canBrowseLetters ? '보관한 편지 읽기' : '첫 편지 다시 읽기'}
            onClick={() => openLetter(firstLetterId)}>
            <span className="autumn-envelope" aria-hidden="true" />
          </button>}
          {lockFound && <button className="autumn-walk-control" type="button" aria-label="자물쇠 다시 열기" onClick={openLock}>
            <span className="autumn-lock-icon" aria-hidden="true" />
          </button>}
          {phoneFound && <button className="autumn-walk-control" type="button"
            aria-label={thirdLetterAcquired ? '스마트폰 다시 보기, 새 알림' : '스마트폰 다시 보기'} onClick={openPhone}>
            <span className="autumn-phone-icon" aria-hidden="true">
              {thirdLetterAcquired && <i className="autumn-phone-notification" />}
            </span>
          </button>}
        </div>
        <div className="autumn-next">
          {(forest || lakeside || dogTrail) && <button className="autumn-walk-control autumn-walk-back" type="button"
            aria-label={dogTrail ? '호숫가 벤치로 돌아가기' : closeup ? '호수공원 입구로 돌아가기' : lakeside ? '세 번째 산책로로 돌아가기' : '두 번째 산책로로 돌아가기'}
            onClick={() => {
              playFootsteps()
              save({ type: 'visit-map', id: dogTrail ? 'lakeside-bench' : closeup ? 'fourth-trail' : lakeside ? 'third-trail' : 'second-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
          {!closeup && !dogTrail && <button className="autumn-walk-control" type="button" aria-label="다음 산책길"
            onClick={lakeside ? approachBench : () => {
              playFootsteps()
              save({ type: 'visit-map', id: forest ? 'fourth-trail' : 'third-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
        </div>
        <span className="autumn-visually-hidden" role="status">
          {dogTrail ? '두 강아지와 함께 밤길을 걷기 시작했어.' : closeup ? '호숫가 벤치에 도착했어.' : lakeside ? '별이 뜬 호수공원에 도착했어.' : forest ? '바람 부는 세 번째 산책로에 도착했어.' : '함께 가을 산책을 시작했어.'}
        </span>
      </>}
    </div>

    <AutumnSettings />
    {silhouetteVisible && <dialog ref={lakesideDialogue}
      className="autumn-dialog autumn-dialog-delivery" aria-labelledby="autumn-lakeside-dialogue">
      <div className="autumn-delivery-person" aria-hidden="true"><Person /></div>
      <div className="autumn-paper autumn-conversation">
        <button className="autumn-close" type="button" aria-label="대화 닫기"
          onClick={() => lakesideDialogue.current?.close()}>×</button>
        <p id="autumn-lakeside-dialogue">별을 가득 담을 수 있는 방법을 찾았구나? 어때? ㅋㅋㅋ</p>
        <button type="button" className="autumn-return" onClick={takeHand}>손을 잡는다</button>
      </div>
    </dialog>}
    <dialog ref={dialog} className={`autumn-dialog ${walking ? '' : 'autumn-dialog-delivery'}`} aria-labelledby="autumn-letter-title">
      {!walking && <div className="autumn-delivery-person" aria-hidden="true"><Person /></div>}
      <div className={`autumn-paper ${canBrowseLetters ? 'autumn-paper-with-nav' : ''}`}>
        <button className="autumn-close" aria-label="편지 닫기" onClick={() => dialog.current?.close()}>×</button>
        <article className="autumn-box-letter" aria-live="polite">
          <h2 id="autumn-letter-title">{letters[activeLetter].title}</h2>
          <p className="autumn-letter-face" key={`${activeLetter}-${letterBack}`}>
            {showingFirst && letterBack ? firstLetterBack : letters[activeLetter].text}
          </p>
          {activeLetter === fourthLetterId && <p className="autumn-letter-hint">{fourthLetterHint}</p>}
        </article>
        {!walking && <button className="autumn-return" onClick={startWalking}>영상이랑 걷기</button>}
        {canBrowseLetters && <>
          <button className="autumn-letter-nav autumn-letter-prev" type="button"
            aria-label={previousLetter ? `${letters[previousLetter].title} 보기` : '이전 편지'}
            disabled={!previousLetter} onClick={() => previousLetter && selectLetter(previousLetter)}>‹</button>
          <button className="autumn-letter-nav autumn-letter-next" type="button"
            aria-label={nextLetter ? `${letters[nextLetter].title} 보기` : '다음 편지'}
            disabled={!nextLetter} onClick={() => nextLetter && selectLetter(nextLetter)}>›</button>
        </>}
        {walking && showingFirst && <button className="autumn-page-corner" type="button" onClick={() => {
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
    <AutumnPhone dialog={phoneDialog} save={save} cameraAvailable={thirdLetterAcquired} cameraActive={closeup} discoveries={progress.discoveries} />
  </main>
}
