import { useEffect, useRef } from 'react'

type Point = [number, number, number]
type Armor = { center: Point; size: Point; paint: string; phase: number; entry: Point }
const frame = '#364b57'
const ivory = '#d6dfdc'
const orange = '#ff9551'
const teal = '#58ebd3'
const parts: Armor[] = []
const add = (center: Point, size: Point, paint: string, phase: number, entry: Point = [0, -3, 0]) => {
  parts.push({ center, size, paint, phase, entry })
}

add([0, 1.15, 0], [1.72, 1.55, 1.1], frame, 0)
add([0, .22, 0], [1.77, .42, .92], '#768a91', 0)
add([0, 1.24, .6], [.75, .83, .27], '#263945', 0)
add([0, 1.29, .77], [.31, .31, .12], teal, 4)
add([0, 2.06, 0], [.38, .51, .53], frame, 0)
add([0, 2.42, .02], [.60, .46, .58], '#637983', 0)
add([0, 2.47, .35], [.41, .08, .09], '#d99150', 0)
add([0, 2.48, .02], [.85, .67, .77], ivory, 1)
add([0, 2.52, .43], [.6, .21, .13], '#203537', 1)
add([0, 2.54, .5], [.46, .09, .07], teal, 4)
add([0, 2.86, -.05], [.24, .17, .53], orange, 1)
for (const side of [-1, 1]) {
  add([side * .48, -.58, 0], [.30, 1.36, .39], '#426170', 0)
  add([side * .49, -1.61, .05], [.42, .63, .56], '#45616e', 0)
  add([side * .51, -1.99, .22], [.51, .22, .79], '#526d79', 0)
  add([side * 1.02, 1.15, 0], [.30, .55, .41], '#4a6570', 0)
  add([side * 1.18, .67, .03], [.26, .62, .40], '#5d7380', 0)
  const inward: Point = [side * 2.6, .2, -.12]
  add([side * .53, -.42, 0], [.54, 1.05, .65], frame, 2, [side * .3, 2.2, .1])
  add([side * .59, -1.37, .03], [.73, 1.03, .88], ivory, 2, [side * .3, 2.2, .1])
  add([side * .59, -1.24, .51], [.61, .38, .15], '#738c9a', 2)
  add([side * .61, -1.95, .29], [.83, .27, 1.22], '#405965', 2, [side * .3, 2.2, .1])
  add([side * .61, -1.87, .93], [.62, .13, .08], orange, 2)
  add([side * 1.26, 1.43, 0], [.81, .65, 1.03], ivory, 3, inward)
  add([side * 1.49, 1.5, .13], [.57, .43, .95], orange, 3, inward)
  add([side * 1.35, .85, .02], [.41, .58, .64], frame, 3, inward)
  add([side * 1.48, .25, .15], [.58, .69, .83], '#688899', 3, inward)
  add([side * 1.49, .36, .61], [.4, .42, .15], ivory, 3, inward)
  add([side * 1.48, -.16, .2], [.4, .27, .50], frame, 3, inward)
  add([side * .55, 1.41, .61], [.51, .72, .27], ivory, 4, [side * .9, -.18, 1.6])
  add([side * .54, 1.55, .79], [.45, .12, .08], orange, 4, [side * .9, -.18, 1.6])
  add([side * .67, 1.29, -.66], [.46, 1.4, .43], '#61818b', 5, inward)
  add([side * .67, .62, -.66], [.28, .15, .33], teal, 5, inward)
}

const sides = [
  { vertices: [0, 1, 2, 3], axis: [0, 0, -1], light: .57 },
  { vertices: [4, 7, 6, 5], axis: [0, 0, 1], light: .94 },
  { vertices: [0, 4, 5, 1], axis: [0, -1, 0], light: .45 },
  { vertices: [3, 2, 6, 7], axis: [0, 1, 0], light: 1.14 },
  { vertices: [0, 3, 7, 4], axis: [-1, 0, 0], light: .62 },
  { vertices: [1, 5, 6, 2], axis: [1, 0, 0], light: .73 },
]

const shade = (paint: string, light: number) => {
  const rgb = [1, 3, 5].map(index => Math.min(255, Math.round(Number.parseInt(paint.slice(index, index + 2), 16) * light)))
  return `rgb(${rgb.join(',')})`
}
const clamp = (value: number) => Math.min(1, Math.max(0, value))

function render(context: CanvasRenderingContext2D, width: number, height: number, progress: number, lift: number) {
  context.clearRect(0, 0, width, height)
  const yaw = .42 - lift * .22
  const pitch = .23
  const scale = Math.min(width / 7.4, height / 6.4) * (1 - lift * .14)
  const transform = ([x, y, z]: Point): Point => {
    const side = x * Math.cos(yaw) - z * Math.sin(yaw)
    const depth = x * Math.sin(yaw) + z * Math.cos(yaw)
    return [side, y * Math.cos(pitch) - depth * Math.sin(pitch), y * Math.sin(pitch) + depth * Math.cos(pitch)]
  }

  const faces = parts.flatMap(({ center, size, paint, phase, entry }) => {
    const locked = phase === 0 ? 1 : clamp(progress - phase + 1)
    const displacement = (1 - locked) ** 2
    const vertices: Point[] = [
      [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1], [-1,-1,1], [1,-1,1], [1,1,1], [-1,1,1],
    ]
    const corners = vertices.map(vertex => transform(vertex.map((value, axis) => center[axis] + size[axis] * value / 2 + entry[axis] * displacement) as Point))
    return sides.filter(side => transform(side.axis as Point)[2] > 0).map(side => {
      const points = side.vertices.map(index => corners[index])
      return { points, depth: points.reduce((total, point) => total + point[2], 0) / 4, fill: shade(paint, side.light), opacity: .18 + locked * .82 }
    })
  }).sort((a, b) => a.depth - b.depth)

  context.lineJoin = 'round'
  context.lineWidth = 1
  for (const face of faces) {
    context.globalAlpha = face.opacity
    context.beginPath()
    face.points.forEach(([x, y, z], index) => {
      const perspective = 1 + z * .037
      const px = width / 2 + x * scale * perspective
      const py = height * .56 - (y + lift * .75) * scale * perspective
      if (index) context.lineTo(px, py)
      else context.moveTo(px, py)
    })
    context.closePath()
    context.fillStyle = face.fill
    context.fill()
    context.strokeStyle = '#13212b'
    context.stroke()
  }
  context.globalAlpha = 1
}

export default function MechaModel({ progress, launched, className }: { progress: number; launched: boolean; className: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pose = useRef({ progress: 0, lift: 0 })
  useEffect(() => {
    const node = canvas.current
    const context = node?.getContext('2d')
    if (!node || !context) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const from = { ...pose.current }
    const start = performance.now()
    let frameId = 0
    const draw = (time: number) => {
      const t = reduced.matches ? 1 : clamp((time - start) / (launched ? 980 : 680))
      const eased = 1 - (1 - t) ** 3
      pose.current = { progress: from.progress + (progress - from.progress) * eased, lift: from.lift + ((launched ? 1 : 0) - from.lift) * eased }
      const { width, height } = node.getBoundingClientRect()
      const ratio = Math.min(devicePixelRatio, 2)
      if (node.width !== Math.round(width * ratio) || node.height !== Math.round(height * ratio)) {
        node.width = Math.round(width * ratio)
        node.height = Math.round(height * ratio)
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      render(context, width, height, pose.current.progress, pose.current.lift)
      if (t < 1) frameId = requestAnimationFrame(draw)
    }
    const schedule = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(draw)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(node)
    reduced.addEventListener('change', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frameId)
      resize.disconnect()
      reduced.removeEventListener('change', schedule)
    }
  }, [progress, launched])

  return <canvas ref={canvas} className={className} aria-hidden="true" />
}
