export type Access = { user_id: string; approved: boolean; role: 'owner' | 'member' | null; module_ids: string[] }
export type Member = { user_id: string; email: string; active: boolean; role: 'owner' | 'member'; module_ids: string[] }

export function parseAccess(value: unknown, userId: string): Access {
  if (!value || typeof value !== 'object') throw new Error('Invalid access response')
  const row = value as Record<string, unknown>
  if (row.user_id !== userId || typeof row.approved !== 'boolean' || ![null, 'owner', 'member'].includes(row.role as null | string) || !Array.isArray(row.module_ids) || !row.module_ids.every(id => typeof id === 'string')) throw new Error('Invalid access response')
  if ((row.approved && row.role === null) || (!row.approved && (row.module_ids.length !== 0 || row.role !== null))) throw new Error('Invalid access response')
  return row as Access
}
export function parseMembers(value: unknown): Member[] {
  if (!Array.isArray(value)) throw new Error('Invalid member response')
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.user_id !== 'string' || typeof item.email !== 'string' || typeof item.active !== 'boolean' || !['owner', 'member'].includes(item.role) || !Array.isArray(item.module_ids) || !item.module_ids.every((id: unknown) => typeof id === 'string')) throw new Error('Invalid member response')
    return item as Member
  })
}
export function safeReturnPath(value: string | null): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/'
  try {
    const url = new URL(value, 'https://migdot.invalid')
    if (url.origin !== 'https://migdot.invalid' || ['/login', '/auth/callback'].includes(url.pathname)) return '/'
    return url.pathname + url.search + url.hash
  } catch { return '/' }
}
