import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

// 설정 전에는 네트워크 연결 없이 앱 셸과 문서를 사용할 수 있다.
export const supabase = url && key ? createClient(url, key) : null
