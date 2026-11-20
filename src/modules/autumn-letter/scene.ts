import type { MapId } from './progress'
import { drawCinema } from './cinemaScene'
import { drawCinemaHall } from './cinemaHall'
import { drawCinemaRoom } from './cinemaRoom'

export const sceneWidth = 480
export const sceneHeight = 270
const lakesideLampScale = .83
const lakesideBlinkingLampBase = { x: 193, y: 207 }
export const lakesideBlinkingLamp = {
  x: lakesideBlinkingLampBase.x,
  y: lakesideBlinkingLampBase.y - 37 * lakesideLampScale,
}
const closeupLampBase = { x: 158, y: 228 }
const closeupLampScale = 1.48
const closeupLampHeight = 64
export const lakesideLetter = { x: 268, y: 211 }
export const lakesideCloseupLamp = {
  x: closeupLampBase.x,
  y: closeupLampBase.y - closeupLampHeight * closeupLampScale,
}
export const lakesideSilhouette = {
  x: closeupLampBase.x + 18,
  y: closeupLampBase.y,
}
export const lakesideForegroundTrees = [
  { x: 13, y: 265, size: 1.78, ginkgo: false },
  { x: 486, y: 264, size: 1.71, ginkgo: true },
]
export const dogTrailTrees = [
  [197, 165, .32], [286, 169, .37], [139, 180, .56], [335, 181, .59],
  [88, 198, .76], [382, 201, .84], [59, 229, 1.33], [453, 238, 1.55],
  [3, 260, 2.03], [487, 260, 2.01],
] as const
export const dogTrailLetter = { x: dogTrailTrees[4][0] + 3, y: dogTrailTrees[4][1] - 26 }
const lockPileY = 227
const lockPileOffset = 47
const pathWidth = (y: number) => 4 + (y - 164) * 1.51
const walkingPathCenter = (y: number) => 284 - 158 * Math.sin((y - 165) / 105 * 1.42)
const forestPathCenter = (y: number) => {
  const depth = (y - 165) / 105
  return 158 + 143 * Math.sin(depth * Math.PI) + 23 * depth
}
const sunglassesTree = { y: 184, side: -1, gap: 102, size: .73 }
export const forestSunglasses = {
  x: forestPathCenter(sunglassesTree.y) + sunglassesTree.side * (pathWidth(sunglassesTree.y) * .7 + sunglassesTree.gap)
    + sunglassesTree.size * 31,
  y: sunglassesTree.y - sunglassesTree.size * 105 + 11,
}
const walkingLeafPiles = [
  { y: 182, side: -1, offset: 23, width: 10, shrubId: 'shrub-trail-middle' },
  { y: 190, side: 1, offset: 16, width: 13, shrubId: 'shrub-trail-right' },
  { y: 202, side: 1, offset: 51, width: 15 },
  { y: 210, side: -1, offset: 13, width: 17, shrubId: 'shrub-trail-left', lift: 26 },
  { y: 218, side: 1, offset: 15, width: 19 },
  { y: 224, side: -1, offset: 19, width: 17 },
  { y: lockPileY, side: 1, offset: lockPileOffset, width: 23 },
  { y: 253, side: 1, offset: 26, width: 32 },
]
export const shrubPuzzlePiles = walkingLeafPiles.flatMap(({ shrubId, y, side, offset, width, lift = 0 }) =>
  shrubId ? [{ id: shrubId, x: walkingPathCenter(y) + side * (pathWidth(y) + offset), y: y - lift - width * .24, width }] : [])
export const shrubPuzzleTree = { x: walkingPathCenter(205) + pathWidth(205) + 100, y: 205 }
export const lockPile = {
  x: walkingPathCenter(lockPileY) + pathWidth(lockPileY) + lockPileOffset,
  y: lockPileY - 6,
}

function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function drawLakeSky(ctx: CanvasRenderingContext2D, closeup: boolean, random: () => number, height: number, exposure = 5) {
  const sky = ctx.createLinearGradient(0, 0, 0, 170)
  sky.addColorStop(0, '#10162d')
  sky.addColorStop(.52, '#242c49')
  sky.addColorStop(1, '#4a4260')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, sceneWidth, height)
  const density = [0, 8, 22, 43, 69, 100][exposure]
  for (let i = 0; i < (closeup ? 315 : 235); i++) {
    const x = Math.round(random() * sceneWidth)
    const y = Math.round(6 + random() * (closeup ? 140 : 126))
    if ((i * 37) % 100 >= density) continue
    if (i % 23 === 0) {
      ctx.fillStyle = '#7783a2'
      ctx.fillRect(x - 1, y, 3, 1)
      ctx.fillRect(x, y - 1, 1, 3)
    }
    ctx.fillStyle = i % 23 === 0 ? '#fff4d9' : i % 9 === 0 ? '#faf1d2' : i % 3 === 0 ? '#aab2c9' : '#68748d'
    ctx.fillRect(x, y, 1, 1)
  }
}

export function drawLakeCameraSky(canvas: HTMLCanvasElement, exposure: number) {
  const ctx = canvas.getContext('2d')
  if (ctx) drawLakeSky(ctx, true, seededRandom(514), canvas.height, exposure)
}

export function drawScene(canvas: HTMLCanvasElement, canopy: HTMLCanvasElement, map: MapId, showPickup: boolean, puzzleTree: HTMLCanvasElement | null) {
  const walking = map !== 'first-trail'
  const forest = map === 'third-trail'
  const closeup = map === 'lakeside-bench'
  const dogTrail = map === 'fifth-trail'
  const lakeside = map === 'fourth-trail' || closeup
  const backgroundContext = canvas.getContext('2d')
  const foliageContext = canopy.getContext('2d')
  if (!backgroundContext || !foliageContext) return
  const background = backgroundContext
  const foliage = foliageContext
  background.setTransform(2, 0, 0, 2, 0, 0)
  foliage.setTransform(2, 0, 0, 2, 0, 0)
  foliage.clearRect(0, 0, sceneWidth, sceneHeight)
  if (map === 'sixth-trail') {
    drawCinema(background, sceneWidth, sceneHeight, seededRandom(631), showPickup)
    return
  }
  if (map === 'cinema-hall') {
    drawCinemaHall(background, sceneWidth, sceneHeight)
    return
  }
  if (map === 'cinema-room') {
    drawCinemaRoom(background, sceneWidth, sceneHeight)
    return
  }
  let ctx = background

  const block = (color: string, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
  }
  const oval = (color: string, x: number, y: number, rx: number, ry: number) => {
    for (let row = -Math.floor(ry); row <= Math.floor(ry); row++) {
      const half = Math.round(rx * Math.sqrt(1 - (row / ry) ** 2))
      block(color, x - half, y + row, half * 2 + 1, 1)
    }
  }
  const random = seededRandom(dogTrail ? 819 : closeup ? 514 : lakeside ? 511 : forest ? 173 : walking ? 94 : 48)
  const branch = (color: string, x: number, y: number, endX: number, endY: number, width: number) => {
    const steps = Math.ceil(Math.hypot(endX - x, endY - y))
    for (let step = 0; step <= steps; step++) {
      const t = step / steps
      const thickness = Math.max(1, width * (1 - t * .84))
      block(color, x + (endX - x) * t - thickness / 2, y + (endY - y) * t, thickness, thickness)
    }
  }

  if (lakeside) {
    drawLakeSky(background, closeup, random, sceneHeight)
  } else {
    const sky = background.createLinearGradient(0, 0, 0, 170)
    sky.addColorStop(0, dogTrail ? '#171a32' : forest ? '#363944' : walking ? '#5b90be' : '#6f647e')
    sky.addColorStop(.52, dogTrail ? '#252840' : forest ? '#5f626d' : walking ? '#8cb9d7' : '#bf8a89')
    sky.addColorStop(1, dogTrail ? '#413647' : forest ? '#8b7b77' : walking ? '#dddec4' : '#f3bc89')
    background.fillStyle = sky
    background.fillRect(0, 0, sceneWidth, sceneHeight)
    if (dogTrail) {
      const moonX = 257
      const moonY = 48
      const glow = background.createRadialGradient(moonX, moonY, 9, moonX, moonY, 57)
      glow.addColorStop(0, '#d1d9f477')
      glow.addColorStop(1, '#d1d9f400')
      background.fillStyle = glow
      background.fillRect(moonX - 57, moonY - 57, 114, 114)
      oval('#e5def0', moonX, moonY, 17, 17)
      oval('#c7c0d7', moonX - 5, moonY + 4, 5, 3)
      oval('#cbc4dc', moonX + 5, moonY - 4, 4, 2)
    } else if (!forest) {
      const light = walking ? { x: 331, y: 49, radius: 17 } : { x: 252, y: 88, radius: 27 }
      const glow = background.createRadialGradient(light.x, light.y, 7, light.x, light.y, 82)
      glow.addColorStop(0, walking ? '#fff4ba9c' : '#ffe2a6ab')
      glow.addColorStop(1, '#ffe2a600')
      background.fillStyle = glow
      background.fillRect(0, 0, sceneWidth, 170)
      oval(walking ? '#fff1b5' : '#ffe1ab', light.x, light.y, light.radius, light.radius)
    }
  }

  const ridges = [
    { color: dogTrail ? '#292637' : lakeside ? '#333a53' : forest ? '#646170' : walking ? '#97adba' : '#a5797f', height: 131, scale: 11 },
    { color: dogTrail ? '#232231' : lakeside ? '#2a3349' : forest ? '#57545e' : walking ? '#85999a' : '#906975', height: 145, scale: 9 },
    { color: dogTrail ? '#1d1d2c' : lakeside ? '#242d40' : forest ? '#4f454e' : walking ? '#778686' : '#785865', height: 159, scale: 6 },
  ]
  ridges.forEach(({ color, height, scale }, i) => {
    for (let x = 0; x < sceneWidth; x++) {
      const y = Math.round(height + Math.sin(x / (31 - i * 5)) * scale + Math.cos(x / 14) * 3)
      block(color, x, y, 1, sceneHeight - y)
    }
  })

  const pathCenter = (y: number) => {
    if (forest) return forestPathCenter(y)
    if (!walking) return 250 + Math.sin((y - 159) / 39) * 32
    return walkingPathCenter(y)
  }

  const trailWidth = (y: number) => pathWidth(y) * (forest ? .7 : 1)
  const crimson = ['#4a2c37', '#68363c', '#873f3e', '#a95342', '#c67250']
  const copper = ['#49343d', '#704439', '#90563e', '#ab6b45', '#c78f57']
  const ochre = ['#815044', '#ab6547', '#c6804d', '#e1a75d', '#f7c67b']
  const scarlet = ['#603a46', '#90444a', '#b55647', '#d57851', '#ed9a60']
  const distant = ['#78505c', '#935f60', '#a77169', '#bd856e', '#d49a79']
  function tree(x: number, y: number, size: number, colors: string[], wood: string, moving = false, ginkgo = false) {
    const crownY = y - 86 * size
    oval('#50383f', x + 7 * size, y + 2, 19 * size, Math.max(1, 3 * size))
    if (walking && size >= .55) {
      branch(wood, x, y - 4 * size, x - 14 * size, y + 3 * size, 7 * size)
      branch(wood, x, y - 4 * size, x + 17 * size, y + 3 * size, 8 * size)
    }
    branch(wood, x, y, x + 5 * size, crownY, 12 * size)
    branch(colors[0], x + 3 * size, y - 5, x + 7 * size, crownY + 8 * size, 3 * size)
    const arms = [[-47, 11], [-31, -11], [-14, -26], [7, -31], [30, -19], [53, 0]]
    for (const [dx, dy] of arms) {
      const tipX = x + dx * size
      const tipY = crownY + dy * size
      const elbowX = x + dx * size * .5
      const elbowY = tipY + 16 * size
      branch(wood, x + 4 * size, crownY + 36 * size, elbowX, elbowY, 8 * size)
      branch(wood, elbowX, elbowY, tipX, tipY, 4 * size)
      branch(wood, elbowX, elbowY, tipX + 11 * size, tipY - 11 * size, 2 * size)
    }
    if (moving) ctx = foliage
    const leafShape = new Path2D(ginkgo ? 'M0 6 L-.4 1 Q-6 0 -5 -5 Q-2 -6 0 -4 Q2 -6 5 -5 Q6 0 .5 1 L.5 6 Z' : 'M0 6 L-.6 2 L-4 2 L-6 -.2 L-3.2 .1 L-5 -3 L-2 -2 L-1 -5 L0 -3 L1.6 -7 L2.5 -3 L4.5 -4 L3.9 -1 L6 -1.5 L5 1 L1 2 L.6 6 Z')
    for (const [dx, dy] of arms) {
      const tipX = x + dx * size
      const tipY = crownY + dy * size
      for (let i = 0; i < 150; i++) {
        const angle = random() * Math.PI * 2
        const radius = Math.sqrt(random())
        const ox = Math.cos(angle) * radius * 24 * size
        const oy = Math.sin(angle) * radius * 13 * size
        const leafSize = (.23 + random() * .42) * size
        ctx.save()
        ctx.translate(tipX + ox, tipY + oy)
        ctx.rotate((random() - .5) * 2.7)
        ctx.scale(leafSize, leafSize)
        ctx.fillStyle = colors[Math.max(0, Math.min(4, Math.floor(random() * 4 + (oy < 0 ? 1 : 0))))]
        ctx.fill(leafShape)
        if (i % 12 === 0 && size > 1) {
          ctx.strokeStyle = '#f6be77a0'
          ctx.lineWidth = .5
          ctx.stroke(new Path2D('M0 4 L1.6 -5 M.5 1 L-3 -1 M.5 1 L4 -1'))
        }
        ctx.restore()
      }
    }
    ctx = background
  }

  function drawBench(x: number, y: number, scale: number, hasLetter = false) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    oval('#382d39', 0, 1, 17, 3)
    block('#292431', -11, -14, 2, 14)
    block('#292431', 9, -14, 2, 14)
    block('#bd9573', -13, -16, 26, 3)
    block('#9c765d', -13, -12, 26, 3)
    block('#c7a17d', -15, -8, 30, 3)
    block('#705448', -15, -5, 30, 2)
    if (hasLetter) {
      ctx.save()
      ctx.translate(0, -8)
      ctx.rotate(-.18)
      ctx.scale(.78, .49)
      block('#694d46', -7, -3, 14, 7)
      block('#ebd5aa', -7, -4, 14, 7)
      branch('#b89b79', -6, -4, 0, 0, 1)
      branch('#b89b79', 6, -4, 0, 0, 1)
      oval('#8e434b', 0, 0, 1.5, 1.5)
      ctx.restore()
    }
    ctx.restore()
  }

  function drawLamp(x: number, y: number, scale: number, flickers: boolean, height = 37) {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale, scale)
    if (!flickers) {
      const halo = ctx.createRadialGradient(0, -37, 3, 0, -37, 24)
      halo.addColorStop(0, '#ffd68f9e')
      halo.addColorStop(1, '#ffd68f00')
      ctx.fillStyle = halo
      ctx.fillRect(-24, -61, 48, 48)
    }
    oval('#695557', 0, 0, 9, 2)
    block('#302b37', -1, -height + 3, 3, height - 3)
    block('#63505a', -1, -height + 5, 1, height - 8)
    ctx.translate(0, 37 - height)
    block(flickers ? '#775841' : '#e5ad6b', -4, -40, 8, 8)
    block(flickers ? '#9d7856' : '#ffe4a4', -2, -39, 4, 6)
    block('#473745', -5, -42, 10, 2)
    block('#473745', -3, -44, 6, 2)
    ctx.restore()
  }

  if (dogTrail) {
    block('#30252c', 0, 155, sceneWidth, 115)
    const roadCenter = (y: number) => 241 + Math.sin((y - 155) / 94) * 12
    const roadWidth = (y: number) => 6 + (y - 154) * 1.96
    for (let y = 155; y < sceneHeight; y++) {
      const center = roadCenter(y)
      const width = roadWidth(y)
      block('#6b473d', center - width - 5, y, width * 2 + 10, 1)
      block(y < 180 ? '#5d4b48' : '#7e6053', center - width, y, width * 2, 1)
    }
    for (let i = 0; i < 1200; i++) {
      const x = random() * sceneWidth
      const y = 158 + random() * 112
      const onRoad = Math.abs(x - roadCenter(y)) < roadWidth(y)
      const colors = onRoad ? ['#6d514a', '#936755', '#6b5150'] : ['#58343a', '#9a4739', '#b47046', '#764047']
      block(colors[i % colors.length], x, y, 1 + random() * (y - 155) / 25, 1)
    }
    const lamps = [
      [222, 161, .32], [271, 171, .49], [179, 181, .62],
      [339, 200, .85], [120, 220, 1.14], [416, 237, 1.38],
    ]
    dogTrailTrees.forEach(([x, y, size], index) => {
      tree(x, y, size, index % 3 ? crimson : copper, '#281c28', size > 1.5)
    })
    for (const [x, y, size] of lamps) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(size, size)
      oval('#b7895b4b', 0, 1, 33, 8)
      ctx.restore()
      drawLamp(x, y, size, false)
    }
    if (showPickup) {
      ctx.save()
      ctx.translate(dogTrailLetter.x, dogTrailLetter.y)
      ctx.rotate(-.16)
      block('#3a2930', -7, -3, 15, 10)
      block('#dcc196', -7, -5, 14, 9)
      branch('#9b7963', -6, -4, 0, 0, 1)
      branch('#9b7963', 6, -4, 0, 0, 1)
      oval('#813c48', 0, 0, 1.5, 1.5)
      ctx.restore()
    }
    return
  }

  if (closeup) {
    const water = background.createLinearGradient(0, 155, 0, 210)
    water.addColorStop(0, '#202b44')
    water.addColorStop(1, '#445971')
    background.fillStyle = water
    background.fillRect(0, 155, sceneWidth, 57)
    for (let i = 0; i < 190; i++) {
      const x = random() * sceneWidth
      const y = 157 + random() * 53
      block(i % 5 ? '#455a72' : '#677c90', x, y, 2 + random() * (y - 152) / 3, 1)
    }
    for (let x = 0; x < sceneWidth; x++) {
      const edge = 208 + Math.sin(x / 104) * 4
      block('#7b7d87', x, edge, 1, 2)
      block('#4c444e', x, edge + 2, 1, sceneHeight - edge)
    }
    for (let y = 232; y < sceneHeight; y++) {
      block(y % 6 === 0 ? '#746772' : '#7d7079', 0, y, sceneWidth, 1)
    }
    ctx = foliage
    drawBench(lakesideLetter.x, 230, 2.35, showPickup)
    drawLamp(closeupLampBase.x, closeupLampBase.y, closeupLampScale, true, closeupLampHeight)
    return
  }

  if (lakeside) {
    const shoreline = (x: number) => 195 + Math.sin(x / 103) * 8 + Math.sin(x / 38) * 2
    const water = background.createLinearGradient(0, 157, 0, 211)
    water.addColorStop(0, '#232e47')
    water.addColorStop(1, '#3c5169')
    background.fillStyle = water
    background.fillRect(0, 157, sceneWidth, 60)
    for (let i = 0; i < 250; i++) {
      const x = random() * sceneWidth
      const y = 159 + random() * 52
      if (y < shoreline(x)) {
        block(i % 4 === 0 ? '#65778b' : '#485e76', x, y, 2 + random() * (y - 152) / 3, 1)
      }
    }
    for (let x = 0; x < sceneWidth; x++) {
      const y = shoreline(x)
      block('#77808b', x, y, 1, 2)
      block('#4a424b', x, y + 2, 1, sceneHeight - y)
    }
    for (let y = 212; y < sceneHeight; y++) {
      const width = 30 + (y - 212) * 1.65
      const center = 241 + (y - 212) * .48
      block('#635461', center - width - 3, y, width * 2 + 6, 1)
      block('#81737b', center - width, y, width * 2, 1)
    }
    for (let i = 0; i < 425; i++) {
      const x = random() * sceneWidth
      const y = 207 + random() * 63
      block(i % 3 === 0 ? '#9f754d' : '#554a54', x, y, 1 + random() * 3, 1)
    }

    const ginkgoGold = ['#47333e', '#64503e', '#806442', '#a28650', '#b9a265']
    // Keep a clearing around the benches and lamps, with denser groves at its edges.
    const banks = [
      { y: 156, left: [1, 15, 31, 48, 63, 79], right: [404, 419, 437, 451, 466, 480], size: .23 },
      { y: 207, left: [3, 19, 33, 49, 65, 80], right: [419, 435, 452, 467, 482], size: .36 },
      { y: 226, left: [6, 23, 40, 58, 73], right: [432, 447, 462, 477], size: .48 },
      { y: 245, left: [2, 23, 48, 70], right: [436, 451, 470, 483], size: .59 },
    ]
    for (const { y, left, right, size } of banks) {
      for (const [index, x] of [...left, ...right].entries()) {
        const ginkgo = index % 3 === 1
        tree(x, y + random() * 3, size + random() * .12, ginkgo ? ginkgoGold : crimson, '#302634', false, ginkgo)
      }
    }
    tree(46, 251, 1.12, crimson, '#312533')
    tree(453, 248, 1.08, ginkgoGold, '#352933', false, true)
    for (const { x, y, size, ginkgo } of lakesideForegroundTrees) {
      tree(x, y, size, ginkgo ? ginkgoGold : crimson, ginkgo ? '#352933' : '#312533', true, ginkgo)
    }

    for (const [x, y] of [[143, 208], [331, 207], [395, 214]]) {
      drawBench(x, y, .79)
    }
    for (const [x, y] of [[110, 207], [lakesideBlinkingLampBase.x, lakesideBlinkingLampBase.y], [366, 211]]) {
      drawLamp(x, y, lakesideLampScale, x === lakesideBlinkingLampBase.x)
    }
    return
  }

  const distantCount = forest ? 57 : walking ? 37 : 19
  for (let i = 0; i < distantCount; i++) {
    const x = walking ? i * sceneWidth / distantCount + random() * 10 : i * 27 + random() * 15
    const y = walking ? 165 + random() * 5 : 155 + random() * 7
    const size = walking ? .23 + random() * .2 : .21 + random() * .16
    if (!walking || Math.abs(x - pathCenter(y)) > trailWidth(y) + 14) {
      tree(x, y, size, forest ? copper : distant, forest ? '#44343e' : '#6f4e59')
    }
  }

  block(forest ? '#43343b' : walking ? '#70524d' : '#60434a', 0, 165, sceneWidth, 105)
  for (let y = 165; y < sceneHeight; y++) {
    const center = pathCenter(y)
    const width = trailWidth(y)
    block(forest ? '#63463e' : '#8d6055', center - width - 3, y, width * 2 + 8, 1)
    block(forest ? '#9c795c' : walking ? '#ccaa82' : y < 195 ? '#b0836d' : '#bb8b72', center - width, y, width * 2, 1)
  }
  for (let i = 0; i < 1150; i++) {
    const x = random() * sceneWidth
    const y = 163 + random() * 107
    const onPath = Math.abs(x - pathCenter(y)) < trailWidth(y)
    const colors = onPath ? ['#ae7e68', '#c79778', '#a87565'] : ['#744850', '#a35b4e', '#bd734f', '#d79558']
    const color = forest ? (onPath ? ['#8d6a53', '#a38165'] : copper)[i % (onPath ? 2 : copper.length)] : colors[i % colors.length]
    block(color, x, y, 1 + random() * (y - 159) / 23, 1)
  }

  if (forest) {
    const grove = [
      [169, -1, 29, .46], [171, 1, 42, .52], [174, -1, 77, .67],
      [180, 1, 63, .62], [sunglassesTree.y, sunglassesTree.side, sunglassesTree.gap, sunglassesTree.size], [189, 1, 104, .79],
      [196, -1, 54, .81], [200, -1, 147, 1.02], [207, 1, 45, .93],
      [214, -1, 92, 1.07], [224, -1, 155, 1.25], [231, 1, 86, 1.16],
      [244, -1, 88, 1.35], [252, 1, 168, 1.42],
    ]
    for (const [index, [y, side, gap, size]] of grove.entries()) {
      const x = pathCenter(y) + side * (trailWidth(y) + gap)
      tree(x, y, size, index % 3 ? crimson : copper, '#382830', size > 1.1)
      if (index === 6) {
        // A mirrored seven cut into the exposed side of the trunk.
        const cut = new Path2D('M-3 0 H3 L-1 7')
        background.save()
        background.translate(x + 2, y - 29)
        background.scale(-1, 1)
        background.strokeStyle = '#735240'
        background.lineWidth = 2.2
        background.stroke(cut)
        background.translate(.35, -.3)
        background.strokeStyle = '#c79b72'
        background.lineWidth = .85
        background.stroke(cut)
        background.restore()
      }
    }
  } else if (walking) {
    // Anchor the near trees and leaf piles to the banks of the curved path.
    function bankX(y: number, side: number, offset: number) {
      return pathCenter(y) + side * (trailWidth(y) + offset)
    }

    tree(bankX(172, -1, 92), 172, .55, distant, '#68444b')
    tree(bankX(175, 1, 45), 175, .59, ochre, '#69464a')
    tree(bankX(183, -1, 49), 183, .77, scarlet, '#583941')
    const puzzleTreeContext = puzzleTree?.getContext('2d')
    if (puzzleTreeContext) {
      puzzleTreeContext.setTransform(2, 0, 0, 2, 0, 0)
      puzzleTreeContext.clearRect(0, 0, sceneWidth, sceneHeight)
      ctx = puzzleTreeContext
    }
    tree(shrubPuzzleTree.x, shrubPuzzleTree.y, 1.02, scarlet, '#54353e')
    tree(bankX(214, -1, 96), 214, 1.28, ochre, '#432e39', true)
    tree(bankX(231, 1, 203), 231, 1.44, ochre, '#4b3239', true)

    const leafColors = ['#a15343', '#bd633f', '#ce8147', '#de9c57', '#edb969']
    for (const { y: bankY, side, offset, width, lift = 0 } of walkingLeafPiles) {
      const x = bankX(bankY, side, offset)
      const y = bankY - lift
      oval('#593d3f', x + width * .12, y + 2, width, width * .19)
      oval('#83463d', x, y - width * .14, width * .89, width * .33)
      oval('#b96e45', x - width * .08, y - width * .28, width * .72, width * .34)
      for (let i = 0; i < width * 4; i++) {
        const dx = (random() * 2 - 1) * width * .88
        const height = Math.sqrt(1 - (dx / width) ** 2) * width * .64
        const dy = 1 - random() * height
        block(leafColors[i % leafColors.length], x + dx, y + dy, 1 + random() * width * .14, 1 + random() * 2)
      }
    }
  } else {
    tree(123, 176, .63, distant, '#68444b')
    tree(361, 177, .69, ochre, '#69464a')
    tree(81, 188, .91, ochre, '#583941')
    tree(415, 199, 1.08, scarlet, '#54353e')
    tree(19, 220, 1.45, scarlet, '#432e39', true)
    tree(485, 225, 1.52, ochre, '#4b3239', true)
  }
}

export const sprites = {
  leaf: ['.yyyy.', 'yyyyyy', '.yyyy.', '..yy..', '..y...'],
  lamp: ['..ppp..', '.ppppp.', '.pgggp.', '.pgggp.', '.ppppp.', '...p...', '...p...', '...p...', '...p...', '...p...', '...p...', '..ppp..'],
  bird: ['.....pp.', '....ppsy', '.pppppp.', '..pprpp.', '...ppp..', '...y.y..'],
}

export function drawSprite(canvas: HTMLCanvasElement, sprite: keyof typeof sprites) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const palette: Record<string, string> = {
    h: '#3d292d', s: '#f4b58a', r: '#b34d43', p: '#39272f', e: '#ffe2ae', y: '#ffd171', g: '#b99570',
  }
  sprites[sprite].forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === '.') return
    ctx.fillStyle = palette[pixel]
    ctx.fillRect(x, y, 1, 1)
  }))
}

export function drawPerson(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const fill = (color: string | CanvasGradient, outline: string) => {
    ctx.fillStyle = color
    ctx.fill(new Path2D(outline))
  }
  const coat = ctx.createLinearGradient(39, 100, 128, 230)
  coat.addColorStop(0, '#a87053')
  coat.addColorStop(.4, '#785043')
  coat.addColorStop(1, '#46333b')

  fill('#302634', 'M62 199 L125 196 L119 266 L117 320 L98 322 L87 234 L79 271 L69 321 L49 321 Z')
  fill('#50414a', 'M65 207 L84 226 L70 302 L57 312 Z M99 226 L117 215 L111 303 L104 312 Z')
  fill('#251f29', 'M50 309 L70 313 L69 330 L34 330 Q32 320 50 317 Z M99 312 L118 309 L121 321 L134 325 L134 331 L97 331 Z')
  fill(coat, 'M75 83 L105 83 L141 103 L151 162 L139 206 L114 200 L126 237 Q86 248 47 234 L53 177 L43 199 L27 192 L25 141 L35 102 Z')
  fill('#523642', 'M51 115 L61 160 L52 224 L47 234 L53 177 L42 197 L29 191 L37 175 Z M120 106 L141 111 L151 161 L139 206 L116 197 L125 172 Z')
  fill('#d29971', 'M72 66 L103 64 L102 90 L84 102 L73 87 Z')
  fill('#ce936c', 'M66 44 Q66 21 87 18 Q113 18 116 45 L114 59 L119 67 L111 70 Q106 87 94 88 Q79 86 72 73 Q62 71 64 61 Z')
  fill('#edb587', 'M89 37 L108 37 L114 59 L119 67 L109 69 L104 81 Q92 83 86 69 Z')
  fill('#302633', 'M64 62 Q51 46 60 30 Q65 7 90 9 Q109 7 120 28 L118 39 Q108 37 103 29 Q90 40 76 43 L72 62 L67 62 Z')
  fill('#59404a', 'M60 37 Q68 12 94 14 Q107 14 114 26 Q99 19 83 29 Q70 37 60 37 Z')
  fill('#49343b', 'M75 58 Q80 67 88 69 L99 67 L109 65 L114 69 L110 80 Q106 89 95 91 Q82 88 76 78 Z')
  fill('#664749', 'M82 72 L95 76 L107 71 L110 74 Q103 85 94 87 Q86 84 82 72 Z')
  fill('#302833', 'M97 70 L107 66 L114 69 L112 73 L105 71 L100 74 Z')
  fill('#c99171', 'M101 74 L111 73 L108 77 L102 78 Z')
  ctx.strokeStyle = '#332b38'
  ctx.lineWidth = 2.6
  ctx.stroke(new Path2D('M74 52 L89 51 L102 50 L114 49 L115 55 Q114 61 108 61 L103 60 L101 53 M89 51 L90 58 Q94 64 101 59'))
  fill('#412d36', 'M106 54 L110 54 L110 57 L106 57 Z')
  fill('#9a433f', 'M70 82 Q88 90 105 77 L113 90 L105 105 Q83 109 66 96 Z')
  fill('#c2634d', 'M67 93 Q83 101 108 91 L106 98 Q82 111 68 101 Z')
  fill('#ab5546', 'M69 92 Q49 97 28 87 L14 90 L30 99 Q55 112 75 102 Z')
  fill('#c99a76', 'M35 187 L48 191 L48 205 Q40 214 34 206 L31 199 Z M112 142 Q123 137 130 149 L128 170 L114 170 L108 157 Z')
  fill('#eac99a', 'M73 125 L122 127 L120 164 L71 162 Z')
  fill('#c99870', 'M73 125 L97 146 L122 127 L96 151 Z')
  fill('#9c483e', 'M95 144 Q102 143 103 149 Q103 154 98 154 Q92 153 92 149 Z')
  fill('#e6b38a', 'M116 151 L130 154 L127 166 L116 168 Q108 163 116 151 Z')
}
