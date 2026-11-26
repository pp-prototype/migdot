# MIG DOT 시작하기

## 개발 환경

Node.js 22.12 이상과 npm이 필요합니다. `.nvmrc`는 Node.js 22를 지정합니다.

```sh
nvm use
npm ci
npm run dev
```

터미널에 출력되는 로컬 주소를 엽니다. `npm run dev`는 프로젝트의 Supabase 설정을 읽습니다.

DB 연결 없이 화면을 확인할 때는 다음 명령을 실행합니다.

```sh
npm run dev:local
```

이 모드에서는 프로젝트에 Supabase 설정이 있어도 연결하지 않습니다. 익스큐셔너의 예시 과업 등록·수정·완료와 준비된 루틴의 실천 체크, 회고는 브라우저 메모리에만 반영됩니다. 새로고침하거나 앱을 나가면 초기화됩니다. 개인 클라우드의 새 루틴 등록, 상세 기록, 레벨은 클라우드 화면에서 확인합니다.

홈 앱 카드와 상단의 ‘내 앱’ 메뉴에 같은 앱 목록을 표시합니다. 메타 월렛은 이용 권한이 부여된 계정에서 열 수 있습니다. 지출 일기와 돈 계획은 로그인한 계정의 개인 지갑에 저장됩니다. 권한이 필요한 앱은 로그인한 계정의 권한에 따라 표시되며 로컬 체험에서는 체험할 수 있는 앱이 표시됩니다. 현재 앱은 밑줄로 표시하며 모션 줄이기 설정을 반영합니다.

Supabase 설정이 전혀 없는 일반 개발 서버는 안내와 함께 예시 체험으로 실행됩니다. 배포 빌드에서 보호 모듈을 이용하려면 공통 로그인 설정이 필요합니다.

## 메인 허브와 경로

- `/` 홈에서 이용 가능한 앱과 최근 기록을 엽니다. 최근 기록을 누르면 해당 문서 본문으로 이동합니다.
- `/meetings`: `docs/meetings/`의 회의록 조회
- `/updates`: `docs/updates/`의 개발업데이트 조회
- `/documentations`: `docs/documentations/`의 사용 문서 조회

데스크톱에서는 상단 메뉴, 모바일에서는 하단 고정 메뉴로 페이지를 전환할 수 있습니다. 초록색 앱 탭에는 현재 이용할 수 있는 앱만 표시됩니다. 탭을 누르면 해당 앱으로 이동하고, 페이지를 스크롤해도 화면 상단에서 앱을 전환할 수 있습니다. 각 문서 페이지에서 제목·본문을 검색하고 목록에서 문서를 선택합니다. 모바일에서는 본문 위의 ‘문서 목록’을 눌러 검색과 목록을 펼칩니다. 문서를 선택하면 목록은 접힙니다. 선택한 문서는 URL의 `doc` 매개변수로 유지됩니다.

## 앱별 사용 안내

| 앱 | 사용 흐름 |
|---|---|
| [포스트잇 러너](../post-it-learner/overview.md) | 학습 주제를 만들고 보드에 포스트잇을 기록합니다. |
| [익스큐셔너](../execution-tracker/overview.md) | 과업·루틴·회고를 기록하고 기기별 알림을 설정합니다. |
| [메타 월렛](../meta-wallet/overview.md) | 오늘 생활비를 확인하고 지출 일기와 돈 계획을 작성합니다. |
| [결심 출격 관제실](../resolve-launch/overview.md) | 내가 정한 조건을 확인하고 출격을 승인하거나 보류합니다. |
| [스틸라](../stilla/overview.md) | 만나고 배운 단어를 모아 예문과 함께 복습합니다. |
| [가을 편지](../autumn-letter/overview.md) | 별도 주소에서 입장 코드를 입력해 체험을 시작합니다. |

## 문서 조회

검색은 빌드에 포함된 Markdown 본문을 대상으로 브라우저에서 실행합니다. 문서 파일을 수정하면 개발 서버 또는 다음 빌드에 반영됩니다. 원시 HTML은 렌더링하지 않습니다. 문서 원본은 공개 배포 시 누구나 읽을 수 있으므로 비밀 정보나 개인 데이터를 넣지 않습니다.

## Supabase 연결

`.env.example`을 `.env.local`로 복사하고 프로젝트 URL 및 publishable key를 설정한 뒤 개발 서버를 재시작합니다. 이 키는 클라이언트에 포함되는 공개용 키입니다. secret key 또는 service_role key를 입력하지 않습니다.

공통 Google 로그인·모듈 접근 제한과 권한 SQL이 준비되어 있습니다. 실제 OAuth 공급자와 프로젝트 연결, 마이그레이션 적용 및 첫 운영자 지정은 저장소의 `supabase/README.md`를 따릅니다. 익스큐셔너, 포스트잇 러너, 메타 월렛, 스틸라의 개인 기록은 각 모듈의 Supabase 마이그레이션을 적용한 환경에서 사용할 수 있습니다.

## 검증 및 빌드

```sh
npm run check
npm run preview
```

`check`는 ESLint, TypeScript 검사, Vite 프로덕션 빌드를 실행합니다. `npm run test:access`는 임시 메모리 PostgreSQL에서 권한 SQL을 검증합니다. 빌드 결과는 `dist/`에 생성됩니다. GitHub Actions에서도 같은 검사를 실행합니다.

## 배포 설정

Vercel이나 Cloudflare Pages에 Git 저장소를 연결할 때 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`, Node 버전은 `22`를 사용합니다. Supabase 사용 시 해당 환경 변수를 빌드 환경에 설정합니다. SPA 경로 처리는 Vercel의 `vercel.json`과 Cloudflare Pages의 `public/_redirects`에서 설정합니다.

## 문제 해결

- Node 버전 오류: `nvm use` 후 `npm ci`로 다시 설치합니다.
- Supabase 미설정 표시: `.env.local`의 두 값을 확인하고 서버를 재시작합니다.
- 문서가 보이지 않음: `docs/documentations/`, `docs/meetings/`, `docs/updates/` 아래 `.md` 파일인지 확인합니다.

## 브라우저 검증

Google Chrome이 설치된 환경에서 `npm run test:ui`를 실행합니다. Playwright가 설정 없는 체험 서버 5177, 테스트 인증 서버 5176, 배포 빌드 서버 4175를 실행합니다. 기존 개발 서버를 켜 둔 경우 이 세 테스트 포트와 충돌하지 않게 합니다. 익스큐셔너 저장 테스트는 실제 마이그레이션을 실행한 로컬 PostgreSQL 엔진(PGlite)에 연결하며 원격 업무 기록을 변경하지 않습니다. 데스크톱·모바일 스크린샷은 `docs/previews/`에 저장됩니다.

의존성 설치 후 개발 서버에서 빈 화면과 `Outdated Optimize Dep` 오류가 발생하면 서버를 종료하고 `npm run dev -- --force`로 캐시를 갱신합니다.
