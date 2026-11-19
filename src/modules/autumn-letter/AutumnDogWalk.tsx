import { useEffect, useRef } from 'react'
import { useSoundEffect } from './useSoundEffect'
import barkSound from './audio/bgm-dog-bark.mp3'
import { sceneHeight, sceneWidth } from './scene'

function animateDogWalk(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return
  const ctx = context
  ctx.setTransform(2, 0, 0, 2, 0, 0)

  function paint(color: string, shape: Path2D) {
    ctx.fillStyle = color
    ctx.fill(shape)
  }

  const fur = new Path2D('M-14 8 L-19 2 L-17 -6 L-20 -10 L-13 -14 L-10 -22 L-3 -20 L4 -24 L12 -20 L18 -15 L16 -8 L20 -4 L18 4 L21 9 L15 12 L12 18 L5 15 L-1 18 L-7 15 L-14 17 Z')
  const spitzHead = new Path2D('M-12 -14 L-13 -31 L-4 -24 Q3 -27 9 -26 L17 -35 L17 -18 Q15 -10 6 -7 Q-5 -7 -12 -14 Z')
  const corgiBody = new Path2D('M-18 -15 Q-9 -21 7 -20 Q17 -19 21 -11 L24 5 Q24 15 13 18 Q6 21 1 15 Q-6 20 -17 15 Q-22 10 -21 3 Z')
  const corgiHead = new Path2D('M-12 -16 L-17 -33 Q-18 -40 -13 -39 L-3 -30 Q4 -33 12 -30 L22 -38 Q27 -41 24 -33 L21 -16 Q14 -12 3 -12 Z')
  const spitzTail = new Path2D('M-1 10 Q-15 11 -17 2 Q-23 -9 -14 -15 Q-4 -20 1 -11 Q-8 -12 -8 -7 Q-8 -1 3 3 Z')
  const corgiTail = new Path2D('M8 9 Q22 5 23 -9 Q28 -13 29 -8 Q30 4 19 13 L10 15 Z')
  const glove = new Path2D('M-21 25 L-17 9 Q-17 1 -10 -2 L2 -7 Q9 -11 17 -8 Q21 -3 15 2 L10 5 Q16 8 12 13 L7 17 Q10 20 4 25 Z')

  function ellipse(color: string, x: number, y: number, rx: number, ry: number) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawLeash(fromX: number, fromY: number, toX: number, toY: number, color: string) {
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.quadraticCurveTo((fromX + toX) / 2 + 8, (fromY + toY) / 2 - 2, toX, toY)
    ctx.lineWidth = 2.7
    ctx.strokeStyle = '#191820'
    ctx.stroke()
    ctx.lineWidth = 1.25
    ctx.strokeStyle = color
    ctx.stroke()
  }

  function dog(x: number, y: number, size: number, step: number, isSpitz: boolean) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(size, size)
    ellipse('#39282e91', 0, 24, isSpitz ? 19 : 24, 6)
    for (const side of [-1, 1]) {
      const stride = Math.sin(step + (side === 1 ? Math.PI : 0))
      ellipse(isSpitz ? '#aaa7ad' : '#764b3c', side * 10, -4 - stride * 3, 4.5, 8)
      ellipse(isSpitz ? '#dfd9d1' : '#d2a37a', side * 11, 16 + stride * 5, isSpitz ? 4.4 : 5.5, isSpitz ? 8 : 7)
      ellipse(isSpitz ? '#f0e9dc' : '#f1d7b3', side * 11.5, 20 + stride * 5, isSpitz ? 4.1 : 5.2, 3)
    }
    if (isSpitz) {
      paint('#eee5d7', spitzHead)
      ellipse('#a59ba0', -9, -24, 2.2, 4.3)
      ellipse('#a59ba0', 14, -28, 2.1, 4.2)
      paint('#d7cdd3', fur)
      ellipse('#faf0dc', 0, -1, 15, 14)
      ellipse('#e9dfd8', 5, 9, 11, 7)
      ellipse('#6b737f', 2, -13, 13, 3)
    } else {
      paint('#c08256', corgiHead)
      ellipse('#724637', -11, -32, 3.4, 6)
      ellipse('#724637', 20, -32, 3.2, 6)
      paint('#a36345', corgiBody)
      ellipse('#c58754', -2, 3, 18, 11)
      ellipse('#ebcfaf', 0, -12, 17, 5)
      ellipse('#ba6255', 1, -14, 15, 2.5)
    }
    ctx.save()
    ctx.rotate(Math.sin(step * .48) * .15)
    paint(isSpitz ? '#f8ebd7' : '#96543a', isSpitz ? spitzTail : corgiTail)
    ctx.restore()
    ctx.restore()
  }

  function frame(time: number) {
    ctx.clearRect(0, 0, sceneWidth, sceneHeight)
    const step = time / 138
    const pace = Math.sin(time / 1000) * 5
    const small = { x: 196 + Math.sin(time / 560) * 3, y: 177 - pace + Math.sin(step * 2) * 1.4 }
    const large = { x: 282 + Math.sin(time / 620) * 4, y: 188 - pace + Math.sin(step * 2 + .8) * 1.7 }
    const handY = 231 + Math.sin(step) * 1.8

    dog(small.x, small.y, .78, step, true)
    dog(large.x, large.y, 1.12, step + .75, false)
    drawLeash(228, handY, small.x, small.y - 10, '#9db2a6')
    drawLeash(238, handY + 2, large.x, large.y - 15, '#bf7967')

    ctx.save()
    ctx.translate(227, handY)
    paint('#342d37', glove)
    ellipse('#b48a72', 2, 1, 15, 5)
    ellipse('#d0a88c', 3, -1, 13, 3)
    ellipse('#5b4145', 10, 4, 5, 2)
    ctx.restore()
  }

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let animation = 0
  let startedAt: number | undefined
  function tick(now: number) {
    startedAt ??= now
    frame(now - startedAt)
    animation = requestAnimationFrame(tick)
  }
  function syncMotion() {
    cancelAnimationFrame(animation)
    startedAt = undefined
    frame(0)
    if (!motion.matches) animation = requestAnimationFrame(tick)
  }
  syncMotion()
  motion.addEventListener('change', syncMotion)
  return () => {
    cancelAnimationFrame(animation)
    motion.removeEventListener('change', syncMotion)
  }
}

export default function AutumnDogWalk() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pendingBarks = useRef<number[]>([])
  const { audioRef, play } = useSoundEffect(400)

  useEffect(() => {
    const timers = pendingBarks.current
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [])

  function bark(count: number, interval: number, rate: number) {
    const timers = pendingBarks.current
    timers.forEach(timer => window.clearTimeout(timer))
    timers.length = 0
    if (audioRef.current) audioRef.current.playbackRate = rate
    play()
    for (let index = 1; index < count; index++) {
      timers.push(window.setTimeout(play, index * interval))
    }
  }
  useEffect(() => {
    if (canvas.current) return animateDogWalk(canvas.current)
  }, [])

  return <>
    <canvas className="autumn-dog-walk" width={sceneWidth * 2} height={sceneHeight * 2}
      ref={canvas} role="img" aria-label="두 리드줄 앞에서 걷는 작은 흰 스피츠와 큰 갈색 웰시코기" />
    <audio ref={audioRef} src={barkSound} preload="auto" />
    <button className="autumn-dog-touch autumn-dog-spitz" type="button" aria-label="작은 흰 스피츠"
      onClick={() => bark(4, 330, 1.24)} />
    <button className="autumn-dog-touch autumn-dog-corgi" type="button" aria-label="큰 갈색 웰시코기"
      onClick={() => bark(3, 530, 1)} />
  </>
}
