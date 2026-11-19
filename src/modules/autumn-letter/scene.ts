export const sceneWidth = 480
export const sceneHeight = 270
const lockPileY = 227
const lockPileOffset = 47
const pathWidth = (y: number) => 4 + (y - 164) * 1.51
const walkingPathCenter = (y: number) => 284 - 158 * Math.sin((y - 165) / 105 * 1.42)
export const lockPile = {
  x: walkingPathCenter(lockPileY) + pathWidth(lockPileY) + lockPileOffset,
  y: lockPileY - 6,
}

export function drawScene(canvas: HTMLCanvasElement, canopy: HTMLCanvasElement, walking: boolean) {
  const backgroundContext = canvas.getContext('2d')
  const foliageContext = canopy.getContext('2d')
  if (!backgroundContext || !foliageContext) return
  const background = backgroundContext
  const foliage = foliageContext
  background.setTransform(2, 0, 0, 2, 0, 0)
  foliage.setTransform(2, 0, 0, 2, 0, 0)
  foliage.clearRect(0, 0, sceneWidth, sceneHeight)
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
  let seed = walking ? 94 : 48
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const branch = (color: string, x: number, y: number, endX: number, endY: number, width: number) => {
    const steps = Math.ceil(Math.hypot(endX - x, endY - y))
    for (let step = 0; step <= steps; step++) {
      const t = step / steps
      const thickness = Math.max(1, width * (1 - t * .84))
      block(color, x + (endX - x) * t - thickness / 2, y + (endY - y) * t, thickness, thickness)
    }
  }

  const sky = background.createLinearGradient(0, 0, 0, 170)
  sky.addColorStop(0, walking ? '#5b90be' : '#6f647e')
  sky.addColorStop(.52, walking ? '#8cb9d7' : '#bf8a89')
  sky.addColorStop(1, walking ? '#dddec4' : '#f3bc89')
  background.fillStyle = sky
  background.fillRect(0, 0, sceneWidth, sceneHeight)
  const light = walking ? { x: 331, y: 49, radius: 17 } : { x: 252, y: 88, radius: 27 }
  const glow = background.createRadialGradient(light.x, light.y, 7, light.x, light.y, 82)
  glow.addColorStop(0, walking ? '#fff4ba9c' : '#ffe2a6ab')
  glow.addColorStop(1, '#ffe2a600')
  background.fillStyle = glow
  background.fillRect(0, 0, sceneWidth, 170)
  oval(walking ? '#fff1b5' : '#ffe1ab', light.x, light.y, light.radius, light.radius)

  const ridges = [
    { color: walking ? '#97adba' : '#a5797f', height: 131, scale: 11 },
    { color: walking ? '#85999a' : '#906975', height: 145, scale: 9 },
    { color: walking ? '#778686' : '#785865', height: 159, scale: 6 },
  ]
  ridges.forEach(({ color, height, scale }, i) => {
    for (let x = 0; x < sceneWidth; x++) {
      const y = Math.round(height + Math.sin(x / (31 - i * 5)) * scale + Math.cos(x / 14) * 3)
      block(color, x, y, 1, sceneHeight - y)
    }
  })

  const pathCenter = (y: number) => {
    if (!walking) return 250 + Math.sin((y - 159) / 39) * 32
    return walkingPathCenter(y)
  }

  const ochre = ['#815044', '#ab6547', '#c6804d', '#e1a75d', '#f7c67b']
  const scarlet = ['#603a46', '#90444a', '#b55647', '#d57851', '#ed9a60']
  const distant = ['#78505c', '#935f60', '#a77169', '#bd856e', '#d49a79']
  function tree(x: number, y: number, size: number, colors: string[], wood: string, moving = false) {
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
    const maple = new Path2D('M0 6 L-.6 2 L-4 2 L-6 -.2 L-3.2 .1 L-5 -3 L-2 -2 L-1 -5 L0 -3 L1.6 -7 L2.5 -3 L4.5 -4 L3.9 -1 L6 -1.5 L5 1 L1 2 L.6 6 Z')
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
        ctx.fill(maple)
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

  const distantCount = walking ? 37 : 19
  for (let i = 0; i < distantCount; i++) {
    const x = walking ? i * sceneWidth / distantCount + random() * 10 : i * 27 + random() * 15
    const y = walking ? 165 + random() * 5 : 155 + random() * 7
    const size = walking ? .23 + random() * .2 : .21 + random() * .16
    if (!walking || Math.abs(x - pathCenter(y)) > pathWidth(y) + 14) {
      tree(x, y, size, distant, '#6f4e59')
    }
  }

  block(walking ? '#70524d' : '#60434a', 0, 165, sceneWidth, 105)
  for (let y = 165; y < sceneHeight; y++) {
    const center = pathCenter(y)
    const width = pathWidth(y)
    block('#8d6055', center - width - 3, y, width * 2 + 8, 1)
    block(walking ? '#ccaa82' : y < 195 ? '#b0836d' : '#bb8b72', center - width, y, width * 2, 1)
  }
  for (let i = 0; i < 1150; i++) {
    const x = random() * sceneWidth
    const y = 163 + random() * 107
    const onPath = Math.abs(x - pathCenter(y)) < pathWidth(y)
    const colors = onPath ? ['#ae7e68', '#c79778', '#a87565'] : ['#744850', '#a35b4e', '#bd734f', '#d79558']
    block(colors[i % colors.length], x, y, 1 + random() * (y - 159) / 23, 1)
  }

  if (walking) {
    // Anchor the near trees and leaf piles to the banks of the curved path.
    function bankX(y: number, side: number, offset: number) {
      return pathCenter(y) + side * (pathWidth(y) + offset)
    }

    tree(bankX(172, -1, 92), 172, .55, distant, '#68444b')
    tree(bankX(175, 1, 45), 175, .59, ochre, '#69464a')
    tree(bankX(183, -1, 49), 183, .77, scarlet, '#583941')
    tree(bankX(205, 1, 100), 205, 1.02, scarlet, '#54353e')
    tree(bankX(214, -1, 96), 214, 1.28, ochre, '#432e39', true)
    tree(bankX(231, 1, 203), 231, 1.44, ochre, '#4b3239', true)

    const leafColors = ['#a15343', '#bd633f', '#ce8147', '#de9c57', '#edb969']
    const leafPiles = [
      [182, -1, 23, 10], [190, 1, 16, 13], [202, 1, 51, 15], [210, -1, 13, 17],
      [218, 1, 15, 19], [224, -1, 19, 17], [lockPileY, 1, lockPileOffset, 23], [253, 1, 26, 32],
    ]
    for (const [y, side, offset, width] of leafPiles) {
      const x = bankX(y, side, offset)
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
