# Supabase

아직 DB 테이블과 인증 흐름은 구현하지 않았습니다. 프로젝트 생성 후 `.env.local`에 URL과 publishable key를 설정합니다. 클라이언트에서 secret/service_role key를 사용하지 않습니다.

테이블을 도입할 때 `migrations/`에 SQL을 기록하고, 개인 데이터의 RLS 정책과 사용자별 접근 검증을 함께 구현합니다.
