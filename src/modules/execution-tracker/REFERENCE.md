# 실행 트래커 최소 이식 출처

- 원본: `/Users/migdracios/overmind/apps/execution-tracker`
- 기준: HEAD `d2c9035`와 조사한 로컬 작업 트리. 원본에 수정·미추적 파일이 있어 HEAD와 동일하다고 간주하지 않는다.
- 날짜 계산: 원본 `src/storage.js`의 shiftDay를 TypeScript로 변환
- 기능 참조: 원본 `src/App.jsx`의 필수 과업/선택 루틴 구분, 과업 기준 진행률, 날짜별 과업 및 28일 수행 기록 조회
- 루틴 예시 명칭: 원본 기본 예시 3종을 참고. 수행 기록·과업은 합성된 미리보기 데이터이며 실제 저장소를 읽지 않음
- 화면: MIG DOT 공통 셸 아래 TypeScript와 CSS Modules로 새로 구성

자체 Node API, Google OAuth, SQLite, IndexedDB, 저장 훅, 서비스 워커, PWA manifest, 픽셀 글꼴과 캐릭터는 가져오지 않았다. 완료 처리·생성·수정·삭제·집중 실행·이관은 제공하지 않는다. 공통 인증·단일 Supabase·집중 세션과 오프라인 정책을 결정하기 전의 읽기 전용 미리보기다.
