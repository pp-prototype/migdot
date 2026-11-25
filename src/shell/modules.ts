import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const ReportsPage = lazy(() => import('../modules/reports/ReportsPage'))
type AppShortcut = { id: string; title: string; description: string; path: string; icon?: string }
type Module = AppShortcut & { access: 'restricted'; kind: 'records' | 'app'; component: LazyExoticComponent<ComponentType> }
export const modules: Module[] = [
  { access: 'restricted', kind: 'records', id: 'meetings', title: '회의록', description: '프로젝트 논의와 의사결정의 배경을 확인합니다.', path: '/meetings', component: ReportsPage },
  { access: 'restricted', kind: 'records', id: 'updates', title: '개발업데이트', description: '기능 변경과 개발 진행 내용을 확인합니다.', path: '/updates', component: ReportsPage },
  { access: 'restricted', kind: 'records', id: 'documentations', title: '문서', description: 'MIG DOT와 모듈 앱의 사용 방법을 확인합니다.', path: '/documentations', component: ReportsPage },
  { access: 'restricted', kind: 'app', id: 'post-it-learner', title: '포스트잇 러너', description: '학습 주제별로 작은 배움을 기록하고 다시 찾아보세요.', path: '/post-it-learner', component: lazy(() => import('../modules/post-it-learner/LearnerPage')) },
  { access: 'restricted', kind: 'app', id: 'execution-tracker', title: '익스큐셔너 · 실행 트래커', description: '귀여운 집행관과 작은 실행, 하루의 마감을 함께하세요.', path: '/execution-tracker', component: lazy(() => import('../modules/execution-tracker/TrackerPage')) },
  { access: 'restricted', kind: 'app', id: 'meta-wallet', title: '메타 월렛', description: '오늘 생활비를 확인하고 지출 일기와 돈 계획을 써 보세요.', path: '/meta-wallet', icon: 'wallet', component: lazy(() => import('../modules/meta-wallet/WalletPage')) },
]

export function availableApps(canAccess: (id: string) => boolean): AppShortcut[] {
  return modules.filter(module => module.kind === 'app' && canAccess(module.id))
}
