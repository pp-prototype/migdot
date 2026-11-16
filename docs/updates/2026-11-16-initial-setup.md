# v0.1.0 개발 기반 구성

- 변경일: 2026-11-16 (Asia/Seoul)
- 대상: 앱 셸, 공통 서비스, 문서 모듈, 개발 환경
- 버전: package.json v0.1.0 · 커밋 전 작업
- 상태: AI 작성 초안 · 개발자 검토 대기

## 변경 사항

React·TypeScript·Vite와 Tailwind CSS를 설정하고 공통 홈, 내비게이션, 모듈 등록 및 라우팅을 추가했다. 모듈 단위 지연 로딩과 오류 경계를 적용했다.

문서 모듈에서 세 유형의 Markdown을 표시하고 제목·본문 검색을 제공한다. Supabase 공개 클라이언트 설정 예제와 마이그레이션 디렉터리를 마련했다. ESLint, 타입 검사, 프로덕션 빌드 및 GitHub Actions CI를 구성했다.

## 사용자 경험과 호환성

환경 변수 없이 홈과 개발 문서를 열 수 있다. 기존 앱과 데이터는 아직 이식하지 않았다. 기존 설계 원칙은 Readme.md에 보존한다.

## 검증 및 알려진 제약

`npm run check`로 ESLint, TypeScript 검사, 프로덕션 빌드가 통과했다. `git diff --check`도 통과했다. `npm audit fix` 적용 후에도 개발 도구 typescript-eslint의 minimatch 의존성에 중간 등급 취약점 7건이 남아 있다. 호환성 변경을 수반하는 강제 자동 수정은 적용하지 않았다. 실제 로그인, DB 저장, 개인 데이터 접근 제어, 외부 호스팅 배포는 미구현이다. 브라우저 화면 및 실제 Supabase 연결은 별도 검증이 필요하다.
