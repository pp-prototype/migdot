import { endingText } from './text'
import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import poses from './ending-poses.jpg'

const hearts = [
  { x: -25, rise: -18, fall: 27, delay: 0, size: 7, color: '#ef8c9a' },
  { x: 24, rise: -24, fall: 22, delay: 45, size: 8, color: '#dd5e7b' },
  { x: -35, rise: -12, fall: 31, delay: 130, size: 5, color: '#f5a7aa' },
  { x: 36, rise: -13, fall: 34, delay: 180, size: 6, color: '#ed758c' },
  { x: -15, rise: -26, fall: 21, delay: 290, size: 6, color: '#e76f86' },
  { x: 16, rise: -19, fall: 29, delay: 340, size: 8, color: '#f2a7ad' },
  { x: -42, rise: -15, fall: 37, delay: 400, size: 5, color: '#e8899e' },
  { x: 42, rise: -17, fall: 34, delay: 445, size: 5, color: '#e8899e' },
  { x: -28, rise: -21, fall: 33, delay: 540, size: 6, color: '#e1607c' },
  { x: 31, rise: -14, fall: 28, delay: 600, size: 7, color: '#f1a0aa' },
]

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
    aria-label={endingText.title} style={{ '--ending-duration': `${duration}ms` } as CSSProperties}>
    {playing && <>
      <div className="autumn-ending-light" aria-hidden="true" />
      <div className="autumn-ending-character" aria-hidden="true"
        style={{ '--ending-poses': `url("${poses}")` } as CSSProperties}>
        <div className="autumn-ending-pose autumn-ending-back" />
        <div className="autumn-ending-pose autumn-ending-turn" />
        <div className="autumn-ending-pose autumn-ending-smile" />
      </div>
      <div className="autumn-ending-heartburst" aria-hidden="true">
        {hearts.map(({ x, rise, fall, delay, size, color }) => <i key={delay} className="autumn-ending-heart" style={{
          '--heart-x': `${x}cqh`,
          '--heart-rise': `${rise}cqh`,
          '--heart-fall': `${fall}cqh`,
          '--heart-delay': `${delay}ms`,
          '--heart-size': `${size}px`,
          '--heart-color': color,
        } as CSSProperties} />)}
      </div>
      <div className="autumn-ending-wash" aria-hidden="true" />
    </>}
    <div className="autumn-ending-message">
      <h1 ref={title} className="autumn-ending-title" aria-label={playing ? endingText.initial : endingText.final} aria-hidden={playing}>
        <span ref={prefix} className="autumn-ending-started" aria-hidden="true">{endingText.prefix}</span>
        <span className="autumn-ending-game" aria-hidden="true">{endingText.game}</span>
        <span className="autumn-ending-suffix" aria-hidden="true">
          <span ref={over} className="autumn-ending-over">{endingText.over}</span>
          <span ref={started} className="autumn-ending-started">{endingText.started}</span>
        </span>
      </h1>
      {!playing && <button className="autumn-ending-continue" type="button" onClick={onContinue}>{endingText.continue}</button>}
    </div>
  </section>
}
