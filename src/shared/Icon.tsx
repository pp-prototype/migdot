import type { CSSProperties } from 'react'

const paths: Record<string, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  meetings: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0ZM7 9h9M7 13h6',
  updates: 'm13 2-9 12h7l-1 8 10-13h-7Z',
  documentations: 'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  edit: 'm4 15 11-11a2.8 2.8 0 0 1 4 4L8 19l-5 2 1-6Zm9-9 4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5',
  calendar: 'M4 6h16v14H4ZM8 3v6m8-6v6M4 11h16m-9 4h2',
  play: 'm9 5 11 7-11 7Z',
  pause: 'M9 5v14m6-14v14',
  undo: 'M9 5l-5 5 5 5m-5-5h10a5 5 0 0 1 0 10',
  archive: 'M4 4h16v4H4Zm1 4v12h14V8m-9 4h4',
  refresh: 'M20 8a8 8 0 0 0-14-2L4 9m0-5v5h5m-5 7a8 8 0 0 0 14 2l2-3m0 5v-5h-5',
  moon: 'M20.8 15a8.8 8.8 0 0 1-11.9-11.8A9 9 0 1 0 20.8 15Z',
  close: 'm6 6 12 12M18 6 6 18',
  unlock: 'M5 11h14v10H5Zm3 0V7a4 4 0 0 1 8 0m-4 8v2',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  chevron: 'm6 9 6 6 6-6',
}
export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  return <svg style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.grid} /></svg>
}
