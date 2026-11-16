const sources = import.meta.glob('/docs/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const documents = Object.entries(sources).map(([path, content]) => ({
  path,
  content,
  category: path.split('/')[2],
  title: content.match(/^# (.+)$/m)?.[1] ?? path,
  date: path.match(/\d{4}-\d{2}-\d{2}/)?.[0],
})).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.path.localeCompare(a.path))
