import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import { useSoundEffect } from './useSoundEffect'
import cameraErrorSound from './audio/bgm-camera-error.mp3'
import AutumnCamera from './AutumnCamera'
import Person from './Person'
import { phoneDaytimeMessage, phoneHint, secondLetter, skyPhotoId } from './clues'
import type { ProgressAction } from './progress'
import lockWallpaper from './phone-lock-wallpaper.jpg'

const pages = ['인물', '두 번째 편지', '숫자 힌트', '비밀번호']
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
  const visiblePages = cameraAvailable ? [...pages, '카메라'] : pages
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

  return <dialog ref={dialog} className={`autumn-dialog autumn-phone-dialog ${cameraPermission === 'open' ? 'autumn-phone-camera-dialog' : ''}`} aria-label="발견한 스마트폰"
    onClose={() => { setPage(0); setScreenLocked(false); setCameraPermission('idle'); setShowHint(false); setCode(''); setWrong(false); gesture.current = null }}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    <audio ref={cameraErrorAudio} src={cameraErrorSound} preload="auto" />
    {cameraPermission === 'open' ? <AutumnCamera
      active={cameraActive} savedPhoto={discoveries.includes(skyPhotoId)}
      onCapture={() => save({ type: 'discover', id: skyPhotoId })}
      onError={playCameraError} onClose={() => setCameraPermission('ready')} /> : <div className="autumn-phone">
      <div className="autumn-phone-camera" aria-hidden="true" />
      <button className="autumn-phone-power" type="button"
        aria-label={screenLocked ? '스마트폰 슬라이드로 돌아가기' : '스마트폰 잠금화면 보기'}
        onClick={() => {
          gesture.current = null
          setShowHint(false)
          setScreenLocked(!screenLocked)
        }} />
      <button className="autumn-phone-close" type="button" aria-label="스마트폰 닫기"
        onClick={() => dialog.current?.close()}>×</button>
      <div className="autumn-phone-screen"
        onPointerDown={event => {
          if (screenLocked || cameraPermission === 'prompt' || !event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
          gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}>
        {screenLocked ? <div className="autumn-phone-wallpaper">
          <img src={lockWallpaper} alt="손하트를 하는 곰" />
          <p>사랑해 공주야 <span aria-label="하트">♥</span></p>
        </div> : <div className="autumn-phone-page" key={page} aria-live="polite">
          {page === 0 && <div className="autumn-phone-portrait" role="img" aria-label="편지를 건넸던 남자"><Person /></div>}
          {page === 1 && <article><h2>두 번째 편지</h2><p>{phoneDaytimeMessage}</p></article>}
          {page === 2 && <article><p>{secondLetter}</p><p>{phoneHint}</p></article>}
          {page === 3 && (showHint
            ? <p role="status">첫 번째 숫자는 이 중에 있어. 공주야.</p>
            : <div className="autumn-phone-passcode">
            <h2>비밀번호</h2>
            <div className="autumn-phone-stars" aria-label={`네 자리 중 ${code.length}자리 입력됨`}>
              {Array.from({ length: 4 }, (_, index) =>
                <span key={index} aria-hidden="true" data-filled={index < code.length}>*</span>)}
            </div>
            <p className="autumn-phone-passcode-error">{wrong ? '비밀번호가 틀렸어.' : ''}</p>
            <div className="autumn-phone-keypad" aria-label="숫자 키패드">
              {keypad.map(digit => <button key={digit} type="button" onClick={() => pressDigit(digit)}>{digit}</button>)}
              <button type="button" className="autumn-phone-erase" aria-label="마지막 숫자 지우기" onClick={() => {
                setCode(wrong ? '' : code.slice(0, -1))
                setWrong(false)
              }}>⌫</button>
            </div>
          </div>)}
          {page === 4 && cameraAvailable && (
            cameraPermission === 'prompt' ? <section className="autumn-phone-permission" aria-labelledby="autumn-camera-permission">
              <h2 id="autumn-camera-permission">앱 사용 권한 허용</h2>
              <span className="autumn-phone-camera-icon" aria-hidden="true" />
              <p>카메라 앱의 사용을 허가하겠습니까?</p>
              <div className="autumn-phone-permission-actions">
                <button type="button" onClick={openCamera}>예</button>
                <button type="button" onClick={() => setCameraPermission('idle')}>아니오</button>
              </div>
            </section> : <button className="autumn-phone-camera-open" type="button"
              onClick={() => {
                if (cameraPermission === 'ready') openCamera()
                else setCameraPermission('prompt')
              }}>카메라 열기</button>
          )}
        </div>}
      </div>
      <div className="autumn-phone-pages" aria-label="스마트폰 화면 넘기기" inert={screenLocked || cameraPermission === 'prompt'}>
        {visiblePages.map((label, index) => <button key={label} type="button" aria-label={label}
          aria-current={page === index ? 'page' : undefined} onClick={() => goTo(index)} />)}
      </div>
    </div>}
  </dialog>
}
