import type { CSSProperties } from 'react'

// Adapted from post-it-learner f304de0, src/board-layout.mjs.
export const BOARD_PAGE_SIZE = 12;

export function boardPage<T>(notes: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(notes.length / BOARD_PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage, pages - 1));
  return { page, pages, notes: notes.slice(page * BOARD_PAGE_SIZE, (page + 1) * BOARD_PAGE_SIZE) };
}

export function notePosition(index: number): CSSProperties & Record<`--${string}`, number | string> {
  // Bounded coordinates keep all cards within the same board, with intentional overlap.
  const jitter = [0, .025, -.015, .012][index % 4];
  return {
    '--x': Math.max(0, Math.min(1, (index % 4) / 3 + jitter)),
    '--y': Math.max(0, Math.min(1, Math.floor(index / 4) / 2 + jitter)),
    '--mobile-x': Math.max(0, Math.min(1, (index % 3) / 2 + jitter)),
    '--mobile-y': Math.max(0, Math.min(1, Math.floor(index / 3) / 3 + jitter)),
    '--rotation': `${[-7, 5, -4, 8, -6, 3, 6, -3, 4, -8, 5, -4][index % 12]}deg`,
    '--layer': BOARD_PAGE_SIZE - index,
  };
}
