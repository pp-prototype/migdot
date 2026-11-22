import { entryNotice, entryText, nicknames } from './text'
import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import AutumnLetter from './AutumnLetter'
import { entryCode } from './clues'
import { useAutumnProgress } from './progress'
import quokkaSeal from './quokka-seal.png'
import './entry.css'

function EntryNotice({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  return <dialog ref={dialog} className="autumn-entry-notice" onClose={onClose}
    aria-labelledby="autumn-entry-notice-title" aria-describedby="autumn-entry-notice-message">
    <h2 id="autumn-entry-notice-title">{entryNotice.title}</h2>
    <p id="autumn-entry-notice-message">{entryNotice.message}</p>
    <form method="dialog">
      <button>{entryText.confirm}</button>
    </form>
  </dialog>
}

export default function AutumnEntry() {
  const { progress, save } = useAutumnProgress()
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)
  const [showNotice, setShowNotice] = useState(false)

  function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (answer !== entryCode) {
      setWrong(true)
      return
    }
    save({ type: 'admit' })
    setShowNotice(true)
  }

  if (progress.admitted) return <>
    <AutumnLetter progress={progress} save={save} />
    {showNotice && <EntryNotice onClose={() => setShowNotice(false)} />}
  </>

  return <main className="autumn-entry">
    <form className="autumn-entry-card" onSubmit={enter}>
      <div className="autumn-entry-margins">
        {nicknames.map(name => <span key={name}>{name}</span>)}
      </div>
      <img className="autumn-entry-seal" src={quokkaSeal} alt={entryText.seal} />
      <h1>{entryText.title}</h1>
      <div className="autumn-entry-password">
        <div className="autumn-entry-slots" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) =>
            <span key={index} data-filled={index < answer.length}>*</span>)}
        </div>
        <input aria-label={entryText.password} type="password" inputMode="numeric" autoComplete="off"
          maxLength={4} required value={answer} aria-invalid={wrong}
          aria-describedby={wrong ? 'entry-response' : undefined}
          onChange={event => {
            setAnswer(event.target.value.replace(/[^0-9]/g, ''))
            setWrong(false)
          }} />
      </div>
      <button disabled={answer.length !== 4}>{entryText.enter}</button>
      {wrong && <p id="entry-response" role="alert">{entryText.wrong}</p>}
    </form>
  </main>
}
