# MIG DOT 시작하기

## 개발 환경

Node.js 22.12 이상과 npm이 필요합니다. `.nvmrc`는 Node.js 22를 지정합니다.

```sh
nvm use
npm ci
npm run dev
```

터미널에 출력되는 로컬 주소를 엽니다. Supabase 설정 없이 홈과 문서 조회를 사용할 수 있습니다.

## 메인 허브와 경로

- `/`: MIG DOT 제목, 개인용 앱 영역, 기록과 안내 바로가기, 최근 기록을 표시합니다. 현재는 포스트잇 러너의 예시 데이터 미리보기를 제공하며 개인 기록은 저장하지 않습니다. 최근 기록을 누르면 해당 문서 본문으로 이동합니다.
- `/meetings`: `docs/meetings/`의 회의록 조회
- `/updates`: `docs/updates/`의 개발업데이트 조회
- `/documentations`: `docs/documentations/`의 사용 문서 조회

데스크톱에서는 상단 메뉴, 모바일에서는 하단 고정 메뉴로 페이지를 전환할 수 있습니다. 각 문서 페이지에서 제목·본문을 검색하고 목록에서 문서를 선택합니다. 모바일에서는 본문 위의 ‘문서 목록’을 눌러 검색과 목록을 펼칩니다. 문서를 선택하면 목록은 접힙니다. 선택한 문서는 URL의 `doc` 매개변수로 유지됩니다.

## 현재 제공하는 기능

- 공통 홈 및 내비게이션
- 문서 모듈의 지연 로딩과 오류 경계
- 회의록, 개발 업데이트, Documentation 유형별 탐색
- Markdown 본문 표시 및 제목·본문 검색
- 문서 선택 상태를 URL에 저장

검색은 빌드에 포함된 Markdown 본문을 대상으로 브라우저에서 실행합니다. 문서 파일을 수정하면 개발 서버 또는 다음 빌드에 반영됩니다. 원시 HTML은 렌더링하지 않습니다. 문서 원본은 공개 배포 시 누구나 읽을 수 있으므로 비밀 정보나 개인 데이터를 넣지 않습니다.

## 선택 설정: Supabase

`.env.example`을 `.env.local`로 복사하고 프로젝트 URL 및 publishable key를 설정한 뒤 개발 서버를 재시작합니다. 이 키는 클라이언트에 포함되는 공개용 키입니다. secret key 또는 service_role key를 입력하지 않습니다.

현재는 공통 클라이언트만 준비되어 있으며 로그인, 접근 제한, DB 저장 기능은 없습니다. 개인 데이터 기능을 추가하기 전에 인증 및 RLS를 구현하고 검증해야 합니다.

## 검증 및 빌드

```sh
npm run check
npm run preview
```

`check`는 ESLint, TypeScript 검사, Vite 프로덕션 빌드를 실행합니다. 빌드 결과는 `dist/`에 생성됩니다. GitHub Actions에서도 같은 검사를 실행합니다.

## Cloudflare Pages 설정

Git 저장소를 연결할 때 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`, Node 버전은 `22`를 사용합니다. Supabase 사용 시 해당 환경 변수를 빌드 환경에 설정합니다. SPA 경로 처리를 위한 `public/_redirects`를 포함합니다. 실제 호스팅 연결과 배포 검증은 아직 진행하지 않았습니다.

## 문제 해결

- Node 버전 오류: `nvm use` 후 `npm ci`로 다시 설치합니다.
- Supabase 미설정 표시: `.env.local`의 두 값을 확인하고 서버를 재시작합니다.
- 문서가 보이지 않음: `docs/documentations/`, `docs/meetings/`, `docs/updates/` 아래 `.md` 파일인지 확인합니다.

## 브라우저 검증

Google Chrome이 설치된 환경에서 `npm run test:ui`를 실행합니다. Playwright가 로컬 5175 포트의 서버를 실행하거나 실행 중인 서버를 사용합니다. 데스크톱·모바일 스크린샷은 `docs/previews/`에 저장됩니다.

의존성 설치 후 개발 서버에서 빈 화면과 `Outdated Optimize Dep` 오류가 발생하면 서버를 종료하고 `npm run dev -- --force`로 캐시를 갱신합니다.
