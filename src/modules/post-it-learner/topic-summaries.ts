export type TopicActivity = { noteCount: number; latestUpload: string | null }

export function summarizeTopics<Topic extends { id: string }>(
  topics: Topic[],
  notes: Iterable<{ topic_id: string; created_at: string }>,
): (Topic & TopicActivity)[] {
  const activity = new Map<string, TopicActivity>()
  for (const note of notes) {
    const summary = activity.get(note.topic_id)
    if (!summary) {
      activity.set(note.topic_id, { noteCount: 1, latestUpload: note.created_at })
      continue
    }
    summary.noteCount++
    if (Date.parse(note.created_at) > uploadTime(summary.latestUpload)) summary.latestUpload = note.created_at
  }

  return topics.map(topic => ({
    ...topic,
    ...(activity.get(topic.id) ?? { noteCount: 0, latestUpload: null }),
  })).sort((a, b) => uploadTime(b.latestUpload) - uploadTime(a.latestUpload))
}

function uploadTime(date: string | null) {
  return date ? Date.parse(date) : Number.NEGATIVE_INFINITY
}
