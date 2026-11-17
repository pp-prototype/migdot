# 공통 인증과 모듈 접근 권한

## 현재 상태

Google OAuth(PKCE), 공통 세션, 모듈 보호 경로, 홈/메뉴 필터링, 승인 대기와 운영자 권한 관리 UI를 구현했습니다. 실제 프로젝트 연결·마이그레이션 적용·Google 실계정 검증은 아직 하지 않았습니다.

마이그레이션은 `migrations/202611170001_common_auth_access.sql`입니다. 기존 SQL의 복사·이전, 앱의 업무 데이터 테이블, 사진·문서 버킷을 자동 생성하지 않습니다.

## 연결 순서

1. 본인 소유의 Supabase 프로젝트를 준비합니다.
2. SQL Editor에서 위 마이그레이션 전체를 한 번 실행합니다. 전체가 트랜잭션으로 처리되며 기존 이름과 충돌하면 적용하지 않고 조사합니다.
3. Google Cloud에서 웹 OAuth 클라이언트를 준비하고 Supabase Auth의 Google 공급자에 ID와 비밀값을 설정합니다. 비밀값은 Supabase 관리 화면에만 넣고 `VITE_` 환경 변수에 넣지 않습니다.
4. Google의 승인된 redirect URI는 Supabase가 안내하는 `https://<프로젝트>.supabase.co/auth/v1/callback`입니다. 앱의 `/auth/callback`과 구분합니다.
5. Supabase URL Configuration의 Site URL을 실제 앱 origin으로 지정하고, 앱의 `/auth/callback`을 허용합니다. `next`와 SDK의 `sb_flow_id` 쿼리가 유지되도록 실제 소유 도메인의 `/auth/callback**` 패턴 등을 공식 문서에 따라 검토합니다. 전체 인터넷 도메인에 대한 wildcard는 사용하지 않습니다.
6. `.env.example`을 `.env.local`로 복사하고 URL과 publishable key만 입력합니다. 개발 서버를 재시작합니다.
7. 앱에서 Google로 로그인합니다. 첫 사용자는 자동 운영자가 되지 않으며 승인 대기 상태입니다.
8. Auth의 사용자 ID를 확인하고 아래 SQL로 첫 운영자를 지정합니다.

```sql
-- Auth에 이미 존재하는 본인의 UUID로 치환합니다.
-- 첫 로그인한 사용자나 특정 이메일을 자동 운영자로 승격하지 않습니다.
insert into public.app_members(user_id, role, active)
values ('YOUR_AUTH_USER_UUID'::uuid, 'owner', true)
on conflict (user_id) do update set role = 'owner', active = true;
```

9. 앱에서 ‘권한 다시 확인’을 누르고 헤더의 ‘권한 관리’(`/settings/access`)로 이동합니다.
10. 지인이 실제 Google로 로그인하면 목록에서 승인 후 허용할 모듈을 선택합니다. 승인만으로 모듈이 열리지는 않습니다. 계정 자동 생성을 허용할지 또는 사전 등록할지는 Supabase Auth 설정으로 결정합니다. 이 앱에는 초대 메일 발송 기능이 없습니다.

운영자는 활성 모듈에 접근할 수 있습니다. 일반 회원은 명시적으로 허용된 모듈에만 접근합니다. 운영자 지정/해제는 관리 콘솔의 명시적인 SQL로 수행하며 일반 앱 RPC로 자신을 운영자로 만들거나 운영자를 제거할 수 없습니다. 운영자 권한은 다른 사용자의 업무 기록 열람 권한을 자동 부여하지 않습니다.

## 권한 저장과 동작

- `app_modules`: 모듈 ID와 활성 상태. 새 모듈 추가 시 마이그레이션으로 등록합니다.
- `app_members`: Auth UUID, owner/member 역할, 서비스 이용 승인 여부
- `app_module_grants`: 일반 회원에게 허용한 모듈. PK로 중복을 방지합니다.
- `get_app_access`: 현재 인증 사용자의 승인·역할·허용 모듈만 반환
- `admin_list_app_members`: 운영자에게 최근 생성된 계정 최대 100개의 식별 정보와 승인 상태 반환
- `admin_set_app_member`, `admin_set_module_access`: 운영자 확인 후 승인·권한 변경
- `can_access_module`: JWT에 복사한 역할 대신 현재 DB의 승인·모듈 상태로 권한 확인

세 테이블은 RLS와 조회 권한을 적용하며 클라이언트에 직접 쓰기를 허용하지 않습니다. 승인 취소 시 모듈 권한도 삭제합니다. 재승인 후에는 다시 모듈을 허용해야 합니다. `app_modules.enabled=false`는 운영자에게도 적용됩니다.

로그인 세션 저장 키는 Supabase 호스트별로 분리해 프로젝트 설정 변경 시 이전 프로젝트 토큰을 재사용하지 않습니다. 프런트엔드는 최초 확인과 계정 변경 시 콘텐츠를 차단하고, 오류 시 기존 권한을 제거합니다. 승인·권한 갱신은 화면 복귀/온라인 복귀 및 보이는 화면에서 30초 주기로 확인합니다. 이미 승인된 화면의 백그라운드 재검증 중에는 기존 화면을 유지하고, 거부·오류 응답에서 해제합니다. 이 확인 간격은 DB 정책을 우회하는 유예 기간이 아닙니다. DB는 매 요청마다 현재 정책을 확인합니다.

## 업무 데이터와 Storage를 추가할 때

모듈 접근 권한만으로 데이터 소유권이 해결되지 않습니다. 모든 사용자별 테이블의 각 동작에 다음 두 조건을 함께 적용해야 합니다.

```sql
-- 예: SELECT/DELETE의 USING, INSERT의 WITH CHECK,
-- UPDATE의 USING 및 WITH CHECK에 적절히 적용합니다.
(select public.can_access_module('execution-tracker'))
and owner_id = (select auth.uid())
```

비로그인 역할에는 업무 데이터 접근을 주지 않습니다. 자식/부모 항목의 사용자 소유권도 외래키·제약으로 검증합니다. 사진은 비공개 Storage 버킷과 객체별 정책이 필요합니다. `service_role`/secret 키는 RLS를 우회하므로 브라우저에 넣지 않습니다. 잘못된 키를 코드가 거부하더라도 `VITE_` 값 자체는 번들에 노출되므로 비밀값 유출을 되돌리는 보호가 아닙니다.

포스트잇 러너는 고정 예시입니다. 익스큐셔너는 아래 추가 마이그레이션 적용 후 개인 클라우드 기록을 사용합니다. 사진·Storage는 연결하지 않았습니다.

## 배포와 정적 문서의 범위

Vercel에는 `npm run build`, 출력 `dist`와 공개 환경 변수 두 개를 설정합니다. `vercel.json`에 SPA fallback을 포함하여 콜백·보호 경로의 직접 접속을 지원합니다. 실제 배포는 수행하지 않았습니다.

배포 빌드는 Supabase 설정이 없거나 잘못되면 보호 모듈을 열지 않습니다. 설정 없는 **개발 서버**에서는 이전 예시를 확인할 수 있도록 로컬 체험 모드와 안내를 제공합니다. 이 체험은 실제 인증·관리자 권한을 제공하지 않습니다. `/settings/access`도 체험 권한으로 열 수 없습니다.

정적 Markdown·JS 번들은 경로 가드만으로 비공개가 되지 않습니다. 현재 문서 본문은 빌드에 포함됩니다. 공개하면 안 되는 문서나 개인 기록은 배포 소스에 넣지 말고, 서버/비공개 Storage에서 권한 확인 후 제공하는 별도 작업이 필요합니다. 전체 사이트를 Vercel 배포 보호로 제한하는 방법과 DB 권한은 별개입니다.

## 검증

```sh
npm run check
npm run test:access
npm run test:ui
```

`test:access`는 개발 의존성 PGlite의 일회성 메모리 PostgreSQL에서 실제 마이그레이션과 RLS를 실행합니다. 모형 함수로 Auth UUID를 주입하고 PostgreSQL 역할을 전환해 비로그인·미승인·일반 사용자·운영자, 권한 상승 차단, 타인 데이터/소유자 위조, 권한 회수를 검증합니다. 외부 서버나 기존 DB에 연결하지 않습니다. Supabase의 실제 JWT 검증·Google 동의 화면·Storage·동시 연결 동작의 검증은 아닙니다.

브라우저 검증은 5177 개발 체험, 5176 인증 설정 서버(테스트가 가짜 Auth/API 응답을 주입), 4175 배포 빌드(설정 없음)를 사용합니다. 가짜 인증은 테스트 파일에만 존재하며 운영 코드의 로그인 방식이 아닙니다. 테스트 서버는 실제 계정/클라우드 대신 동작·실패·리디렉션과 권한 UI를 검증합니다. 실제 Google 계정 2개와 적용한 Supabase에서 승인·회수·권한 분리까지 추가 확인한 뒤 운영을 시작해야 합니다.

## 공식 참고

- [Google 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [PKCE와 흐름 ID](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [리디렉션 허용 목록](https://supabase.com/docs/guides/auth/redirect-urls)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vercel Vite SPA](https://vercel.com/docs/frameworks/frontend/vite)


## 익스큐셔너 개인 기록 적용

공통 인증 마이그레이션이 적용된 프로젝트의 SQL Editor에서 `migrations/202611170002_executioner_workspace.sql` 전체를 한 번 실행합니다. 기존 `202611170001`을 재실행하지 않습니다. 신규 테이블과 함수 생성만 수행하며 기존 Auth 사용자·모듈 권한·다른 모듈 데이터를 변경하지 않습니다. 마이그레이션은 트랜잭션으로 처리됩니다.

생성 대상은 `execution_workspaces`, `execution_tasks`, `execution_task_events`, `execution_routines`, `execution_routine_checks`, `execution_days`, `execution_requests`와 두 RPC입니다. 모든 테이블의 조회는 현재 모듈 권한과 본인 소유권으로 제한합니다. 클라이언트 직접 쓰기는 금지합니다. 운영자 역시 다른 사람의 기록을 읽지 못합니다. `get_execution_workspace`는 현재 사용자 전체 기록을, `change_execution_workspace`는 기대 리비전·명령·입력값을 받습니다. 소유자·최초 날짜·완료 시각·이벤트는 서버가 결정합니다. 요청 ID는 같은 저장의 중복 처리를 방지합니다.

적용 후 실행 트래커 권한이 있는 계정으로 `/execution-tracker`에 진입합니다. 최초에는 빈 개인 집행록이 정상입니다. 과업 등록 후 새로고침 복원, 루틴 체크, 마감과 재열기, 다른 계정에서 비노출을 확인합니다. 테스트 fixture SQL은 원격 프로젝트에서 실행하지 않습니다.

미완료 이월은 기한이 지난 열린 과업을 오늘 목록에 보여주는 방식으로 별도 스케줄러가 필요하지 않습니다. 한국 시간과 서버 날짜를 사용합니다. 최초 계획은 유지하고 당일 결과는 상태 이벤트로 재구성합니다. 앱을 열어 둔 경우 분 단위·화면 복귀 시 날짜와 기록을 다시 확인합니다. 수동 새로고침도 가능합니다. 오프라인·실시간 공동 편집·과거 완료 시각 수정은 제공하지 않습니다.

운영 전 실제 두 계정과 두 기기에서 소유권·권한 회수·수정 충돌을 추가 확인합니다. 데이터 백업은 프로젝트 관리자의 PostgreSQL 백업과 복원 절차로 수행합니다. 복원은 먼저 별도 검증 DB에 수행해 마이그레이션·RLS·본인 데이터 수를 확인한 뒤 운영 적용 여부를 결정합니다. 앱 내 백업/복원과 실제 복원 리허설은 아직 제공·검증하지 않았습니다. 장기 누적 시 전체 이력 조회량을 관찰해 페이지 분할을 도입해야 합니다.

익스큐셔너 브라우저 테스트는 Auth 응답을 대체하고 실제 마이그레이션을 실행한 로컬 PGlite SQL 함수에 연결합니다. 원격 Supabase에 업무 데이터를 쓰지 않습니다.
