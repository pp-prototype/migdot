import { phoneDaytimeMessage, phoneHint, phoneNumberMessage, phoneText, secondLetter } from './text'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import { useSoundEffect } from './useSoundEffect'
import cameraErrorSound from './audio/bgm-camera-error.mp3'
import AutumnCamera from './AutumnCamera'
import Person from './Person'
import { plushBoxId, skyPhotoId } from './clues'
import type { ProgressAction } from './progress'
import lockWallpaper from './phone-lock-wallpaper.jpg'

const pages = [phoneText.person, phoneText.secondLetterTitle, phoneText.numberHint, phoneText.password]
const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const phonePasscode = '0047'
const unlockId = 'phone-passcode-unlocked'

export default function AutumnPhone({ dialog, save, cameraAvailable, cameraActive, discoveries }: {
  dialog: RefObject<HTMLDialogElement | null>
  cameraAvailable: boolean
  cameraActive: boolean
  discoveries: string[]
  save: (action: ProgressAction) => void
}) {
  const [page, setPage] = useState(0)
  const [screenLocked, setScreenLocked] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<'idle' | 'prompt' | 'ready' | 'open'>('idle')
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const visiblePages = cameraAvailable ? [...pages, phoneText.camera] : pages
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null)

  useEffect(() => {
    if (!showHint) return
    const timer = window.setTimeout(() => setShowHint(false), 3500)
    return () => window.clearTimeout(timer)
  }, [showHint])

  const { audioRef: cameraErrorAudio, play: playCameraError } = useSoundEffect(1250)

  function openCamera() {
    if (!cameraActive) playCameraError()
    setCameraPermission('open')
  }

  function goTo(next: number) {
    if (next < 0 || next >= visiblePages.length || next === page) return
    setPage(next)
    setShowHint(false)
    if (next === 1 || next === 2) save({ type: 'read-letter', id: 'second-letter', side: 'front' })
    if (next === 2) save({ type: 'discover', id: 'phone-first-digit-hint' })
  }

  function pressDigit(digit: string) {
    const next = (wrong ? '' : code) + digit
    if (next.length > 4) return
    setCode(next)
    setWrong(false)
    if (next.length !== 4) return

    if (next === phonePasscode) {
      save({ type: 'discover', id: unlockId })
      setCode('')
      setShowHint(true)
    } else {
      setWrong(true)
    }
  }

  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current
    if (!start || start.id !== event.pointerId) return
    gesture.current = null
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const rotated = window.matchMedia('(orientation: portrait)').matches
    const distance = rotated ? dy : dx
    const crossDistance = rotated ? dx : dy
    if (Math.abs(distance) >= 28 && Math.abs(distance) > Math.abs(crossDistance)) {
      goTo(page + (distance < 0 ? 1 : -1))
    }
  }

  return <dialog ref={dialog} className={`autumn-dialog autumn-phone-dialog ${cameraPermission === 'open' ? 'autumn-phone-camera-dialog' : ''}`} aria-label={phoneText.title}
    onClose={() => { setPage(0); setScreenLocked(false); setCameraPermission('idle'); setShowHint(false); setCode(''); setWrong(false); gesture.current = null }}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    <audio ref={cameraErrorAudio} src={cameraErrorSound} preload="auto" />
    {cameraPermission === 'open' ? <AutumnCamera
      active={cameraActive} savedPhoto={discoveries.includes(skyPhotoId)}
      plushBoxCollected={discoveries.includes(plushBoxId)}
      onCollectPlushBox={() => save({ type: 'discover', id: plushBoxId })}
      onCapture={() => save({ type: 'discover', id: skyPhotoId })}
      onError={playCameraError} onClose={() => setCameraPermission('ready')} /> : <div className="autumn-phone">
      <div className="autumn-phone-camera" aria-hidden="true" />
      <button className="autumn-phone-power" type="button"
        aria-label={screenLocked ? phoneText.returnToSlides : phoneText.showLockScreen}
        onClick={() => {
          gesture.current = null
          setShowHint(false)
          setScreenLocked(!screenLocked)
        }} />
      <button className="autumn-phone-close" type="button" aria-label={phoneText.close}
        onClick={() => dialog.current?.close()}>×</button>
      <div className="autumn-phone-screen"
        onPointerDown={event => {
          if (screenLocked || cameraPermission === 'prompt' || !event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
          gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}>
        {screenLocked ? <div className="autumn-phone-wallpaper">
          <img src={lockWallpaper} alt={phoneText.wallpaper} />
          <p>{phoneText.love} {' '}<span aria-label={phoneText.heart}>♥</span></p>
        </div> : <div className="autumn-phone-page" key={page} aria-live="polite">
          {page === 0 && <div className="autumn-phone-portrait" role="img" aria-label={phoneText.portrait}><Person /></div>}
          {page === 1 && <article><h2>{phoneText.secondLetterTitle}</h2><p>{phoneDaytimeMessage}</p></article>}
          {page === 2 && <article><p>{secondLetter}</p><p className="autumn-phone-letter-hint">{phoneHint}</p></article>}
          {page === 3 && (showHint
            ? <p role="status">{phoneNumberMessage}</p>
            : <div className="autumn-phone-passcode">
            <h2>{phoneText.password}</h2>
            <div className="autumn-phone-stars" aria-label={phoneText.digitsEntered(code.length)}>
              {Array.from({ length: 4 }, (_, index) =>
                <span key={index} aria-hidden="true" data-filled={index < code.length}>*</span>)}
            </div>
            <p className="autumn-phone-passcode-error">{wrong ? phoneText.wrongPassword : ''}</p>
            <div className="autumn-phone-keypad" aria-label={phoneText.keypad}>
              {keypad.map(digit => <button key={digit} type="button" onClick={() => pressDigit(digit)}>{digit}</button>)}
              <button type="button" className="autumn-phone-erase" aria-label={phoneText.erase} onClick={() => {
                setCode(wrong ? '' : code.slice(0, -1))
                setWrong(false)
              }}>⌫</button>
            </div>
          </div>)}
          {page === 4 && cameraAvailable && (
            cameraPermission === 'prompt' ? <section className="autumn-phone-permission" aria-labelledby="autumn-camera-permission">
              <h2 id="autumn-camera-permission">{phoneText.permissionTitle}</h2>
              <span className="autumn-phone-camera-icon" aria-hidden="true" />
              <p>{phoneText.permissionQuestion}</p>
              <div className="autumn-phone-permission-actions">
                <button type="button" onClick={openCamera}>{phoneText.yes}</button>
                <button type="button" onClick={() => setCameraPermission('idle')}>{phoneText.no}</button>
              </div>
            </section> : <button className="autumn-phone-camera-open" type="button"
              onClick={() => {
                if (cameraPermission === 'ready') openCamera()
                else setCameraPermission('prompt')
              }}>{phoneText.openCamera}</button>
          )}
        </div>}
      </div>
      <div className="autumn-phone-pages" aria-label={phoneText.turnPages} inert={screenLocked || cameraPermission === 'prompt'}>
        {visiblePages.map((label, index) => <button key={label} type="button" aria-label={label}
          aria-current={page === index ? 'page' : undefined} onClick={() => goTo(index)} />)}
      </div>
    </div>}
  </dialog>
}
