import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'))
type Module = { kind: 'records' | 'app'; id: string; title: string; description: string; path: string; component: LazyExoticComponent<ComponentType> }
export const modules: Module[] = [
  { kind: 'records', id: 'meetings', title: '회의록', description: '프로젝트 논의와 의사결정의 배경을 확인합니다.', path: '/meetings', component: ReportsPage },
  { kind: 'records', id: 'updates', title: '개발업데이트', description: '기능 변경과 개발 진행 내용을 확인합니다.', path: '/updates', component: ReportsPage },
  { kind: 'records', id: 'documentations', title: '문서', description: 'MIG DOT와 모듈 앱의 사용 방법을 확인합니다.', path: '/documentations', component: ReportsPage },
  { kind: 'app', id: 'post-it-learner', title: '포스트잇 러너', description: '학습 대상과 작은 배움을 보드에서 살펴보세요.', path: '/post-it-learner', component: lazy(() => import('../modules/post-it-learner/LearnerPage')) },
  { kind: 'app', id: 'execution-tracker', title: '실행 트래커', description: '오늘의 과업과 루틴, 쌓이는 실천 기록을 살펴보세요.', path: '/execution-tracker', component: lazy(() => import('../modules/execution-tracker/TrackerPage')) },
]
