# 공통 인증과 모듈 접근 권한

## 현재 상태

Google OAuth(PKCE), 공통 세션, 모듈 보호 경로, 홈/메뉴 필터링, 승인 대기와 운영자 권한 관리 UI를 구현했습니다. 실제 프로젝트 연결·마이그레이션 적용·Google 실계정 검증은 아직 하지 않았습니다.

마이그레이션은 `migrations/202611170001_common_auth_access.sql`입니다. 기존 SQL의 복사·이전, 앱의 업무 데이터 테이블, 사진·문서 버킷을 자동 생성하지 않습니다.

## 연결 순서

1. 본인 소유의 Supabase 프로젝트를 준비합니다.
2. SQL Editor에서 위 마이그레이션 전체를 한 번 실행합니다. 전체가 트랜잭션으로 처리되며 기존 이름과 충돌하면 적용하지 않고 조사합니다.
3. Google Cloud에서 웹 OAuth 클라이언트를 준비하고 Supabase Auth의 Google 공급자에 ID와 비밀값을 설정합니다. 비밀값은 Supabase 관리 화면에만 넣고 `VITE_` 환경 변수에 넣지 않습니다.
4. Google의 승인된 redirect URI는 Supabase가 안내하는 `https://<프로젝트>.supabase.co/auth/v1/callback`입니다. 앱의 `/auth/callback`과 구분합니다.
5. Supabase의 Authentication → URL Configuration에서 Site URL을 실제 운영 주소(예: `https://app.example.com`)로 지정합니다. Redirect URLs에는 운영 주소의 `https://app.example.com/auth/callback`을 등록합니다. 로컬 개발 서버에서 로그인하려면 `http://localhost:5173/auth/callback`도 추가합니다. `127.0.0.1` 또는 다른 포트를 사용한다면 브라우저 주소창의 호스트와 포트에 맞는 콜백을 등록합니다. Vercel Preview도 접속하는 도메인의 콜백을 별도로 등록합니다. 브라우저는 로그인을 시작한 주소에 PKCE 검증 정보를 저장하므로 같은 주소로 복귀해야 합니다.
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

포스트잇 러너와 익스큐셔너는 각 모듈의 추가 마이그레이션을 적용하면 개인 클라우드 기록을 사용합니다.

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

## 포스트잇 러너 개인 기록 적용

공통 인증이 설정된 환경에 [학습 기록 마이그레이션](migrations/202611180001_learning_records.sql)을 적용합니다. 이 마이그레이션은 `learning_topics`와 `learning_notes`를 만들며 공통 인증 테이블의 모듈 등록을 재사용합니다. 이어 [주제 썸네일 마이그레이션](migrations/202611180002_learning_topic_thumbnails.sql)을 적용합니다. 이 파일은 기존 주제에 선택 썸네일 열을 추가합니다. 마지막으로 [포스트잇 사진 마이그레이션](migrations/202611180003_learning_note_photos.sql)을 적용합니다. 썸네일과 포스트잇 사진은 압축본을 각 레코드에 저장합니다.

로그인한 사용자가 포스트잇 러너 모듈 이용 권한을 가지고 있어야 조회와 저장이 가능합니다. 사용자마다 빈 목록으로 시작합니다. 다른 계정으로 주제 주소를 열어 개인 주제와 기록이 표시되지 않는지 확인합니다. 같은 기록을 두 창에 열고 편집한 뒤 두 번째 저장에서 충돌 안내가 표시되는지도 확인합니다.

프로젝트 DB 백업의 복원은 별도 검증 환경에서 진행합니다. 테이블, RLS, 계정별 레코드 수를 확인한 뒤 운영 적용 여부를 결정합니다. 로컬 SQL 검증은 `npm run test:access`로 실행합니다.

## 익스큐셔너 Web Push 설정

처음 설정한다면 1번부터 진행하세요. 이미 **Cron → Jobs**에 활성 상태인 `send-execution-reminders`가 보이고 1~4번을 마쳤다면 [6번 웹사이트 배포](#6-웹사이트-배포)로 이어가면 됩니다.

설정이 끝나면 한국 시간 오후 5시에 미완료 과업, 오후 9시에 오늘 실천 기록이 없는 루틴을 확인해 알림을 보냅니다. 서버가 발송할 수 있게 준비하는 곳은 **Supabase 대시보드**, 사용자의 알림 켜기 화면을 배포하는 곳은 **MIG DOT 웹사이트 호스팅 대시보드**입니다. 터미널은 키를 만들고 로컬 발송 함수를 Supabase에 올릴 때 사용합니다.

### 1. 푸시 DB 마이그레이션

**Supabase 대시보드 → MIG DOT 프로젝트 → SQL Editor → New query**를 엽니다. 저장소의 [푸시 마이그레이션 파일](migrations/202611220003_execution_push.sql) 전체를 붙여넣고 **Run**을 한 번 누릅니다. 기존 익스큐셔너 작업공간, 루틴 목표, 상세 기록 마이그레이션이 같은 프로젝트에 적용돼 있어야 합니다.

**완료 확인** 새 쿼리에서 아래를 실행했을 때 두 결과에 테이블 이름이 나오면 됩니다. 이미 두 이름이 나오면 마이그레이션을 다시 실행할 필요는 없습니다.

```sql
select
  to_regclass('public.execution_push_subscriptions') as subscriptions,
  to_regclass('public.execution_push_deliveries') as deliveries;
```

### 2. 공개 키, 비공개 키, 예약 비밀값 만들기

Mac의 **터미널**에서 아래 두 줄을 실행합니다. 첫 줄은 알림에 사용할 VAPID 키 쌍을, 두 번째 줄은 예약 작업만 발송 함수를 부를 수 있게 하는 비밀값을 만듭니다.

```sh
npx web-push@3.6.7 generate-vapid-keys
openssl rand -hex 32
```

첫 번째 결과에서 `Public Key`와 `Private Key`를 각각 보관하고, 두 번째 결과의 한 줄도 별도로 보관합니다. 환경마다 키를 따로 발급합니다. 이미 운영 키를 발급했다면 이번 설정에서는 같은 키 쌍을 계속 사용하세요.

**완료 확인** 공개 키, 비공개 키, 예약 비밀값 세 가지가 준비돼 있습니다. 비공개 키와 예약 비밀값은 비밀번호 관리자 같은 비공개 장소에 보관합니다.

### 3. Edge Function에 사용할 값 저장

**Supabase 대시보드 → Edge Functions → Secrets**에서 다음 네 항목을 추가하고 **Save**를 누릅니다. 이름을 그대로 입력하고, 값에는 백틱이나 따옴표 없이 실제 값만 붙여넣으세요.

| Name | Value |
| --- | --- |
| `VAPID_SUBJECT` | 실제 운영 연락처. 형식은 `mailto:운영자이메일` |
| `VAPID_PUBLIC_KEY` | 2번의 `Public Key` |
| `VAPID_PRIVATE_KEY` | 2번의 `Private Key` |
| `EXECUTION_PUSH_CRON_SECRET` | 2번의 `openssl` 출력 전체 |

**완료 확인** 입력 폼을 저장한 뒤 **Secrets 목록**에 네 이름이 모두 보입니다. 함수에서 사용하는 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 호스팅된 Supabase가 제공합니다.

### 4. 발송 함수를 Supabase에 배포

Supabase 대시보드 주소에서 `/project/` 바로 뒤의 문자열을 복사합니다. 이 값이 **프로젝트 ID(project ref)**입니다. 데이터베이스 이름이나 비밀번호를 적는 곳이 아닙니다.

`package.json`과 `supabase/` 폴더가 있는 **MIG DOT 저장소 루트**를 터미널에서 연 뒤 실행합니다.

```sh
npx supabase login
```

브라우저에서 로그인하고 터미널에 `You are now logged in`이 보이면, 아래 `YOUR_PROJECT_REF`를 복사한 프로젝트 ID로 바꿔 실행합니다.

```sh
npx supabase functions deploy send-execution-reminders --project-ref YOUR_PROJECT_REF
```

`--project-ref`가 이 배포의 대상을 직접 지정하므로 `supabase link`는 생략할 수 있습니다. 대시보드에 보이는 `hello-world`는 예시 함수입니다. MIG DOT의 발송 함수는 이미 [저장소에 있습니다](functions/send-execution-reminders/index.ts). [Supabase CLI 배포 안내](https://supabase.com/docs/guides/functions/deploy)

**완료 확인** **Edge Functions → Functions** 목록을 새로고침했을 때 `send-execution-reminders`가 보이면 배포가 완료된 것입니다. CLI 로그인 성공 메시지는 이 목록을 확인하기 전까지 배포 완료 기준으로 사용하지 않습니다.

### 5. Cron에 발송 시간 등록

#### 5-1. Cron과 HTTP 확장 활성화

1. Supabase 프로젝트 왼쪽 메뉴에서 **Integrations → Cron**으로 들어갑니다. [Supabase Cron 화면](https://supabase.com/dashboard/project/_/integrations/cron/overview)
2. **Enable pg_cron**이 표시되면 누릅니다. 이미 **Jobs** 탭이 보이면 활성화된 상태입니다. [Cron 설치 안내](https://supabase.com/docs/guides/cron/install)
3. **Database → Extensions**에서 `pg_net`을 검색해 켭니다. Cron이 발송 함수에 HTTP 요청을 보내는 데 사용합니다. [pg_net 활성화 안내](https://supabase.com/docs/guides/database/extensions/pg_net)

#### 5-2. Vault에 예약 작업 값 저장

같은 Supabase 프로젝트 대시보드의 검색창에서 **Vault**를 찾아 열고, 아래 두 항목을 각각 추가합니다. 이미 항목이 있다면 기존 값을 확인하거나 수정하면 됩니다. [Supabase Vault 안내](https://supabase.com/docs/guides/database/vault)

| Vault의 Name | Value |
| --- | --- |
| `execution_push_url` | `https://YOUR_PROJECT_REF.supabase.co` 형식의 프로젝트 기본 주소. 실제 프로젝트 ID로 바꾸고 뒤에 슬래시나 함수 경로를 붙이지 않습니다. |
| `execution_push_cron_secret` | 3번 Edge Functions → Secrets에 저장한 `EXECUTION_PUSH_CRON_SECRET`과 정확히 같은 값 |

Edge Functions의 시크릿은 함수가 읽고, Vault의 시크릿은 Cron이 읽습니다. 두 화면에 같은 예약 비밀값이 있어야 요청이 인증됩니다.

#### 5-3. 예약 SQL 실행과 확인

1. **SQL Editor → New query**에서 `show cron.timezone;`을 실행해 예약 기준이 `UTC`인지 확인합니다.
2. 새 쿼리에 [예약 등록 SQL 파일](operations/schedule-execution-reminders.sql) **전체**를 붙여넣고 **Run**을 누릅니다. 파일에서 시크릿 이름으로 값을 가져오므로 비밀값을 SQL 창에 직접 붙여넣을 필요는 없습니다.
3. **Integrations → Cron → Jobs**로 돌아가 `send-execution-reminders`가 활성 상태인지 확인합니다.

예약은 08:00 UTC와 12:00 UTC, 즉 한국 시간 오후 5시와 9시에 시작합니다. 밀린 대상은 시작 후 20분까지 5분 간격으로 나누어 조회합니다. 발송을 시도한 기기는 같은 날 같은 종류의 알림을 다시 요청하지 않습니다.

### 6. 웹사이트 배포

이 단계는 사용자의 **알림 켜기** 버튼에 필요한 공개 키를 MIG DOT 웹사이트 빌드에 넣는 과정입니다.

1. 운영 MIG DOT 도메인을 배포하는 프로젝트를 엽니다.
   - **Cloudflare Pages**를 사용하는 경우 **Workers & Pages → Pages 프로젝트 → Settings**의 환경 변수 메뉴에서 **Production**에 추가합니다. [Cloudflare 빌드 환경 변수 안내](https://developers.cloudflare.com/pages/configuration/build-configuration/)
   - **Vercel**을 사용하는 경우 **Project → Settings → Environment Variables**에서 환경을 **Production**으로 선택합니다. [Vercel 환경 변수 안내](https://vercel.com/docs/environment-variables/managing-environment-variables)
2. 이름은 `VITE_EXECUTION_VAPID_PUBLIC_KEY`, 값은 3번의 `VAPID_PUBLIC_KEY`로 저장합니다. 웹사이트에는 공개 키만 넣습니다.
3. 푸시 기능 코드가 들어 있는 커밋으로 **새 운영 배포**를 실행합니다. 배포 화면에서 해당 커밋이 운영 도메인에 반영됐는지 확인합니다. 기존 배포는 환경 변수를 저장한 뒤에도 예전 빌드를 계속 사용합니다.

**완료 확인** 배포된 HTTPS 사이트에서 **익스큐셔너 → 알림 설정**을 열었을 때 발송 설정이 연결되지 않았다는 안내가 사라집니다. iPhone·iPad는 Safari에서 **홈 화면에 추가**한 후 홈 화면 아이콘으로 앱을 다시 열어야 알림 권한을 요청할 수 있습니다. Android에서는 Chrome에서 앱을 설치해 확인할 수 있습니다. [Apple 홈 화면 Web Push 안내](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

### 휴대전화에서 최종 확인

1. 홈 화면에서 MIG DOT를 열고 익스큐셔너 권한이 있는 계정으로 로그인합니다.
2. **익스큐셔너 → 알림 설정 → 알림 켜기**를 누르고 기기 권한을 허용합니다. 화면에 `이 기기에서 과업과 루틴 알림을 받습니다.`가 보이면 구독이 완료된 것입니다.
3. 한국 시간 오후 5시 전에는 미완료 과업 1개, 오후 9시 전에는 오늘 실천 기록이 없는 활성 루틴 1개를 남겨 테스트합니다. 홈 화면으로 나간 뒤 각 알림을 받고, 알림을 눌러 익스큐셔너 **오늘** 화면이 열리는지 확인합니다.

| 화면이나 로그에서 보이는 증상 | 확인할 부분 |
| --- | --- |
| 알림 설정 메뉴 자체가 없음 | 운영 배포에 푸시 기능이 들어 있는 커밋이 반영됐는지 확인합니다. |
| ‘이 환경의 푸시 발송 설정이 아직 연결되지 않았습니다’ | 6번 변수의 이름, 배포 대상 환경, 변수 저장 후 새 빌드 여부를 확인합니다. |
| 구독 저장에 실패함 | 1번 DB 마이그레이션, 로그인 계정의 익스큐셔너 권한, 기기 알림 권한을 확인합니다. |
| Cron 작업이 목록에 없음 | 5번의 Vault 이름과 예약 등록 SQL의 실행 결과를 확인합니다. |
| Cron 이력은 성공인데 알림이 없음 | Cron 성공은 HTTP 요청을 큐에 넣었다는 뜻일 수 있습니다. **Edge Functions → send-execution-reminders → Logs**에서 응답을 확인하세요. `401`이면 Vault와 함수의 예약 비밀값이 같은지 확인합니다. 정상 호출이어도 미완료·미기록 대상이 없거나 알림 권한이 꺼져 있으면 받을 알림이 없습니다. |

발송 서비스가 만료된 구독에 `404` 또는 `410`을 반환하면 해당 구독을 제거합니다. 예약 발송을 멈추려면 **Cron → Jobs**에서 `send-execution-reminders`를 비활성화합니다.
