import { useEffect, useRef } from 'react'
import { coverFrame, coverHeight, coverWidth, drawCover, initialCrop, type Crop } from './thumbnail'
import styles from './cloud.module.css'

function offset(value: number, movement: number, overflow: number) {
  return overflow > 0.001 ? Math.max(-1, Math.min(1, value + movement / overflow)) : value
}

export default function CoverPreview({ image, crop, onCrop, disabled }: {
  image: ImageBitmap
  crop: Crop | null
  onCrop: (crop: Crop | null) => void
  disabled: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ pointer: number; x: number; y: number; crop: Crop } | null>(null)
  const frame = coverFrame(image, crop)

  useEffect(() => {
    if (canvas.current) drawCover(canvas.current, image, crop)
  }, [image, crop])

  return <div className={styles.coverEditor}>
    <fieldset className={styles.coverModes} disabled={disabled}>
      <legend>썸네일 표시 방식</legend>
      <label><input type="radio" name="cover-mode" checked={!crop} onChange={() => onCrop(null)} />전체 사진</label>
      <label><input type="radio" name="cover-mode" checked={Boolean(crop)} onChange={() => onCrop(initialCrop)} />직접 자르기</label>
    </fieldset>
    <canvas
      ref={canvas}
      width={coverWidth}
      height={coverHeight}
      role="img"
      aria-label="등록할 썸네일 미리보기"
      className={crop && !disabled ? styles.draggableCover : undefined}
      onPointerDown={event => {
        if (!crop || disabled || !event.isPrimary || event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, crop }
      }}
      onPointerMove={event => {
        const start = drag.current
        if (!crop || disabled || start?.pointer !== event.pointerId) return
        const bounds = event.currentTarget.getBoundingClientRect()
        const dx = (event.clientX - start.x) * coverWidth / bounds.width
        const dy = (event.clientY - start.y) * coverHeight / bounds.height
        onCrop({ zoom: crop.zoom, x: offset(start.crop.x, dx, -frame.x), y: offset(start.crop.y, dy, -frame.y) })
      }}
      onLostPointerCapture={() => { drag.current = null }}
    />
    {crop && <fieldset className={styles.cropControls} disabled={disabled}>
      <legend>자르기 조절</legend>
      <p>사진을 드래그하거나 아래 조절 막대를 사용하세요.</p>
      <label>확대 <input type="range" min="1" max="3" step=".05" value={crop.zoom} onChange={event => onCrop({ ...crop, zoom: event.target.valueAsNumber })} /></label>
      <label>가로 위치 <input type="range" min="-1" max="1" step=".01" value={crop.x} disabled={frame.x > -.001} onChange={event => onCrop({ ...crop, x: event.target.valueAsNumber })} /></label>
      <label>세로 위치 <input type="range" min="-1" max="1" step=".01" value={crop.y} disabled={frame.y > -.001} onChange={event => onCrop({ ...crop, y: event.target.valueAsNumber })} /></label>
    </fieldset>}
  </div>
}
