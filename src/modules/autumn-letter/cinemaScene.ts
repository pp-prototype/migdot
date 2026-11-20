export const cinemaFlyer = { x: 336, y: 210 }
export const cinemaElevator = { x: 326, y: 135 }

export function drawCinema(ctx: CanvasRenderingContext2D, width: number, height: number, random: () => number, showFlyer: boolean) {
  function block(color: string | CanvasGradient, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  function shape(color: string, points: [number, number][]) {
    ctx.fillStyle = color
    ctx.beginPath()
    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
    ctx.closePath()
    ctx.fill()
  }

  function car(x: number, y: number, scale: number, paint: string) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    block('#20202d', -3, 28, 85, 5)
    block('#171825', 9, 22, 12, 11)
    block('#171825', 61, 22, 12, 11)
    shape(paint, [[0, 19], [12, 15], [23, 3], [56, 3], [69, 15], [79, 17], [82, 27], [0, 27]])
    shape('#394454', [[19, 14], [26, 6], [39, 6], [39, 14]])
    shape('#455266', [[43, 6], [54, 6], [63, 14], [43, 14]])
    block('#738098', 27, 6, 25, 1)
    block('#f5cf91', 73, 19, 7, 3)
    block('#d97c75', 0, 20, 6, 3)
    block('#282432', 2, 26, 78, 2)
    ctx.restore()
  }

  const sky = ctx.createLinearGradient(0, 0, 0, 155)
  sky.addColorStop(0, '#171a30')
  sky.addColorStop(1, '#54506b')
  block(sky, 0, 0, width, height)
  for (let i = 0; i < 75; i++) {
    block(i % 8 === 0 ? '#e1cfd6' : '#77758e', Math.floor(random() * width), Math.floor(random() * 108), 1, 1)
  }
  for (let x = 0; x < width; x += 12) {
    const top = 126 - Math.floor(random() * 22)
    block('#313042', x, top, 13, 53)
  }

  const pavement = ctx.createLinearGradient(0, 153, 0, height)
  pavement.addColorStop(0, '#51434b')
  pavement.addColorStop(1, '#2c2938')
  block(pavement, 0, 153, width, height - 153)
  for (let i = 0; i < 480; i++) {
    block(i % 2 === 0 ? '#fff2cb0c' : '#17152025',
      Math.floor(random() * width), 159 + Math.floor(random() * 111), 1 + i % 3, 1)
  }
  for (const x of [36, 93, 151, 210, 269, 328, 387, 446]) {
    shape('#968177', [[x, 172], [x + 2, 172], [x + (x - 240) * .28 + 3, 207], [x + (x - 240) * .28, 207]])
  }

  // The yellow facade and unlit rooms sit in shadow around the glass elevator.
  shape('#67562f', [[301, 39], [356, 58], [356, 150], [301, 165]])
  block('#a99044', 141, 39, 160, 126)
  block('#b49b56', 137, 36, 169, 5)
  block('#776436', 141, 71, 160, 3)
  block('#776436', 141, 101, 160, 4)
  for (const y of [49, 79]) {
    for (const x of [152, 181, 210, 239, 268]) {
      block('#625534', x - 1, y - 1, 23, 17)
      block('#303043', x, y, 21, 15)
      block('#494658', x + 10, y, 1, 15)
      block('#8a7847', x - 2, y + 15, 25, 2)
    }
  }
  block('#343342', 150, 110, 151, 51)
  block('#464352', 154, 146, 145, 13)
  block('#252735', 237, 119, 32, 41)
  for (const x of [150, 178, 207, 236, 269, 297]) block('#696045', x, 109, 2, 52)
  block('#8b7842', 138, 161, 163, 4)

  // The lobby glazing continues around the corner, exposing the side of the car and its rails.
  const elevatorGlow = ctx.createRadialGradient(325, 143, 5, 325, 143, 48)
  elevatorGlow.addColorStop(0, '#d4eaff80')
  elevatorGlow.addColorStop(1, '#a4c7ff00')
  block(elevatorGlow, 277, 95, 96, 96)
  shape('#3b475e', [[301, 108], [352, 114], [352, 150], [301, 162]])
  shape('#819bb8', [[309, 111], [344, 116], [344, 150], [309, 157]])
  shape('#c1d6e8', [[314, 115], [338, 119], [338, 148], [314, 153]])
  shape('#edf7ff', [[314, 115], [320, 114], [338, 118], [338, 122], [314, 119]])
  shape('#f7fbffb0', [[315, 140], [331, 119], [336, 120], [315, 146]])
  shape('#93aec9', [[314, 149], [338, 145], [338, 149], [314, 154]])
  block('#e7f3ff', 311, 114, 1, 41)
  block('#748eae', 341, 118, 1, 32)
  block('#4d627c', 327, 118, 1, 33)
  shape('#b8d7ff38', [[306, 163], [339, 154], [365, 171], [318, 184]])

  car(24, 159, .55, '#595d73')
  car(77, 161, .6, '#79617d')
  car(134, 164, .57, '#536a79')
  car(188, 165, .6, '#736768')
  car(245, 163, .59, '#6b7284')
  car(353, 157, .59, '#946366')
  car(407, 162, .6, '#69786e')
  car(55, 198, .95, '#5a6879')
  car(146, 196, .95, '#826568')
  car(235, 188, 1.8, '#5e6f83')
  car(391, 198, .95, '#71677e')

  // Ticket and illustrated flyer rest on the foreground car's hood.
  shape('#302531', [[337, 217], [352, 217], [359, 226], [342, 226]])
  shape('#efc891', [[337, 216], [351, 216], [357, 224], [341, 224]])
  block('#a06765', 342, 219, 9, 1)
  block('#a06765', 345, 222, 7, 1)
  if (!showFlyer) return
  shape('#292333', [[326, 205], [342, 205], [349, 215], [331, 216]])
  shape('#dfa0a1', [[325, 204], [341, 204], [347, 214], [330, 215]])
  shape('#643f60', [[328, 206], [339, 206], [343, 210], [330, 211]])
  block('#ffdfac', 335, 207, 3, 2)
  block('#6b4660', 333, 212, 9, 1)
}
