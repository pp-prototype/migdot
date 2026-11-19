import { useEffect, useRef, useState } from 'react'

const saveKey = 'migdot:autumn-letter:progress'
const saveVersion = 1
const maps = ['first-trail', 'second-trail', 'third-trail', 'fourth-trail'] as const
export type MapId = typeof maps[number]

export type Progress = {
  version: typeof saveVersion
  admitted: boolean
  currentMap: MapId
  unlockedMaps: MapId[]
  letters: { acquired: string[]; backsRead: string[] }
  discoveries: string[]
  puzzles: { leafPileLock: number[] }
}

export type ProgressAction =
  | { type: 'admit' }
  | { type: 'visit-map'; id: MapId }
  | { type: 'read-letter'; id: string; side: 'front' | 'back' }
  | { type: 'discover'; id: string }
  | { type: 'rotate-lock-dial'; index: number }

const initialProgress: Progress = {
  version: saveVersion,
  admitted: false,
  currentMap: 'first-trail',
  unlockedMaps: [],
  letters: { acquired: [], backsRead: [] },
  discoveries: [],
  puzzles: { leafPileLock: [0, 0, 0, 0] },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string'))] : []
}

function parseSave(value: unknown): Progress | null {
  if (!isRecord(value) || value.version !== saveVersion || value.admitted !== true) return null

  const savedMaps = ids(value.unlockedMaps)
  const unlockedMaps = maps.filter(id => id === 'first-trail' || savedMaps.includes(id))
  const letters = isRecord(value.letters) ? value.letters : {}
  const acquired = ids(letters.acquired)
  const puzzles = isRecord(value.puzzles) ? value.puzzles : {}
  const lock = puzzles.leafPileLock
  const digits = Array.isArray(lock) && lock.length === 4 &&
    lock.every(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9)
    ? lock : initialProgress.puzzles.leafPileLock

  return {
    version: saveVersion,
    admitted: true,
    currentMap: unlockedMaps.find(id => id === value.currentMap) ?? 'first-trail',
    unlockedMaps,
    letters: { acquired, backsRead: ids(letters.backsRead).filter(id => acquired.includes(id)) },
    discoveries: ids(value.discoveries),
    puzzles: { leafPileLock: digits },
  }
}

function add<T>(values: T[], value: T) {
  return values.includes(value) ? values : [...values, value]
}

function applyProgress(current: Progress, action: ProgressAction): Progress {
  switch (action.type) {
    case 'admit':
      return { ...current, admitted: true, unlockedMaps: add(current.unlockedMaps, 'first-trail') }
    case 'visit-map':
      return { ...current, currentMap: action.id, unlockedMaps: add(current.unlockedMaps, action.id) }
    case 'read-letter':
      return {
        ...current,
        letters: {
          acquired: add(current.letters.acquired, action.id),
          backsRead: action.side === 'back' ? add(current.letters.backsRead, action.id) : current.letters.backsRead,
        },
      }
    case 'discover':
      return { ...current, discoveries: add(current.discoveries, action.id) }
    case 'rotate-lock-dial':
      return {
        ...current,
        puzzles: {
          ...current.puzzles,
          leafPileLock: current.puzzles.leafPileLock.map((digit, index) =>
            index === action.index ? (digit + 1) % 10 : digit),
        },
      }
  }
}

function readProgress() {
  try {
    const raw = localStorage.getItem(saveKey)
    return (raw && parseSave(JSON.parse(raw))) || initialProgress
  } catch {
    return initialProgress
  }
}

export function useAutumnProgress() {
  const [progress, setProgress] = useState(readProgress)
  const latest = useRef(progress)
  const storageFailed = useRef(false)

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (storageFailed.current || event.storageArea !== localStorage || (event.key !== saveKey && event.key !== null)) return
      try {
        const next = (event.newValue && parseSave(JSON.parse(event.newValue))) || initialProgress
        latest.current = next
        setProgress(next)
      } catch {
        // Keep the active session if another tab wrote invalid data.
      }
    }

    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function save(action: ProgressAction) {
    let current = latest.current
    let writable = !storageFailed.current
    try {
      const raw = writable ? localStorage.getItem(saveKey) : null
      if (raw) {
        const value: unknown = JSON.parse(raw)
        writable = !isRecord(value) || typeof value.version !== 'number' || value.version <= saveVersion
        current = parseSave(value) ?? current
      }
    } catch {
      // Invalid or unavailable storage can still be replaced when writes are allowed.
    }

    const next = applyProgress(current, action)
    latest.current = next
    setProgress(next)
    if (next.admitted && writable) {
      try {
        localStorage.setItem(saveKey, JSON.stringify(next))
      } catch {
        storageFailed.current = true
      }
    }
  }

  return { progress, save }
}
