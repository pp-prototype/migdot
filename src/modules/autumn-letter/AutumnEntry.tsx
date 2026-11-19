import { useState } from 'react'
import type { FormEvent } from 'react'
import AutumnLetter from './AutumnLetter'
import { entryCode } from './clues'
import { useAutumnProgress } from './progress'
import quokkaSeal from './quokka-seal.png'
import './entry.css'

const nicknames = ['곰찌', '깨비', '오깨', '곰카']

export default function AutumnEntry() {
  const { progress, save } = useAutumnProgress()
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)

  function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (answer !== entryCode) {
      setWrong(true)
      return
    }
    save({ type: 'admit' })
  }

  if (progress.admitted) return <AutumnLetter progress={progress} save={save} />

  return <main className="autumn-entry">
    <form className="autumn-entry-card" onSubmit={enter}>
      <div className="autumn-entry-margins">
        {nicknames.map(name => <span key={name}>{name}</span>)}
      </div>
      <img className="autumn-entry-seal" src={quokkaSeal} alt="쿼카 봉인" />
      <h1>우리가 된 날</h1>
      <div className="autumn-entry-password">
        <div className="autumn-entry-slots" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) =>
            <span key={index} data-filled={index < answer.length}>*</span>)}
        </div>
        <input aria-label="비밀번호" type="password" inputMode="numeric" autoComplete="off"
          maxLength={4} required value={answer} aria-invalid={wrong}
          aria-describedby={wrong ? 'entry-response' : undefined}
          onChange={event => {
            setAnswer(event.target.value.replace(/[^0-9]/g, ''))
            setWrong(false)
          }} />
      </div>
      <button disabled={answer.length !== 4}>들어가기</button>
      {wrong && <p id="entry-response" role="alert">그날을 다시 떠올려 봐.</p>}
    </form>
  </main>
}
