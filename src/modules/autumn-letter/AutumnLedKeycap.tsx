import { useState } from 'react'

export default function AutumnLedKeycap() {
  const [lit, setLit] = useState(false)

  return <button type="button" className="autumn-walk-control autumn-led-keycap-control"
    aria-label="4구 LED 키캡 조명" aria-pressed={lit} onClick={() => setLit(current => !current)}>
    <span className="autumn-led-keycap" aria-hidden="true"><i /><i /><i /><i /></span>
  </button>
}
