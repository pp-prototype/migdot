import { useState } from 'react'
import type { CSSProperties } from 'react'
import { drawLakeCameraSky, sceneWidth } from './scene'
import { useSoundEffect } from './useSoundEffect'
import shutterSound from './audio/bgm-camera.mp3'

type Photo = { type: 'white' } | { type: 'sky'; exposure: number }

export default function AutumnCamera({ active, savedPhoto, onCapture, onError, onClose }: {
  active: boolean
  savedPhoto: boolean
  onCapture: () => void
  onError: () => void
  onClose: () => void
}) {
  const [flash, setFlash] = useState(false)
  const [night, setNight] = useState(false)
  const [live, setLive] = useState(false)
  const [exposure, setExposure] = useState(1)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [shots, setShots] = useState(0)
  const { audioRef, play } = useSoundEffect(1500)
  const visibleExposure = active ? photo?.type === 'sky' ? photo.exposure : night ? exposure : 0 : 0
  const whitePhoto = active && photo?.type === 'white'

  function takePhoto() {
    if (!active) {
      onError()
      return
    }
    if (live && !flash) return

    play()
    setShots(count => count + 1)
    if (flash) {
      setPhoto({ type: 'white' })
    } else {
      const capturedExposure = night ? exposure : 0
      setPhoto({ type: 'sky', exposure: capturedExposure })
      if (capturedExposure === 5) onCapture()
    }
  }

  return <section className="autumn-camera-app" aria-label="별하늘 카메라 앱">
    <audio ref={audioRef} src={shutterSound} preload="auto" />
    <div className="autumn-camera-preview" data-white={whitePhoto}>
      {visibleExposure > 0 && !whitePhoto && <canvas width={sceneWidth} height={146}
        role="img" aria-label={photo ? '촬영한 호수공원 별하늘 사진' : '호수공원 위 별하늘'}
        style={{ '--sky-exposure': [.0, .26, .43, .62, .81, 1][visibleExposure] } as CSSProperties}
        ref={canvas => { if (canvas) drawLakeCameraSky(canvas, visibleExposure) }} />}
      {shots > 0 && active && <div key={shots} className="autumn-camera-exposure" data-flash={flash} aria-hidden="true" />}
      <button type="button" className="autumn-camera-back" aria-label="카메라 닫기" onClick={onClose}>×</button>
      <div className="autumn-camera-settings">
        <button type="button" aria-label="플래시" aria-pressed={flash} disabled={!active} onClick={() => {
          setPhoto(null)
          setFlash(!flash)
        }}>
          <span className="autumn-camera-flash" aria-hidden="true" />
        </button>
        <button type="button" aria-label="야간 모드" aria-pressed={night} disabled={!active} onClick={() => {
          setPhoto(null)
          setExposure(1)
          setNight(!night)
        }}>
          <span className="autumn-camera-night" aria-hidden="true" />
        </button>
        <button type="button" aria-label="라이브 모드" aria-pressed={live} disabled={!active} onClick={() => setLive(!live)}>
          <span className="autumn-camera-live" aria-hidden="true" />
        </button>
      </div>
      {active && night && <label className="autumn-camera-gauge">
        <span>노출</span>
        <input type="range" min={1} max={5} step={1} value={exposure} aria-label="노출 단계"
          onChange={event => {
            setPhoto(null)
            setExposure(Number(event.target.value))
          }} />
        <output>{exposure}</output>
      </label>}
    </div>
    <div className="autumn-camera-rail">
      <button type="button" className="autumn-camera-shutter" aria-label="사진 촬영" onClick={takePhoto} />
      {active && savedPhoto && <button type="button" className="autumn-camera-saved"
        aria-label="획득한 별 사진 보기" onClick={() => setPhoto({ type: 'sky', exposure: 5 })}>
        <span aria-hidden="true">✦</span>
      </button>}
    </div>
  </section>
}
