# 모듈 개발 안내

## 코드 구조

- `src/shell/`: 공통 레이아웃, 홈, 라우팅, 모듈 등록
- `src/modules/`: 기능 모듈의 UI·상태·비즈니스 로직
- `src/shared/`: 모듈 공통 서비스와 오류 경계
- `docs/`: Markdown 원본 문서
- `supabase/migrations/`: 향후 데이터베이스 마이그레이션

## 모듈 추가

1. `src/modules/<모듈명>/`에 기본 export 페이지를 작성합니다.
2. `src/shell/modules.ts`에 고유 ID, 제목, 설명, 경로와 `lazy` import를 등록합니다. 기능 앱은 `kind: app`, 기록 페이지는 `kind: records`로 구분합니다.
3. `docs/documentations/<모듈명>/`에 현재 제공 기능과 사용법을 작성합니다.
4. 주요 결정은 `docs/meetings/`, 변경 결과는 `docs/updates/`에 기록합니다.
5. `npm run check`로 검증합니다.

등록된 기능 앱은 내 앱 카드와 하위 경로 라우트에, 기록 페이지는 안내 카드와 공통 메뉴에 반영되며 지연 로딩 및 오류 경계가 적용됩니다. 모듈끼리 내부 코드를 직접 참조하지 말고 공통 기능은 `shared/`로 추출합니다. Routine, Game, Finance는 설계 문서의 예시이며 아직 구현하지 않았습니다.

## 문서 작성

문서의 첫 번째 `# 제목`을 목록 제목으로 사용합니다. Documentation은 모듈별 폴더로 원본을 관리하며 현재 UI는 유형별 문서 목록을 제공합니다. 계층형 탐색 UI와 관련 모듈 연결은 후속 개발입니다. 회의록 및 업데이트는 날짜가 포함된 파일명을 권장합니다.

## 모듈 접근 권한

모든 현재 모듈은 `access: restricted`이며 공통 접근 가드로 감쌉니다. 실제 권한은 DB의 `app_modules`와 `app_module_grants`를 기준으로 조회합니다. 새 모듈 추가 시 SQL 마이그레이션에 모듈 ID도 등록해야 합니다. owner도 DB에서 활성화한 모듈만 엽니다.

업무 데이터는 `can_access_module(모듈ID)`와 행 소유권을 함께 확인하는 RLS가 필요합니다. 프런트엔드 카드 숨김은 API 보호나 정적 소스 보호를 대체하지 않습니다. 권한을 `user_metadata`나 임의 localStorage 값으로 부여하지 않습니다.
