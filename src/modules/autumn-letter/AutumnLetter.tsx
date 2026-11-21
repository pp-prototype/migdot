import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { cinemaPosters, constellationText, dogWalkText, finalLetter, firstLetter, firstLetterBack, firstLetterBackHint, fourthLetter, fourthLetterHint, thirdLetter, thirdLetterHint, walkText } from './text'
import { noodleStopperId, plushBoxId, skyPhotoId } from './clues'
import { cinemaExit } from './cinemaRoom'
import { cinemaElevator, cinemaFlyer } from './cinemaScene'
import cinemaFlyerArt from './cinema-flyer.jpg'
import endingPortraits from './ending-poses.jpg'
import { cinemaFlyerId, isLeafPileUnlocked } from './progress'
import type { Progress, ProgressAction } from './progress'
import AutumnFlyer from './AutumnFlyer'
import AutumnChestContents from './AutumnChestContents'
import AutumnNoodleStopper from './AutumnNoodleStopper'
import AutumnShrubPuzzle from './AutumnShrubPuzzle'
import AutumnSunglasses, { AutumnHangingSunglasses } from './AutumnSunglasses'
import AutumnLedKeycap from './AutumnLedKeycap'
import AutumnPlushBox from './AutumnPlushBox'
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

const dogTreatLeafIndex = 13
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
const lampFlashStyles = lampPulses.map(delay => ({
  animationDelay: `${delay}s`,
  animationDuration: `${lampPattern.length}s`,
}))

const firstLetterId = 'first-letter'
const thirdLetterId = 'third-letter'
const fourthLetterId = 'fourth-letter'
const finalLetterId = 'final-letter'
const letters = {
  [firstLetterId]: { title: walkText.firstLetter, text: firstLetter },
  [thirdLetterId]: { title: walkText.thirdLetter, text: thirdLetter },
  [fourthLetterId]: { title: walkText.fourthLetter, text: fourthLetter },
  [finalLetterId]: { title: walkText.finalLetter, text: finalLetter },
}
const letterOrder = [firstLetterId, thirdLetterId, fourthLetterId, finalLetterId] as const
type LetterId = keyof typeof letters
const leafPileLockId = 'leaf-pile-lock'
const chestKeyId = 'leaf-pile-chest-key'
const coupleRingsId = 'leaf-pile-couple-rings'
const sunglassesId = 'forest-oval-sunglasses'
const ledKeycapId = 'lakeside-led-keycap'
const dogCapId = 'dog-trail-blue-nba-cap'
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
  const letterHint = showingFirst && letterBack ? firstLetterBackHint
    : activeLetter === thirdLetterId ? thirdLetterHint
    : activeLetter === fourthLetterId ? fourthLetterHint : ''
  const map = progress.currentMap
  const walking = map !== 'first-trail'
  const forest = map === 'third-trail'
  const closeup = map === 'lakeside-bench'
  const silhouetteVisible = closeup && progress.discoveries.includes(skyPhotoId)
  const dogTrail = map === 'fifth-trail'
  const leaves = fallingLeaves(forest, closeup || map === 'fourth-trail', dogTrail)
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
  const stopperAcquired = progress.discoveries.includes(noodleStopperId)
  const sunglassesAcquired = progress.discoveries.includes(sunglassesId)
  const ledKeycapAcquired = progress.discoveries.includes(ledKeycapId)
  const plushBoxAcquired = progress.discoveries.includes(plushBoxId)
  const dogCapAcquired = progress.discoveries.includes(dogCapId)
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
  const canvas = useRef<HTMLCanvasElement>(null)
  const canopy = useRef<HTMLCanvasElement>(null)
  const puzzleTree = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current && canopy.current) drawScene(canvas.current, canopy.current, map, showScenePickup, puzzleTree.current)
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
    playFootsteps()
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
        aria-label={cinemaRoom ? walkText.auditorium : cinemaHall ? walkText.cinemaHall : cinema ? walkText.cinema : dogTrail ? walkText.dogTrail : closeup ? walkText.nearBench : lakeside ? walkText.lake : forest ? walkText.forest : walking ? walkText.trail : walkText.entryTrail}
        aria-description={cinemaRoom ? walkText.auditoriumDescription : cinemaHall ? walkText.hallDescription : cinema ? walkText.cinemaDescription : undefined}>
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
        {lakeside && <div key={map} className="autumn-lake-lamp" aria-hidden="true"
          style={{
            left: `${lakeLamp.x / sceneWidth * 100}%`,
            top: `${lakeLamp.y / sceneHeight * 100}%`,
          }}>
          {lampFlashStyles.map(style => <i key={style.animationDelay} className="autumn-lake-flash" style={style} />)}
        </div>}
        {closeup && !ledKeycapAcquired && <button type="button" className="autumn-lake-keycap-pickup"
          style={{ left: `${(lakesideLetter.x + 18) / sceneWidth * 100}%`, top: `${235 / sceneHeight * 100}%` }}
          aria-label={walkText.takeKeycap}
          onClick={event => {
            const flashes = Array.from(event.currentTarget.children)
            if (flashes.some(flash => Number(getComputedStyle(flash).opacity) > .05)) {
              save({ type: 'discover', id: ledKeycapId })
            }
          }}>
          {lampFlashStyles.map(style => <i key={style.animationDelay} className="autumn-lake-flash" style={style} aria-hidden="true" />)}
        </button>}
        {silhouetteVisible && <button type="button" className="autumn-lake-silhouette"
          aria-label={walkText.takeHand}
          onClick={takeHand}
          style={{
            left: `${lakesideSilhouette.x / sceneWidth * 100}%`,
            top: `${lakesideSilhouette.y / sceneHeight * 100}%`,
          }}><Person /></button>}
        {!closeup && !atCinema && <div className="autumn-falling" aria-hidden="true">
          {leaves.map((style, i) => dogTrail && i === dogTreatLeafIndex && !dogCapAcquired
            ? null
            : <i key={i} style={style as CSSProperties} />)}
        </div>}
        {closeup && showScenePickup && <button className="autumn-scene-letter" type="button" aria-label={walkText.benchLetter}
          style={{ left: `${lakesideLetter.x / sceneWidth * 100}%`, top: `${lakesideLetter.y / sceneHeight * 100}%` }}
          onClick={() => openLetter(thirdLetterId)} />}
        {map === 'fourth-trail' && <button className="autumn-bench-approach" type="button"
          aria-label={walkText.approachBench} onClick={approachBench} />}
        {!walking && <button className="autumn-object autumn-person" aria-label={walkText.acceptLetter} disabled={firstLetterAcquired}
          onClick={() => openLetter(firstLetterId)}><Person /></button>}
        {map === 'second-trail' && !lockFound && <button type="button" className="autumn-lock-pile"
          style={{ left: `${lockPile.x / sceneWidth * 100}%`, top: `${lockPile.y / sceneHeight * 100}%` }}
          aria-label={walkText.lookUnderLeaves} onClick={() => {
            save({ type: 'discover', id: leafPileLockId })
            setLockView('chest')
          }} />}
        {map === 'second-trail' && <AutumnShrubPuzzle tree={puzzleTree} discoveries={progress.discoveries}
          discover={id => save({ type: 'discover', id })} />}
        {forest && !phoneFound && <button className="autumn-phone-ground" type="button" aria-label={walkText.inspectPhone} onClick={openPhone}>
          <span className="autumn-phone-icon" aria-hidden="true" />
        </button>}
        {forest && !sunglassesAcquired && <AutumnHangingSunglasses discoveries={progress.discoveries}
          onShake={id => save({ type: 'discover', id })}
          onPickup={() => save({ type: 'discover', id: sunglassesId })} />}
        {dogTrail && <>
          <AutumnDogWalk hatAcquired={dogCapAcquired} treatStyle={leaves[dogTreatLeafIndex] as CSSProperties}
            onFetchHat={() => save({ type: 'discover', id: dogCapId })} />
          {showScenePickup && <button className="autumn-scene-letter" type="button" aria-label={walkText.treeLetter}
            style={{ left: `${dogTrailLetter.x / sceneWidth * 100}%`, top: `${dogTrailLetter.y / sceneHeight * 100}%` }}
            onClick={() => openLetter(fourthLetterId)} />}
        </>}
        {cinema && <>
          {showScenePickup && <button className="autumn-scene-letter" type="button"
            style={{ left: `${cinemaFlyer.x / sceneWidth * 100}%`, top: `${cinemaFlyer.y / sceneHeight * 100}%` }}
            aria-label={walkText.carFlyer} onClick={openFlyer} />}
          <button className="autumn-scene-letter autumn-cinema-elevator" type="button"
            style={{ left: `${cinemaElevator.x / sceneWidth * 100}%`, top: `${cinemaElevator.y / sceneHeight * 100}%` }}
            aria-label={walkText.elevator}
            onClick={() => {
              playFootsteps()
              save({ type: 'visit-map', id: 'cinema-hall' })
            }} />
        </>}
        {cinemaHall && <ul className="autumn-visually-hidden" aria-label={walkText.screenings}>
          {cinemaPosters.map(({ title, date, auditorium }) => <li key={title}>{title} · {date} · {auditorium}</li>)}
        </ul>}
        {cinemaRoom && <>
          <AutumnCinemaCredits />
          <button className="autumn-cinema-exit" type="button" aria-label={walkText.openExit}
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
        {(ringsAcquired || stopperAcquired || sunglassesAcquired || ledKeycapAcquired || plushBoxAcquired || dogCapAcquired) && <div className="autumn-walk-items" aria-label={walkText.collectibles} role="group">
          {ringsAcquired && <span className="autumn-rings-item" role="img" aria-label={walkText.rings}>
            <span className="autumn-chest-rings" aria-hidden="true"><i /><b /></span>
          </span>}
          {stopperAcquired && <span className="autumn-collectible-item" role="img" aria-label={walkText.stopper}>
            <AutumnNoodleStopper />
          </span>}
          {sunglassesAcquired && <span className="autumn-collectible-item" role="img" aria-label={walkText.sunglasses}>
            <AutumnSunglasses />
          </span>}
          {ledKeycapAcquired && <AutumnLedKeycap />}
          {plushBoxAcquired && <span className="autumn-collectible-item" role="img" aria-label={constellationText.reward}>
            <AutumnPlushBox />
          </span>}
          {dogCapAcquired && <span className="autumn-collectible-item" role="img" aria-label={walkText.cap}>
            <span className="autumn-nba-cap" aria-hidden="true">{dogWalkText.capMark}</span>
          </span>}
        </div>}
        <div className="autumn-walk-items" aria-label={walkText.inventory} role="group">
          {storedLetter && <button className="autumn-walk-control" type="button" aria-label={canBrowseLetters || !firstLetterAcquired ? walkText.readLetters : walkText.rereadFirst}
            onClick={() => openLetter(storedLetter)}>
            <span className="autumn-envelope" aria-hidden="true" />
          </button>}
          {phoneFound && <button className="autumn-walk-control" type="button"
            aria-label={thirdLetterAcquired ? walkText.phoneNotification : walkText.reopenPhone} onClick={openPhone}>
            <span className="autumn-phone-icon" aria-hidden="true">
              {thirdLetterAcquired && <i className="autumn-phone-notification" />}
            </span>
          </button>}
          {lockFound && <button className="autumn-walk-control" type="button"
            aria-label={chestUnlocked ? walkText.viewChest : walkText.reopenLock} onClick={openLock}>
            <span className={chestUnlocked ? 'autumn-chest-icon' : 'autumn-lock-icon'} aria-hidden="true" />
          </button>}
          {flyerAcquired && <button className="autumn-walk-control" type="button" aria-label={walkText.storedFlyer}
            onClick={openFlyer}>
            <span className="autumn-flyer-icon" aria-hidden="true" />
          </button>}
          {keyAcquired && <span className="autumn-key-item" role="img" aria-label={walkText.key}>
            <span className="autumn-key-icon" aria-hidden="true" />
          </span>}
        </div>
      </div>
      {walking && <>
        <div className="autumn-next" inert={Boolean(cinemaHall && cinemaEntry)}>
          {(forest || lakeside || dogTrail || atCinema) && <button className="autumn-walk-control autumn-walk-back" type="button"
            aria-label={cinemaRoom ? walkText.backToHall : cinemaHall ? walkText.backToParking : cinema ? walkText.backToDogs : dogTrail ? walkText.backToBench : closeup ? walkText.backToLake : lakeside ? walkText.backToForest : walkText.backToSecond}
            onClick={() => {
              playFootsteps()
              save({ type: 'visit-map', id: cinemaRoom ? 'cinema-hall' : cinemaHall ? 'sixth-trail' : cinema ? 'fifth-trail' : dogTrail ? 'lakeside-bench' : closeup ? 'fourth-trail' : lakeside ? 'third-trail' : 'second-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
          {cinemaHall && <button className="autumn-walk-control autumn-cinema-enter" type="button"
            aria-label={walkText.enterAuditorium} onClick={enterCinemaRoom}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
          {!closeup && !atCinema && <button className="autumn-walk-control" type="button" aria-label={walkText.nextTrail}
            onClick={lakeside ? approachBench : () => {
              playFootsteps()
              save({ type: 'visit-map', id: dogTrail ? 'sixth-trail' : forest ? 'fourth-trail' : 'third-trail' })
            }}>
            <span className="autumn-steps" aria-hidden="true"><i /><i /></span>
          </button>}
        </div>
        <span className="autumn-visually-hidden" role="status">
          {cinemaRoom ? walkText.arrivedAuditorium : cinemaHall ? walkText.arrivedHall : cinema ? walkText.arrivedCinema : dogTrail ? walkText.arrivedDogs : closeup ? walkText.arrivedBench : lakeside ? walkText.arrivedLake : forest ? walkText.arrivedForest : walkText.startedWalk}
        </span>
      </>}
      {cinemaHall && cinemaEntry === 'fade' && <div className="autumn-cinema-fade-out" aria-hidden="true" />}
    </div>

    {ending && <AutumnEnding playing={endingPlaying} duration={endingDuration}
      onContinue={() => save({ type: 'restart' })} />}
    {!endingPlaying && <div inert={Boolean(cinemaHall && cinemaEntry)}><AutumnSettings /></div>}
    <dialog ref={dialog} className={`autumn-dialog ${walking ? '' : 'autumn-dialog-delivery'}`} aria-labelledby="autumn-letter-title">
      {!walking && <div className="autumn-delivery-person" aria-hidden="true"><Person /></div>}
      <div className={`autumn-paper ${canBrowseLetters ? 'autumn-paper-with-nav' : ''}`}>
        <button className="autumn-close" aria-label={walkText.closeLetter} onClick={() => dialog.current?.close()}>×</button>
        <article className="autumn-box-letter" aria-live="polite">
          <h2 id="autumn-letter-title">{letters[activeLetter].title}</h2>
          <p key={`${activeLetter}-${letterBack}`} className="autumn-letter-face">
            {showingFirst && letterBack ? firstLetterBack : letters[activeLetter].text}
          </p>
          {letterHint && <p className="autumn-letter-hint">{letterHint}</p>}
        </article>
        {!walking && showingFirst && <button className="autumn-return" onClick={startWalking}>{walkText.startWalking}</button>}
        {canBrowseLetters && <>
          <button className="autumn-letter-nav autumn-letter-prev" type="button"
            aria-label={previousLetter ? walkText.viewLetter(letters[previousLetter].title) : walkText.previousLetter}
            disabled={!previousLetter} onClick={() => previousLetter && selectLetter(previousLetter)}>‹</button>
          <button className="autumn-letter-nav autumn-letter-next" type="button"
            aria-label={nextLetter ? walkText.viewLetter(letters[nextLetter].title) : walkText.nextLetter}
            disabled={!nextLetter} onClick={() => nextLetter && selectLetter(nextLetter)}>›</button>
        </>}
        {walking && showingFirst && <button className="autumn-page-corner" type="button" onClick={flipLetter}
          aria-label={letterBack ? walkText.letterFront : walkText.letterBack} />}
      </div>
    </dialog>

    <AutumnFlyer dialog={flyerDialog} />
    <dialog ref={lockDialog}
      className={`autumn-dialog autumn-lock-dialog ${showingChest ? 'autumn-chest-dialog' : ''}`}
      aria-label={showingOpenChest ? walkText.openedChest : showingChest ? walkText.hiddenChest : walkText.dialLock}
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
        {!showingOpenChest && <button className="autumn-chest-lock" type="button" aria-label={walkText.inspectLock} onClick={openLock}>
          <span className="autumn-chest-shackle" aria-hidden="true" />
          <span className="autumn-chest-padlock" aria-hidden="true"><i /><i /><i /><i /></span>
        </button>}
        {showingOpenChest && <button className="autumn-chest-close" type="button" aria-label={walkText.closeChest}
          onClick={() => lockDialog.current?.close()}>×</button>}
      </div>}
      {(lockView === 'unlocking' || (lockView === 'dial' && !chestUnlocked)) && <div
        className={`autumn-lock ${lockView === 'unlocking' ? 'autumn-lock-unlocking' : ''}`}>
        <div className="autumn-lock-shackle" aria-hidden="true" />
        <div className="autumn-lock-body">
          <div className="autumn-lock-wheels">
            {digits.map((digit, index) => <button key={index} type="button" className="autumn-lock-wheel"
              ref={index === 0 ? firstDial : undefined}
              aria-label={walkText.dial(index + 1, digit)} disabled={lockView === 'unlocking'} onClick={() => rotateDial(index)}>
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
        <h2 id="autumn-locked-exit-title">{walkText.exitLocked}</h2>
        <p>{walkText.needKey}</p>
        <form method="dialog"><button className="autumn-return">{walkText.close}</button></form>
      </div>
    </dialog>
    <AutumnPhone dialog={phoneDialog} save={save} cameraAvailable={thirdLetterAcquired} cameraActive={closeup} discoveries={progress.discoveries} />
  </main>
}
