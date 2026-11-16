import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'))
type Module = { id: string; title: string; description: string; path: string; component: LazyExoticComponent<ComponentType> }
export const modules: Module[] = [
  { id: 'meetings', title: '회의록', description: '프로젝트 논의와 의사결정의 배경을 확인합니다.', path: '/meetings', component: ReportsPage },
  { id: 'updates', title: '개발업데이트', description: '기능 변경과 개발 진행 내용을 확인합니다.', path: '/updates', component: ReportsPage },
  { id: 'documentations', title: '문서', description: 'MIG DOT와 모듈 앱의 사용 방법을 확인합니다.', path: '/documentations', component: ReportsPage },
]
