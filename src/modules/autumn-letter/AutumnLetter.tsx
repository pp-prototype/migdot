import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { firstLetter } from './clues'
import { drawPerson, drawScene, sceneHeight, sceneWidth } from './scene'
import './autumn.css'

const fallingLeaves = Array.from({ length: 44 }, (_, i) => ({
  left: `${(i * 37) % 113 - 10}%`,
  '--leaf-size': `${6 + (i * 7) % 12}px`,
  '--leaf-alpha': .42 + (i % 6) * .1,
  animationDelay: `${-i * 1.23}s`,
  animationDuration: `${9 + i % 8}s`,
}))

function Person() {
  return <canvas width={180} height={340} aria-hidden="true" ref={element => {
    if (element) drawPerson(element)
  }} />
}

export default function AutumnLetter() {
  const [walking, setWalking] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const canopy = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current && canopy.current) drawScene(canvas.current, canopy.current)
  }, [])

  function startWalking() {
    dialog.current?.close()
    setWalking(true)
  }

  return <main className="autumn">
    <div className="autumn-stage">
      <section className={`autumn-scene ${walking ? 'autumn-scene-walking' : ''}`}
        aria-label={walking ? '함께 걷는 가을 산책로' : '가을 산책로'}>
        <canvas ref={canvas} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape" aria-hidden="true" />
        <canvas ref={canopy} width={sceneWidth * 2} height={sceneHeight * 2} className="autumn-landscape autumn-canopy" aria-hidden="true" />
        <div className="autumn-falling" aria-hidden="true">
          {fallingLeaves.map((style, i) => <i key={i} style={style as CSSProperties} />)}
        </div>
        {!walking && <button className="autumn-object autumn-person" aria-label="인물에게 편지 받기"
          onClick={() => dialog.current?.showModal()}><Person /></button>}
      </section>
      {walking && <div className="autumn-walk-fade" aria-hidden="true" />}
    </div>
    <span className="autumn-visually-hidden" role="status">{walking ? '함께 가을 산책을 시작했어.' : ''}</span>

    <dialog ref={dialog} className="autumn-dialog" aria-labelledby="autumn-letter-title">
      <div className="autumn-paper">
        <button className="autumn-close" aria-label="편지 닫기" onClick={() => dialog.current?.close()}>×</button>
        <div className="autumn-letter-layout">
          <div className="autumn-portrait" aria-hidden="true"><Person /></div>
          <article className="autumn-box-letter">
            <h2 id="autumn-letter-title">첫 편지</h2>
            <p>{firstLetter}</p>
          </article>
        </div>
        <button className="autumn-return" onClick={startWalking}>영상이랑 걷기</button>
      </div>
    </dialog>
  </main>
}
