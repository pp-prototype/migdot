import { sunglassesText } from './text'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { forestSunglasses, sceneHeight, sceneWidth } from './scene'

const taps = Array.from({ length: 5 }, (_, index) => `forest-sunglasses-tap-${index + 1}`)

export default function AutumnSunglasses() {
  return <span className="autumn-sunglasses" aria-hidden="true"><i /></span>
}

export function AutumnHangingSunglasses({ discoveries, onShake, onPickup }: {
  discoveries: string[]
  onShake: (id: string) => void
  onPickup: () => void
}) {
  const [shake, setShake] = useState(0)
  const [animateDrop, setAnimateDrop] = useState(false)
  const nextTap = taps.find(id => !discoveries.includes(id))
  const left = `${forestSunglasses.x / sceneWidth * 100}%`
  const hangingTop = `${forestSunglasses.y / sceneHeight * 100}%`

  if (!nextTap) {
    return <button type="button"
      className={`autumn-sunglasses-pickup autumn-sunglasses-ground ${animateDrop ? 'autumn-sunglasses-drop' : ''}`}
      style={{ left, top: `${197 / sceneHeight * 100}%`, '--sunglasses-hanging-top': hangingTop } as CSSProperties}
      aria-label={sunglassesText.take} onClick={onPickup}>
      <AutumnSunglasses />
    </button>
  }

  return <button className="autumn-sunglasses-pickup autumn-sunglasses-hanging" type="button"
    style={{ left, top: hangingTop }} aria-label={sunglassesText.shake}
    onClick={() => {
      setShake(current => current + 1)
      if (nextTap === taps[taps.length - 1]) setAnimateDrop(true)
      onShake(nextTap)
    }}>
    <span key={shake} className={shake > 0 ? 'autumn-sunglasses-jolt' : undefined}>
      <AutumnSunglasses />
    </span>
  </button>
}
