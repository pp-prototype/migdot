import { useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import Person from './Person'
import { phoneHint, secondLetter } from './clues'
import type { ProgressAction } from './progress'

const pages = ['인물', '두 번째 편지', '숫자 힌트', '비밀번호', '잠금 해제 메시지']
const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const phonePasscode = '0047'
const unlockId = 'phone-passcode-unlocked'

export default function AutumnPhone({ dialog, save, discoveries }: {
  dialog: RefObject<HTMLDialogElement | null>
  discoveries: string[]
  save: (action: ProgressAction) => void
}) {
  const [page, setPage] = useState(0)
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  const unlocked = discoveries.includes(unlockId)
  const visiblePages = unlocked ? pages : pages.slice(0, 4)
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null)

  function goTo(next: number) {
    if (next < 0 || next >= visiblePages.length || next === page) return
    setPage(next)
    if (next === 1) save({ type: 'read-letter', id: 'second-letter', side: 'front' })
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
      setPage(4)
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

  return <dialog ref={dialog} className="autumn-dialog autumn-phone-dialog" aria-label="발견한 스마트폰"
    onClose={() => { setPage(0); setCode(''); setWrong(false); gesture.current = null }}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    <div className="autumn-phone">
      <div className="autumn-phone-camera" aria-hidden="true" />
      <button className="autumn-phone-close" type="button" aria-label="스마트폰 닫기"
        onClick={() => dialog.current?.close()}>×</button>
      <div className="autumn-phone-screen"
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
          gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={endSwipe} onPointerCancel={() => { gesture.current = null }}>
        <div className="autumn-phone-page" key={page} aria-live="polite">
          {page === 0 && <div className="autumn-phone-portrait" role="img" aria-label="편지를 건넸던 남자"><Person /></div>}
          {page === 1 && <article><h2>두 번째 편지</h2><p>{secondLetter}</p></article>}
          {page === 2 && <p>{phoneHint}</p>}
          {page === 3 && <div className="autumn-phone-passcode">
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
          </div>}
          {page === 4 && <p>첫 번째 숫자는 이 중에 있어. 공주야.</p>}
        </div>
      </div>
      <div className="autumn-phone-pages" aria-label="스마트폰 화면 넘기기">
        {visiblePages.map((label, index) => <button key={label} type="button" aria-label={label}
          aria-current={page === index ? 'page' : undefined} onClick={() => goTo(index)} />)}
      </div>
    </div>
  </dialog>
}
