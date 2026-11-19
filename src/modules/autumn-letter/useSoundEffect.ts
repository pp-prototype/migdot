import { useEffect, useRef } from 'react'

export function useSoundEffect(durationMs: number) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const stopTimer = useRef<number | undefined>(undefined)
  const playback = useRef(0)

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      playback.current += 1
      window.clearTimeout(stopTimer.current)
      audio?.pause()
    }
  }, [])

  function play() {
    const element = audioRef.current
    if (!element) return
    const audio = element

    const request = ++playback.current
    window.clearTimeout(stopTimer.current)
    audio.currentTime = 0
    function stopAtLimit() {
      if (request !== playback.current || audio.paused) return
      const remainingMs = durationMs - audio.currentTime * 1000
      if (remainingMs <= 20) {
        audio.pause()
      } else {
        stopTimer.current = window.setTimeout(stopAtLimit, Math.max(remainingMs, 20))
      }
    }

    void audio.play().then(stopAtLimit).catch(() => {
      // A failed sound effect does not interrupt the interaction.
    })
  }

  return { audioRef, play }
}
