import { supabase } from '../../shared/lib/supabase'

export type Word = { id: string; language: string; text: string; meaning: string }
export type Example = { id: string; text: string; translation: string; language?: string }
export type Connection = { id: string; wordId: string; exampleId: string; gap: string; gapStart: number }
export type Grade = 'again' | 'hard' | 'remembered' | 'easy'
export const ratings = {
  again: { label: '다시', interval: '10분 후', delay: 10 * 60_000 },
  hard: { label: '어려움', interval: '6시간 후', delay: 6 * 60 * 60_000 },
  remembered: { label: '기억함', interval: '1일 후', delay: 24 * 60 * 60_000 },
  easy: { label: '쉬움', interval: '4일 후', delay: 4 * 24 * 60 * 60_000 },
}
type Session = { cards: string[]; cursor: number }
type Review = { cardId: string; grade: Grade; due: number; at: number }
export type Workspace = {
  words: Word[]
  examples: Example[]
  connections: Connection[]
  reviews: Review[]
  session: Session | null
  flashSession?: Session | null
}
export type Snapshot = { workspace: Workspace; revision: string | null }
export const empty: Snapshot = {
  revision: null,
  workspace: { words: [], examples: [], connections: [], reviews: [], session: null },
}

export type Card = { id: string; prompt: string; answer: string; context: string; kind: '뜻 떠올리기' | '빈칸 채우기' | '문장 해석' }

export function studyCards(workspace: Workspace): Card[] {
  const wordCards = workspace.words.flatMap(word => {
    const cards: Card[] = word.meaning ? [{
      id: word.id, prompt: word.text, answer: word.meaning, kind: '뜻 떠올리기',
      context: workspace.examples.find(example => workspace.connections.some(link => link.wordId === word.id && link.exampleId === example.id))?.text ?? '',
    }] : []
    for (const link of workspace.connections.filter(item => item.wordId === word.id)) {
      const example = workspace.examples.find(item => item.id === link.exampleId)
      if (!example || !link.gap || !example.text.startsWith(link.gap, link.gapStart)) continue
      const prompt = example.text.slice(0, link.gapStart) + '______' + example.text.slice(link.gapStart + link.gap.length)
      cards.push({
        id: link.id, prompt, answer: link.gap,
        context: example.translation, kind: '빈칸 채우기',
      })
    }
    return cards
  })
  const translations: Card[] = workspace.examples.filter(example => example.translation.trim()).map(example => ({
    id: example.id, prompt: example.text, answer: example.translation, context: '', kind: '문장 해석',
  }))
  return [...wordCards, ...translations]
}

export function shuffledCardIds(cards: Card[], limit: number) {
  const ids = cards.map(card => card.id)
  const count = Math.min(limit, ids.length)
  for (let index = 0; index < count; index++) {
    const other = index + Math.floor(Math.random() * (ids.length - index))
    const id = ids[index]
    ids[index] = ids[other]
    ids[other] = id
  }
  return ids.slice(0, count)
}

const answerTerms = (value: string) => value.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []

export function compareTranslation(input: string, reference: string) {
  const terms = answerTerms(input)
  const expected = answerTerms(reference)
  const entered = new Set(terms)
  return {
    exact: expected.length > 0 && terms.join(' ') === expected.join(' '),
    common: [...new Set(expected)].filter(term => entered.has(term)),
  }
}

export function latestReviews(workspace: Workspace) {
  return new Map(workspace.reviews.map(review => [review.cardId, review]))
}

export function gradeCard(workspace: Workspace, cardId: string, position: number, grade: Grade, sessionKey: 'session' | 'flashSession' = 'session'): Workspace {
  const at = Date.now()
  const session = workspace[sessionKey]
  return {
    ...workspace,
    reviews: [...workspace.reviews, { cardId, grade, at, due: at + ratings[grade].delay }],
    [sessionKey]: session ? { ...session, cursor: position + 1 } : null,
  }
}

export type WordCells = [text: string, meaning: string]

export function classifyWords(cells: WordCells[], language: string, words: Word[]) {
  const seen = new Set(words.map(word => wordKey(word.language, word.text)))
  return cells.map(([rawText, rawMeaning]) => {
    const text = rawText.trim()
    const meaning = rawMeaning.trim()
    const key = wordKey(language, text)
    const state = !text ? (meaning ? 'invalid' : 'empty') : seen.has(key) ? 'duplicate' : 'new'
    if (state === 'new') seen.add(key)
    return { text, meaning, state }
  })
}

export function gapPositions(sentence: string, gap: string) {
  const positions: number[] = []
  if (!gap) return positions
  for (let index = sentence.indexOf(gap); index !== -1; index = sentence.indexOf(gap, index + 1)) {
    positions.push(index)
  }
  return positions
}

const normalizeWord = (value: string) => value.trim().normalize('NFC').toLowerCase()
export const wordKey = (language: string, text: string) => JSON.stringify([normalizeWord(language), normalizeWord(text)])

export function removeWord(workspace: Workspace, wordId: string): Workspace {
  const removedCards = new Set([wordId, ...workspace.connections
    .filter(link => link.wordId === wordId)
    .map(link => link.id)])
  const keepCard = (id: string) => !removedCards.has(id)
  const keepSession = (session?: Session | null) => session ? {
    cards: session.cards.filter(keepCard),
    cursor: session.cards.slice(0, session.cursor).filter(keepCard).length,
  } : null

  return {
    ...workspace,
    words: workspace.words.filter(word => word.id !== wordId),
    connections: workspace.connections.filter(link => link.wordId !== wordId),
    reviews: workspace.reviews.filter(review => keepCard(review.cardId)),
    session: keepSession(workspace.session),
    flashSession: keepSession(workspace.flashSession),
  }
}

const table = 'stilla_workspaces'
export async function loadWorkspace(owner: string): Promise<Snapshot> {
  if (!supabase) throw new Error('저장소에 연결할 수 없습니다.')
  const { data, error } = await supabase.from(table).select('revision,workspace').eq('owner_id', owner).maybeSingle()
  if (error) throw error
  return data ? { revision: data.revision, workspace: data.workspace } : empty
}

export async function saveWorkspace(owner: string, workspace: Workspace, previous: string | null): Promise<Snapshot> {
  if (!supabase) throw new Error('저장소에 연결할 수 없습니다.')
  const revision = crypto.randomUUID()
  const values = { revision, workspace }
  const write = previous
    ? supabase.from(table).update(values).eq('owner_id', owner).eq('revision', previous)
    : supabase.from(table).insert({ ...values, owner_id: owner })
  const { data, error } = await write.select('revision').maybeSingle()
  if (data?.revision === revision) return values
  // A response can be lost after Postgres has committed the write.
  const current = await loadWorkspace(owner)
  if (current.revision === revision) return current
  if (current.revision !== previous) throw new WorkspaceConflict(current)
  throw error ?? new Error('저장이 완료되지 않았습니다.')
}

export class WorkspaceConflict extends Error {
  constructor(readonly snapshot: Snapshot) { super('다른 곳에서 바뀐 기록을 불러왔습니다. 내용을 확인하고 다시 저장해 주세요.') }
}
