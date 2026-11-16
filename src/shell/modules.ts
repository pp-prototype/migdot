import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type Module = { id: string; title: string; description: string; path: string; component: LazyExoticComponent<ComponentType> }
export const modules: Module[] = [
  { id: 'reports', title: '기록과 문서', description: '회의록, 개발 업데이트, 현재 기능의 사용 설명서', path: '/reports', component: lazy(() => import('../modules/reports/ReportsPage')) },
]
