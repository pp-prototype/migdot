function drawStopper(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, 96, 72)

  const oval = (x: number, y: number, rx: number, ry: number, color: string | CanvasGradient, angle = 0) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2)
    ctx.fill()
  }

  const shape = new Path2D('M9 48 Q7 39 12 31 Q16 26 23 23 Q20 16 26 15 Q31 13 36 18 Q55 11 70 13 Q81 9 86 15 Q89 20 84 26 Q89 37 83 47 Q85 55 79 58 Q74 61 68 56 Q51 63 34 59 Q25 64 21 58 Q11 57 9 48 Z')
  oval(48, 55, 38, 7, '#32242b4d', -.1)
  ctx.save()
  ctx.translate(0, 3)
  ctx.fillStyle = '#a8a09a'
  ctx.fill(shape)
  ctx.restore()

  const glaze = ctx.createRadialGradient(51, 25, 3, 49, 35, 47)
  glaze.addColorStop(0, '#fffefa')
  glaze.addColorStop(.68, '#f1eadf')
  glaze.addColorStop(1, '#c9bdb3')
  ctx.fillStyle = glaze
  ctx.fill(shape)
  ctx.strokeStyle = '#fffaf0'
  ctx.lineWidth = 1.15
  ctx.stroke(shape)

  oval(58, 22, 14, 2.4, '#fffdfab8', -.15)
  oval(28, 22, 3.8, 1.65, '#d9aaa6', .25)
  oval(40, 27, 4.1, 1.5, '#d9aaa6', .44)
  oval(19, 40, 1.45, 1.25, '#554c48')
  oval(34, 43, 1.45, 1.25, '#554c48')
  oval(24.5, 47, 2.15, 1.6, '#bd8986')
  oval(14, 48, 2.8, 1.8, '#dfb5ae', -.25)
  oval(37, 51, 3.2, 1.6, '#dfb5ae', -.12)
  oval(23, 57, 3.8, 1.8, '#d0a4a0', .2)
}

export default function AutumnNoodleStopper() {
  return <canvas className="autumn-noodle-stopper" width={96} height={72} aria-hidden="true"
    ref={canvas => { if (canvas) drawStopper(canvas) }} />
}
