import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import poses from './ending-poses.jpg'

export default function AutumnEnding({ playing, duration, onContinue }: {
  playing: boolean
  duration: number
  onContinue: () => void
}) {
  const title = useRef<HTMLHeadingElement>(null)
  const prefix = useRef<HTMLSpanElement>(null)
  const over = useRef<HTMLSpanElement>(null)
  const started = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const heading = title.current
    const thisWord = prefix.current
    const first = over.current
    const second = started.current
    if (!heading || !thisWord || !first || !second) return

    const centerOver = () => {
      const gap = Number.parseFloat(getComputedStyle(heading).columnGap)
      heading.style.setProperty('--ending-center-offset', `${(second.offsetWidth - first.offsetWidth - thisWord.offsetWidth - gap) / 2}px`)
    }

    centerOver()
    const observer = new ResizeObserver(centerOver)
    observer.observe(first)
    observer.observe(second)
    observer.observe(thisWord)
    return () => observer.disconnect()
  }, [])

  return <section className={`autumn-stage autumn-ending ${playing ? 'autumn-ending-playing' : ''}`}
    aria-label="게임 엔딩" style={{ '--ending-duration': `${duration}ms` } as CSSProperties}>
    {playing && <>
      <div className="autumn-ending-light" aria-hidden="true" />
      <div className="autumn-ending-character" aria-hidden="true"
        style={{ '--ending-poses': `url("${poses}")` } as CSSProperties}>
        <div className="autumn-ending-pose autumn-ending-back" />
        <div className="autumn-ending-pose autumn-ending-turn" />
        <div className="autumn-ending-pose autumn-ending-smile" />
      </div>
      <div className="autumn-ending-wash" aria-hidden="true" />
    </>}
    <div className="autumn-ending-message">
      <h1 ref={title} className="autumn-ending-title" aria-label={playing ? 'Game Over' : 'This Game has just started'} aria-hidden={playing}>
        <span ref={prefix} className="autumn-ending-started" aria-hidden="true">This</span>
        <span className="autumn-ending-game" aria-hidden="true">Game</span>
        <span className="autumn-ending-suffix" aria-hidden="true">
          <span ref={over} className="autumn-ending-over">Over</span>
          <span ref={started} className="autumn-ending-started">has just started</span>
        </span>
      </h1>
      {!playing && <button className="autumn-ending-continue" type="button" onClick={onContinue}>continue from +200</button>}
    </div>
  </section>
}
