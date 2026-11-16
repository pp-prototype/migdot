import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export class ModuleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <section role="alert"><h1>모듈을 불러오지 못했습니다.</h1><p>다시 시도하거나 홈으로 이동해 주세요.</p><button onClick={() => window.location.reload()}>새로고침</button> <Link to="/">홈으로</Link></section>
    return this.props.children
  }
}
