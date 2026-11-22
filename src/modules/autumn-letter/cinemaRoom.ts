import { cinemaRoomText } from './text'
export const cinemaScreen = { x: 125, y: 35, width: 230, height: 102 }
export const cinemaExit = { x: 385, y: 101, width: 30, height: 53 }

export function drawCinemaRoom(ctx: CanvasRenderingContext2D, width: number, height: number) {
  function block(color: string | CanvasGradient, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  const wall = ctx.createLinearGradient(0, 0, 0, height)
  wall.addColorStop(0, '#19151f')
  wall.addColorStop(.52, '#30232e')
  wall.addColorStop(1, '#19131d')
  block(wall, 0, 0, width, height)
  for (const x of [36, 60, 84, 388, 412, 436]) {
    block('#271c28', x, 35, 16, 117)
    block('#372735', x + 1, 35, 1, 117)
  }

  block('#45373e', cinemaScreen.x - 4, cinemaScreen.y - 4, cinemaScreen.width + 8, cinemaScreen.height + 8)
  block('#100d14', cinemaScreen.x, cinemaScreen.y, cinemaScreen.width, cinemaScreen.height)
  block('#241822', 112, 144, 256, 10)
  block('#352530', 112, 144, 256, 2)

  const { x, y, width: exitWidth, height: exitHeight } = cinemaExit
  const exitCenter = x + exitWidth / 2
  const exitGlow = ctx.createRadialGradient(exitCenter, y + 8, 3, exitCenter, y + 8, 51)
  exitGlow.addColorStop(0, '#efa85b72')
  exitGlow.addColorStop(1, '#efa85b00')
  block(exitGlow, exitCenter - 51, y - 43, 102, 102)
  block('#5d3b32', x, y + 10, exitWidth, exitHeight - 10)
  block('#251b23', x + 3, y + 13, exitWidth - 6, exitHeight - 13)
  block('#a8643e', x + exitWidth - 4, y + 14, 1, exitHeight - 16)
  block('#c98953', x, y, exitWidth, 9)
  ctx.fillStyle = '#2c2025'
  ctx.font = 'bold 6px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(cinemaRoomText.exitSign, exitCenter, y + 7)

  // The central aisle widens toward the viewer, with small amber lights on each tread.
  ctx.fillStyle = '#211b27'
  ctx.beginPath()
  ctx.moveTo(227, 151)
  ctx.lineTo(253, 151)
  ctx.lineTo(278, height)
  ctx.lineTo(202, height)
  ctx.closePath()
  ctx.fill()
  const rows = [
    { y: 166, pitch: 19, w: 15, h: 14, gap: 24 },
    { y: 187, pitch: 23, w: 19, h: 18, gap: 33 },
    { y: 215, pitch: 27, w: 23, h: 22, gap: 44 },
    { y: 249, pitch: 33, w: 28, h: 27, gap: 56 },
  ]
  for (const { y, pitch, w, h, gap } of rows) {
    const left = (width - gap) / 2
    const right = left + gap
    block('#40303c', left - 3, y + 6, gap + 6, 3)
    block('#c88b59', left - 2, y + 6, 3, 1)
    block('#c88b59', right - 1, y + 6, 3, 1)
    for (let seat = 0; seat < 7; seat++) {
      for (const x of [left - 7 - w - seat * pitch, right + 7 + seat * pitch]) {
        block('#250f1c', x - 2, y - h + 1, w + 4, h + 7)
        block('#6d2337', x, y - h, w, h + 2)
        block('#8d3549', x + 2, y - h, w - 4, 3)
        block('#74273c', x + 2, y - h + 4, w - 4, h - 3)
        block('#401626', x - 2, y - 3, 3, 8)
        block('#401626', x + w - 1, y - 3, 3, 8)
      }
    }
  }
}
