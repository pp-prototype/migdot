import { supabase } from '../../shared/lib/supabase'
import { summarizeTopics, type TopicActivity } from './topic-summaries'

export type TopicFields = { name: string; description: string; thumbnail_jpeg?: string | null }
export type NoteFields = { title: string; body: string; tag: string; photo_jpeg?: string | null }
type Metadata = { id: string; version: number; created_at: string }
export type TopicRecord = Metadata & TopicFields
export type NoteRecord = Metadata & NoteFields & { topic_id: string; registration_number: number }

const topics = 'learning_topics'
const notes = 'learning_notes'

function client() {
  if (!supabase) throw new Error('저장 서버에 연결할 수 없습니다.')
  return supabase
}

async function loadRecords<Record>(table: string, owner: string, topic?: string, columns = '*') {
  const records: Record[] = []
  const size = 100
  for (let offset = 0; ; offset += size) {
    let query = client().from(table).select(columns).eq('owner_id', owner)
    if (topic) query = query.eq('topic_id', topic)
    const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + size - 1)
    if (error) throw error
    records.push(...data as unknown as Record[])
    if (data.length < size) return records
  }
}

async function loadTopics(owner: string) {
  const [topicRows, noteActivity] = await Promise.all([
    loadRecords<TopicRecord>(topics, owner),
    loadRecords<Pick<NoteRecord, 'topic_id' | 'created_at'>>(notes, owner, undefined, 'topic_id,created_at'),
  ])
  return summarizeTopics(topicRows, noteActivity)
}
const loadNotes = (owner: string, topic: string) => loadRecords<NoteRecord>(notes, owner, topic)

async function loadTopic(owner: string, id: string): Promise<TopicRecord | null> {
  const { data, error } = await client().from(topics).select('*').eq('owner_id', owner).eq('id', id).maybeSingle()
  if (error) throw error
  return data as TopicRecord | null
}

export class RecordChanged extends Error {
  constructor(public latest: (TopicRecord | NoteRecord) | null) {
    super('다른 곳에서 이 기록이 변경되었습니다.')
  }
}

type RecordInput = {
  id: string
  version?: number
  topic?: string
  fields: TopicFields | NoteFields
}

async function saveRecord(owner: string, { id, version, topic, fields }: RecordInput) {
  const table = topic ? notes : topics
  const relation = client().from(table)
  if (version === undefined) {
    // Retry the same creation with the same ID if its response was lost.
    const { error } = await relation.insert({ ...fields, id, owner_id: owner, ...(topic ? { topic_id: topic } : {}) })
    if (!error) return
    if (error.code !== '23505') throw error
  } else {
    const { data, error } = await relation.update(fields).eq('owner_id', owner).eq('id', id)
      .eq('version', version).select('id').maybeSingle()
    if (error) throw error
    if (data) return
  }

  const { data, error } = await client().from(table).select('*').eq('owner_id', owner).eq('id', id).maybeSingle()
  if (error) throw error
  if (data && Object.entries(fields).every(([key, value]) => data[key] === value)) return
  throw new RecordChanged(data as TopicRecord | NoteRecord | null)
}

async function removeNote(owner: string, note: NoteRecord) {
  const { data, error } = await client().from(notes).delete().eq('owner_id', owner)
    .eq('id', note.id).eq('version', note.version).select('id').maybeSingle()
  if (error) throw error
  if (data) return
  const { data: latest, error: lookupError } = await client().from(notes).select('*')
    .eq('owner_id', owner).eq('id', note.id).maybeSingle()
  if (lookupError) throw lookupError
  if (latest) throw new RecordChanged(latest as NoteRecord)
  const access = await client().rpc('can_access_module', { target_module: 'post-it-learner' })
  if (access.error || access.data !== true) throw new RecordChanged(null)
}

export type LearningRecords = {
  loadTopics: () => Promise<(TopicRecord & TopicActivity)[]>
  loadTopic: (id: string) => Promise<TopicRecord | null>
  loadNotes: (topic: string) => Promise<NoteRecord[]>
  saveRecord: (input: RecordInput) => Promise<void>
  removeNote: (note: NoteRecord) => Promise<void>
}

export function cloudRecords(owner: string): LearningRecords {
  return {
    loadTopics: () => loadTopics(owner),
    loadTopic: id => loadTopic(owner, id),
    loadNotes: topic => loadNotes(owner, topic),
    saveRecord: input => saveRecord(owner, input),
    removeNote: note => removeNote(owner, note),
  }
}

export function trialRecords(): LearningRecords {
  const topics = new Map<string, TopicRecord>()
  const notes = new Map<string, NoteRecord>()
  const lastNoteNumbers = new Map<string, number>()
  return {
    loadTopics: () => Promise.resolve(summarizeTopics([...topics.values()].reverse(), notes.values())),
    loadTopic: id => Promise.resolve(topics.get(id) ?? null),
    loadNotes: topic => Promise.resolve([...notes.values()].filter(note => note.topic_id === topic).reverse()),
    saveRecord: ({ id, version, topic, fields }) => {
      const previous = topic ? notes.get(id) : topics.get(id)
      if (previous?.version !== version) return Promise.reject(new RecordChanged(previous ?? null))
      const metadata = {
        id,
        version: (version ?? 0) + 1,
        created_at: previous?.created_at ?? new Date().toISOString(),
      }
      if (topic && 'title' in fields) {
        const existing = notes.get(id)
        const registration_number = existing?.registration_number ?? (lastNoteNumbers.get(topic) ?? 0) + 1
        if (!existing) lastNoteNumbers.set(topic, registration_number)
        notes.set(id, { ...existing, ...metadata, ...fields, topic_id: topic, registration_number })
      } else if (!topic && 'name' in fields) topics.set(id, { ...topics.get(id), ...metadata, ...fields })
      else return Promise.reject(new Error('저장할 기록을 확인해 주세요.'))
      return Promise.resolve()
    },
    removeNote: note => {
      const latest = notes.get(note.id)
      if (latest && latest.version !== note.version) return Promise.reject(new RecordChanged(latest))
      notes.delete(note.id)
      return Promise.resolve()
    },
  }
}
