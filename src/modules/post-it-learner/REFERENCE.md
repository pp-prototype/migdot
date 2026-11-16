# 최소 이식 출처와 경계

- 원본: `/Users/migdracios/overmind/apps/post-it-learner`
- 기준 커밋: `f304de0` (참조 및 이식 시 원본 작업 트리 변경 없음)
- 예시 데이터: 원본 `src/main.jsx`의 고정 initial 데이터. 개인 브라우저 기록은 읽지 않음
- 기본 일러스트: 원본 `public/images/{react,design,english}.svg`
- 배치와 페이지 계산: 원본 `src/board-layout.mjs`의 boardPage 및 notePosition을 TypeScript로 변환
- 상세 다이얼로그: 원본 Dialog의 네이티브 dialog 및 포커스 복원 방식을 참고

원본 루트 엔트리, 전역 CSS, Supabase 클라이언트, 저장 훅, 저장소 클래스, SQL, 실제 환경 변수는 가져오지 않았다. MIG DOT 공통 셸 아래의 읽기 전용 화면과 CSS Modules를 별도로 작성했다. 예시 UI는 원본 자산과 배치 코드만으로 표시하며 저장 서비스와 분리했다.

공통 로그인·인가, 운영 테이블, Storage 정책과 최종 보드 UX는 후속 작업이다. 원본 계정이나 localStorage에 자동 접근하거나 이관하지 않는다.
