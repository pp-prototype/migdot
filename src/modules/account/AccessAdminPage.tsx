import { useCallback, useEffect, useRef, useState } from 'react'
import { modules } from '../../shell/modules'
import { supabase } from '../../shared/lib/supabase'
import { parseMembers, type Member } from '../../shared/auth/access'
import { useAuth } from '../../shared/auth/context'

export default function AccessAdminPage() {
  const auth = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const generation = useRef(0)
  const load = useCallback(async () => {
    if (!supabase) return
    const id = ++generation.current
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.rpc('admin_list_app_members')
      if (error) throw error
      const rows = parseMembers(data)
      if (id === generation.current) setMembers(rows)
    } catch {
      if (id === generation.current) { setMembers([]); setError('사용자 목록을 불러오지 못했습니다. 운영자 권한과 서버 연결을 확인해 주세요.') }
    } finally { if (id === generation.current) setLoading(false) }
  }, [])
  const invalidate = useCallback(() => { generation.current++ }, [])
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) void load() })
    return () => { cancelled = true; invalidate() }
  }, [load, invalidate])
  useEffect(() => {
    const refresh = () => { if (!busy && document.visibilityState === 'visible') void load() }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [busy, load])
  const pending = members.filter(member => !member.active && member.role !== 'owner').length
  const visible = members.filter(member => (filter === 'all' || (filter === 'pending' ? !member.active && member.role !== 'owner' : member.active)) && `${member.email} ${member.user_id}`.toLowerCase().includes(query.trim().toLowerCase()))
  async function change(action: () => PromiseLike<{ error: unknown }>) {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { error } = await action()
      if (error) throw error
      await load(); await auth.refresh(); setMessage('서버에 권한 변경을 반영했습니다.')
    } catch { setError('권한을 변경하지 못했습니다. 연결과 운영자 권한을 확인한 뒤 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  return <section className="admin-page"><p className="eyebrow">OWNER / ACCESS CONTROL</p><h1>사용자와 모듈 권한</h1><p className="intro">로그인한 사용자를 승인하고 이용할 모듈을 선택합니다. 다른 사람의 개인 기록은 공유되지 않습니다.</p><button className="auth-secondary" disabled={loading || busy} onClick={() => void load()}>목록 새로고침</button>
    {loading && <p role="status">사용자 목록을 불러오는 중입니다…</p>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="admin-tools"><p>조회된 계정 {members.length}명 · 승인 대기 / 중지 {pending}명</p><label>사용자 검색<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="이메일 또는 사용자 ID" /></label><div className="admin-filters" role="group" aria-label="사용자 상태">{[['all', '전체'], ['pending', '승인 대기 / 중지'], ['active', '승인됨']].map(([value, label]) => <button key={value} className="auth-secondary" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div><p className="auth-note">앱에 로그인한 계정이 자동으로 목록에 표시됩니다. 화면을 보는 동안 30초마다 갱신합니다. 이용 승인 후 허용할 모듈도 선택해 주세요.</p></div>
    {!loading && !error && visible.length === 0 && <p>조건에 맞는 사용자가 없습니다.</p>}
    {!loading && visible.map(member => <article className="member-card" key={member.user_id}><div className="member-heading"><div><h2>{member.email || '이메일 없는 계정'}</h2><p className="account-id">{member.user_id}</p></div><span className="preview-label">{member.role === 'owner' ? '운영자' : member.active ? '승인됨' : '승인 대기 / 중지'}</span></div>
      {member.role === 'owner' ? <p>운영자는 활성 모듈을 모두 이용합니다. 운영자 지정은 관리 콘솔에서만 변경합니다.</p> : <><button className="auth-secondary" disabled={busy} onClick={() => void change(() => supabase!.rpc('admin_set_app_member', { target_user: member.user_id, approved: !member.active }))}>{member.active ? '이용 승인 취소' : '이용 승인'}</button><p className="auth-note">승인을 취소하면 기존 모듈 권한도 제거됩니다.</p>
      <fieldset className="grant-list" disabled={busy || !member.active}><legend>허용할 모듈</legend>{modules.map(module => <label key={module.id}><input type="checkbox" checked={member.active && member.module_ids.includes(module.id)} onChange={event => { const allowed = event.target.checked; void change(() => supabase!.rpc('admin_set_module_access', { target_user: member.user_id, target_module: module.id, allowed })) }} />{module.title}</label>)}</fieldset></>}
    </article>)}<p className="auth-note">최근 생성된 계정부터 최대 100개를 표시합니다. 실제 변경은 서버가 운영자 권한을 다시 검증합니다.</p>
  </section>
}
