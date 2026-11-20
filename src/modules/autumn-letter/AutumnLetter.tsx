import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { finalLetter, firstLetter, firstLetterBack, fourthLetter, fourthLetterHint, skyPhotoId, thirdLetter } from './clues'
import { cinemaPosters } from './cinemaHall'
import { cinemaExit } from './cinemaRoom'
import { cinemaElevator, cinemaFlyer } from './cinemaScene'
import cinemaFlyerArt from './cinema-flyer.jpg'
import endingPortraits from './ending-poses.jpg'
import { cinemaFlyerId, isLeafPileUnlocked } from './progress'
import type { Progress, ProgressAction } from './progress'
import AutumnFlyer from './AutumnFlyer'
import AutumnChestContents from './AutumnChestContents'
import AutumnEnding from './AutumnEnding'
import AutumnCinemaCredits from './AutumnCinemaCredits'
import AutumnSettings from './AutumnSettings'
import { dogTrailLetter, dogTrailTrees, drawScene, lakesideBlinkingLamp, lakesideCloseupLamp, lakesideForegroundTrees, lakesideLetter, lakesideSilhouette, lockPile, sceneHeight, sceneWidth } from './scene'
import AutumnDogWalk from './AutumnDogWalk'
import AutumnPhone from './AutumnPhone'
import Person from './Person'
import { useSoundEffect } from './useSoundEffect'
import dialSound from './audio/bgm-dial-lock.mp3'
import walkSound from './audio/bgm_walk-on-leaves.mp3'
import cinemaDoorSound from './audio/bgm_cinema-door.mp3'
import unlockSound from './audio/bgm_unlock.mp3'
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
const finalLetterId = 'final-letter'
const letters = {
  [firstLetterId]: { title: '첫 편지', text: firstLetter },
  [thirdLetterId]: { title: '세 번째 편지', text: thirdLetter },
  [fourthLetterId]: { title: '네 번째 편지', text: fourthLetter },
  [finalLetterId]: { title: '클리어 성공!', text: finalLetter },
}
const letterOrder = [firstLetterId, thirdLetterId, fourthLetterId, finalLetterId] as const
type LetterId = keyof typeof letters
const leafPileLockId = 'leaf-pile-lock'
const chestKeyId = 'leaf-pile-chest-key'
const coupleRingsId = 'leaf-pile-couple-rings'
const endingId = 'cinema-ending'
const endingDuration = 10800
const phoneId = 'trail-phone'

export default function AutumnLetter({ progress, save }: {
  progress: Progress
  save: (action: ProgressAction) => Progress
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
  const cinema = map === 'sixth-trail'
  const cinemaHall = map === 'cinema-hall'
  const cinemaRoom = map === 'cinema-room'
  const atCinema = cinema || cinemaHall || cinemaRoom
  const lakeside = map === 'fourth-trail' || closeup
  const lakeLamp = closeup ? lakesideCloseupLamp : lakesideBlinkingLamp
  const phoneFound = progress.discoveries.includes(phoneId)
  const { audioRef: footstepsAudio, play: playFootsteps } = useSoundEffect(2000)
  const { audioRef: dialAudio, play: playDial } = useSoundEffect(1000)
  const { audioRef: unlockAudio, play: playUnlock } = useSoundEffect(1800)
  const { audioRef: cinemaDoorAudio, play: playCinemaDoor } = useSoundEffect(4020)
  const phoneDialog = useRef<HTMLDialogElement>(null)
  const lockFound = progress.discoveries.includes(leafPileLockId)
  const firstLetterAcquired = progress.letters.acquired.includes(firstLetterId)
  const thirdLetterAcquired = progress.letters.acquired.includes(thirdLetterId)
  const fourthLetterAcquired = progress.letters.acquired.includes(fourthLetterId)
  const finalLetterAcquired = progress.letters.acquired.includes(finalLetterId)
  const collectedLetters = letterOrder.filter(id => progress.letters.acquired.includes(id))
  const storedLetter = collectedLetters[0]
  const flyerAcquired = progress.discoveries.includes(cinemaFlyerId)
  const keyAcquired = progress.discoveries.includes(chestKeyId)
  const ending = progress.discoveries.includes(endingId)
  const [endingPlaying, setEndingPlaying] = useState(false)
  const ringsAcquired = progress.discoveries.includes(coupleRingsId)
  const showScenePickup = cinema ? !flyerAcquired : closeup ? !thirdLetterAcquired : dogTrail && !fourthLetterAcquired
  const currentLetterIndex = collectedLetters.indexOf(activeLetter)
  const previousLetter = collectedLetters[currentLetterIndex - 1]
  const nextLetter = collectedLetters[currentLetterIndex + 1]
  const canBrowseLetters = collectedLetters.length > 1
  const digits = progress.puzzles.leafPileLock
  const chestUnlocked = isLeafPileUnlocked(digits)
  const [lockView, setLockView] = useState<'chest' | 'dial' | 'unlocking' | 'open' | null>(null)
  const showingChest = lockView === 'chest' || lockView === 'open' || (lockView === 'dial' && chestUnlocked)
  const showingOpenChest = showingChest && chestUnlocked
  const [turnedDials, setTurnedDials] = useState<number[]>([])
  const [cinemaEntry, setCinemaEntry] = useState<'door' | 'fade' | null>(null)
  const cinemaEntryTimer = useRef<number | undefined>(undefined)
  const firstDial = useRef<HTMLButtonElement>(null)
  const lockDialog = useRef<HTMLDialogElement>(null)
  const lockedExitDialog = useRef<HTMLDialogElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const flyerDialog = useRef<HTMLDialogElement>(null)
  const lakesideDialogue = useRef<HTMLDialogElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const canopy = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current && canopy.current) drawScene(canvas.current, canopy.current, map, showScenePickup)
  }, [map, showScenePickup])

  useEffect(() => {
    if (!cinemaRoom) return
    const portraits = new Image()
    portraits.src = endingPortraits
  }, [cinemaRoom])

  useEffect(() => {
    if (!endingPlaying) return
    const timer = window.setTimeout(() => setEndingPlaying(false), endingDuration)
    return () => window.clearTimeout(timer)
  }, [endingPlaying])

  useEffect(() => () => {
    if (cinemaEntryTimer.current === undefined) return
    window.clearTimeout(cinemaEntryTimer.current)
    cinemaEntryTimer.current = undefined
    setCinemaEntry(null)
  }, [map])

  function selectLetter(id: LetterId) {
    if (!collectedLetters.includes(id)) save({ type: 'read-letter', id, side: 'front' })
    setActiveLetter(id)
    setLetterBack(false)
  }

  function openLetter(id: LetterId) {
    selectLetter(id)
    dialog.current?.showModal()
  }

  function flipLetter() {
    if (!letterBack && !progress.letters.backsRead.includes(activeLetter)) {
      save({ type: 'read-letter', id: activeLetter, side: 'back' })
    }
    setLetterBack(!letterBack)
  }

  function openFlyer() {
    if (!flyerAcquired) save({ type: 'discover', id: cinemaFlyerId })
    flyerDialog.current?.showModal()
  }

  useEffect(() => {
    if (!lockView) return
    lockDialog.current?.showModal()
    if (lockView === 'dial') firstDial.current?.focus()
    if (lockView === 'unlocking') {
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650
      const timer = window.setTimeout(() => setLockView('open'), duration)
      return () => window.clearTimeout(timer)
    }
  }, [lockView])

  function openLock() {
    setTurnedDials([])
    setLockView(chestUnlocked ? 'open' : 'dial')
  }

  function openPhone() {
    if (!phoneFound) save({ type: 'discover', id: phoneId })
    phoneDialog.current?.showModal()
  }

  function rotateDial(index: number) {
    if (chestUnlocked || lockView !== 'dial') return
    setTurnedDials(current => current.includes(index) ? current : [...current, index])
    const next = save({ type: 'rotate-lock-dial', index })
    if (isLeafPileUnlocked(next.puzzles.leafPileLock)) {
      playUnlock()
      setLockView('unlocking')
    } else {
      playDial()
    }
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

  function enterCinemaRoom() {
    if (cinemaEntry) return
    setCinemaEntry('door')
    playCinemaDoor()
    cinemaEntryTimer.current = window.setTimeout(() => {
      playFootsteps()
      setCinemaEntry('fade')
      cinemaEntryTimer.current = window.setTimeout(() => {
        cinemaEntryTimer.current = undefined
        setCinemaEntry(null)
        save({ type: 'visit-map', id: 'cinema-room' })
      }, 850)
    }, 4020)
  }

  function useCinemaExit() {
    if (!keyAcquired) {
      lockedExitDialog.current?.showModal()
      return
    }
    playCinemaDoor()
    setEndingPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    save({ type: 'discover', id: endingId })
  }

  return <main className="autumn">
    <audio ref={footstepsAudio} src={walkSound} preload="auto" />
    <audio ref={dialAudio} src={dialSound} preload="auto" />
    <audio ref={unlockAudio} src={unlockSound} preload="auto" />
    <audio ref={cinemaDoorAudio} src={cinemaDoorSound} preload="auto" />
    <div className="autumn-stage" inert={ending}>
      <section className={`autumn-scene ${atCinema ? '' : dogTrail ? 'autumn-scene-dog-trail' : closeup ? 'autumn-scene-lake-closeup' : lakeside ? 'autumn-scene-lakeside' : forest ? 'autumn-scene-forest' : walking ? 'autumn-scene-walking' : ''}`}
        aria-label={cinemaRoom ? '2층 1관 상영관 내부' : cinemaHall ? '여섯 번째 산책로 안쪽, 영화관 2층 1관 앞' : cinema ? '작은 영화관이 있는 여섯 번째 산책로' : dogTrail ? '강아지 둘과 걷는 다섯 번째 산책로' : closeup ? '호숫가 벤치와 가로등' : lakeside ? '별이 뜬 네 번째 산책로' : forest ? '바람 부는 세 번째 산책로' : walking ? '함께 걷는 가을 산책로' : '가을 산책로'}
        aria-description={cinemaRoom ? '빨간 좌석 사이 계단이 스크린으로 이어지고 옆 출구가 주황빛으로 빛난다.' : cinemaHall ? '상영관 양문 옆에 좌석배치도와 포스터 세 장이 있다.' : cinema ? '주차장 앞 3층 영화관의 1층 유리 너머로 엘리베이터에 불이 켜져 있다. 가까운 큰 자동차 위에 영화표와 영화 전단지가 놓여 있다.' : undefined}>
        <canvas ref={canvas} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape" aria-hidden="true" />
        {walking && !lakeside && !dogTrail && !atCinema && <div className="autumn-clouds" aria-hidden="true">
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
        {!closeup && !atCinema && <div className="autumn-falling" aria-hidden="true">
          {fallingLeaves(forest, lakeside, dogTrail).map((style, i) => <i key={i} style={style as CSSProperties} />)}
        </div>}
        {closeup && showScenePickup && <button className="autumn-scene-letter" type="button" aria-label="벤치 위 편지 읽기"
          style={{ left: `${lakesideLetter.x / sceneWidth * 100}%`, top: `${lakesideLetter.y / sceneHeight * 100}%` }}
          onClick={() => openLetter(thirdLetterId)} />}
        {map === 'fourth-trail' && <button className="autumn-bench-approach" type="button"
          aria-label="가로등과 벤치 쪽으로 다가가기" onClick={approachBench} />}
        {!walking && <button className="autumn-object autumn-person" aria-label="인물에게 편지 받기" disabled={firstLetterAcquired}
          onClick={() => openLetter(firstLetterId)}><Person /></button>}
        {map === 'second-trail' && !lockFound && <button type="button" className="autumn-lock-pile"
          style={{ left: `${lockPile.x / sceneWidth * 100}%`, top: `${lockPile.y / sceneHeight * 100}%` }}
          aria-label="낙엽 더미 살펴보기" onClick={() => {
            save({ type: 'discover', id: leafPileLockId })
            setLockView('chest')
          }} />}
        {forest && !phoneFound && <button className="autumn-phone-ground" type="button" aria-label="길가의 스마트폰 살펴보기" onClick={openPhone}>
          <span className="autumn-phone-icon" aria-hidden="true" />
        </button>}
        {dogTrail && <>
          <AutumnDogWalk />
          {showScenePickup && <button className="autumn-scene-letter" type="button" aria-label="나무에 놓인 편지 읽기"
            style={{ left: `${dogTrailLetter.x / sceneWidth * 100}%`, top: `${dogTrailLetter.y / sceneHeight * 100}%` }}
            onClick={() => openLetter(fourthLetterId)} />}
        </>}
        {cinema && <>
          {showScenePickup && <button className="autumn-scene-letter" type="button"
            style={{ left: `${cinemaFlyer.x / sceneWidth * 100}%`, top: `${cinemaFlyer.y / sceneHeight * 100}%` }}
            aria-label="자동차 위 영화 전단지 읽기" onClick={openFlyer} />}
          <button className="autumn-scene-letter autumn-cinema-elevator" type="button"
            style={{ left: `${cinemaElevator.x / sceneWidth * 100}%`, top: `${cinemaElevator.y / sceneHeight * 100}%` }}
            aria-label="엘리베이터를 타고 2층 1관으로 가기"
            onClick={() => {
              playFootsteps()
              save({ type: 'visit-map', id: 'cinema-hall' })
            }} />
        </>}
        {cinemaHall && <ul className="autumn-visually-hidden" aria-label="영화 상영 정보">
          {cinemaPosters.map(({ title, date, auditorium }) => <li key={title}>{title} · {date} · {auditorium}</li>)}
        </ul>}
        {cinemaRoom && <>
          <AutumnCinemaCredits />
          <button className="autumn-cinema-exit" type="button" aria-label="상영관 출구 열기"
            style={{
              left: `${(cinemaExit.x + cinemaExit.width / 2) / sceneWidth * 100}%`,
              top: `${(cinemaExit.y + cinemaExit.height / 2) / sceneHeight * 100}%`,
              width: `${cinemaExit.width / sceneWidth * 100}%`,
              height: `${cinemaExit.height / sceneHeight * 100}%`,
            }} onClick={useCinemaExit} />
        </>}
      </section>
      {cinemaHall && flyerAcquired && <img className="autumn-held-flyer" src={cinemaFlyerArt} alt="" />}
      {walking && <div key={map} className={`autumn-walk-fade ${cinemaRoom ? 'autumn-cinema-arrival' : ''}`} aria-hidden="true" />}
      <div className="autumn-walk-inventory" inert={Boolean(cinemaHall && cinemaEntry)}>
        {ringsAcquired && <div className="autumn-walk-items" aria-label="수집 아이템" role="group">
          <span className="autumn-rings-item" role="img" aria-label="획득한 실버 커플링">
            <span className="autumn-chest-rings" aria-hidden="true"><i /><b /></span>
          </span>
        </div>}
        <div className="autumn-walk-items" aria-label="기본 아이템" role="group">
          {storedLetter && <button className="autumn-walk-control" type="button" aria-label={canBrowseLetters || !firstLetterAcquired ? '보관한 편지 읽기' : '첫 편지 다시 읽기'}
            onClick={() => openLetter(storedLetter)}>
            <span className="autumn-envelope" aria-hidden="true" />
          </button>}
          {phoneFound && <button className="autumn-walk-control" type="button"
            aria-label={thirdLetterAcquired ? '스마트폰 다시 보기, 새 알림' : '스마트폰 다시 보기'} onClick={openPhone}>
            <span className="autumn-phone-icon" aria-hidden="true">
              {thirdLetterAcquired && <i className="autumn-phone-notification" />}
            </span>
          </button>}
          {lockFound && <button className="autumn-walk-control" type="button"
            aria-label={chestUnlocked ? '열린 상자 보기' : '자물쇠 다시 열기'} onClick={openLock}>
            <span className={chestUnlocked ? 'autumn-chest-icon' : 'autumn-lock-icon'} aria-hidden="true" />
          </button>}
          {flyerAcquired && <button className="autumn-walk-control" type="button" aria-label="보관한 영화 전단지 보기"
            onClick={openFlyer}>
            <span className="autumn-flyer-icon" aria-hidden="true" />
          </button>}
          {keyAcquired && <span className="autumn-key-item" role="img" aria-label="획득한 쿼카 키링 열쇠">
            <span className="autumn-key-icon" aria-hidden="true" />
          </span>}
        </div>
      </div>
      {walking && <>
        <div className="autumn-next" inert={Boolean(cinemaHall && cinemaEntry)}>
          {(forest || lakeside || dogTrail || atCinema) && <button className="autumn-walk-control autumn-walk-back" type="button"
            aria-label={cinemaRoom ? '1관 복도로 돌아가기' : cinemaHall ? '영화관 주차장으로 돌아가기' : cinema ? '다섯 번째 산책로로 돌아가기' : dogTrail ? '호숫가 벤치로 돌아가기' : closeup ? '호수공원 입구로 돌아가기' : lakeside ? '세 번째 산책로로 돌아가기' : '두 번째 산책로로 돌아가기'}
            onClick={() => {
              playFootsteps()
              save({ type: 'visit-map', id: cinemaRoom ? 'cinema-hall' : cinemaHall ? 'sixth-trail' : cinema ? 'fifth-trail' : dogTrail ? 'lakeside-bench' : closeup ? 'fourth-trail' : lakeside ? 'third-trail' : 'second-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
          {cinemaHall && <button className="autumn-walk-control autumn-cinema-enter" type="button"
            aria-label="1관 안으로 들어가기" onClick={enterCinemaRoom}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
          {!closeup && !atCinema && <button className="autumn-walk-control" type="button" aria-label="다음 산책길"
            onClick={lakeside ? approachBench : () => {
              playFootsteps()
              save({ type: 'visit-map', id: dogTrail ? 'sixth-trail' : forest ? 'fourth-trail' : 'third-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
        </div>
        <span className="autumn-visually-hidden" role="status">
          {cinemaRoom ? '1관 안으로 들어왔어.' : cinemaHall ? '2층 1관 앞에 도착했어.' : cinema ? '작은 영화관 앞에 도착했어.' : dogTrail ? '두 강아지와 함께 밤길을 걷기 시작했어.' : closeup ? '호숫가 벤치에 도착했어.' : lakeside ? '별이 뜬 호수공원에 도착했어.' : forest ? '바람 부는 세 번째 산책로에 도착했어.' : '함께 가을 산책을 시작했어.'}
        </span>
      </>}
      {cinemaHall && cinemaEntry === 'fade' && <div className="autumn-cinema-fade-out" aria-hidden="true" />}
    </div>

    {ending && <AutumnEnding playing={endingPlaying} duration={endingDuration}
      onContinue={() => save({ type: 'restart' })} />}
    {!endingPlaying && <div inert={Boolean(cinemaHall && cinemaEntry)}><AutumnSettings /></div>}
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
          <p key={`${activeLetter}-${letterBack}`} className="autumn-letter-face">
            {showingFirst && letterBack ? firstLetterBack : letters[activeLetter].text}
          </p>
          {activeLetter === fourthLetterId && <p className="autumn-letter-hint">{fourthLetterHint}</p>}
        </article>
        {!walking && showingFirst && <button className="autumn-return" onClick={startWalking}>영상이랑 걷기</button>}
        {canBrowseLetters && <>
          <button className="autumn-letter-nav autumn-letter-prev" type="button"
            aria-label={previousLetter ? `${letters[previousLetter].title} 보기` : '이전 편지'}
            disabled={!previousLetter} onClick={() => previousLetter && selectLetter(previousLetter)}>‹</button>
          <button className="autumn-letter-nav autumn-letter-next" type="button"
            aria-label={nextLetter ? `${letters[nextLetter].title} 보기` : '다음 편지'}
            disabled={!nextLetter} onClick={() => nextLetter && selectLetter(nextLetter)}>›</button>
        </>}
        {walking && showingFirst && <button className="autumn-page-corner" type="button" onClick={flipLetter}
          aria-label={letterBack ? '편지 앞면 보기' : '편지 뒷면 보기'} />}
      </div>
    </dialog>

    <AutumnFlyer dialog={flyerDialog} />
    <dialog ref={lockDialog}
      className={`autumn-dialog autumn-lock-dialog ${showingChest ? 'autumn-chest-dialog' : ''}`}
      aria-label={showingOpenChest ? '열린 상자' : showingChest ? '낙엽 아래 숨겨진 상자' : '네 자리 다이얼 자물쇠'}
      onClose={() => setLockView(null)}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
      {showingChest && <div className={`autumn-chest ${showingOpenChest ? 'autumn-chest-open' : ''}`}>
        <div className="autumn-chest-lid" aria-hidden="true" />
        {showingOpenChest && <AutumnChestContents
          noteAcquired={finalLetterAcquired}
          onReadNote={() => openLetter(finalLetterId)}
          keyAcquired={keyAcquired}
          onTakeKey={() => save({ type: 'discover', id: chestKeyId })}
          ringsAcquired={ringsAcquired}
          onTakeRings={() => save({ type: 'discover', id: coupleRingsId })} />}
        <div className="autumn-chest-front" aria-hidden="true" />
        {!showingOpenChest && <button className="autumn-chest-lock" type="button" aria-label="상자에 걸린 자물쇠 살펴보기" onClick={openLock}>
          <span className="autumn-chest-shackle" aria-hidden="true" />
          <span className="autumn-chest-padlock" aria-hidden="true"><i /><i /><i /><i /></span>
        </button>}
        {showingOpenChest && <button className="autumn-chest-close" type="button" aria-label="상자 닫기"
          onClick={() => lockDialog.current?.close()}>×</button>}
      </div>}
      {(lockView === 'unlocking' || (lockView === 'dial' && !chestUnlocked)) && <div
        className={`autumn-lock ${lockView === 'unlocking' ? 'autumn-lock-unlocking' : ''}`}>
        <div className="autumn-lock-shackle" aria-hidden="true" />
        <div className="autumn-lock-body">
          <div className="autumn-lock-wheels">
            {digits.map((digit, index) => <button key={index} type="button" className="autumn-lock-wheel"
              ref={index === 0 ? firstDial : undefined}
              aria-label={`${index + 1}번째 다이얼, 현재 ${digit}`} disabled={lockView === 'unlocking'} onClick={() => rotateDial(index)}>
              <span className={`autumn-lock-drum ${turnedDials.includes(index) ? 'autumn-lock-drum-turning' : ''}`}
                aria-hidden="true" key={digit}>
                {[-2, -1, 0, 1].map(offset => <span key={offset}>{(digit + 10 + offset) % 10}</span>)}
              </span>
            </button>)}
          </div>
        </div>
      </div>}
    </dialog>
    <dialog ref={lockedExitDialog} className="autumn-dialog" aria-labelledby="autumn-locked-exit-title">
      <div className="autumn-paper autumn-conversation">
        <h2 id="autumn-locked-exit-title">출구가 잠겨 있어.</h2>
        <p>문을 열려면 열쇠가 필요해.</p>
        <form method="dialog"><button className="autumn-return">닫기</button></form>
      </div>
    </dialog>
    <AutumnPhone dialog={phoneDialog} save={save} cameraAvailable={thirdLetterAcquired} cameraActive={closeup} discoveries={progress.discoveries} />
  </main>
}
