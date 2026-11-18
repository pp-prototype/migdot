import { expect, test, type Page } from '@playwright/test'
import { safeReturnPath, parseAccess } from '../src/shared/auth/access'

test.use({ baseURL: 'http://127.0.0.1:5176' })
const userId = '22222222-2222-4222-8222-222222222222'
const guestId = '33333333-3333-4333-8333-333333333333'
async function mockAuth(page: Page, options: { signedIn?: boolean; role?: 'owner' | 'member'; approved?: boolean; moduleIds?: string[]; delay?: number } = {}) {
  const user = { id: userId, email: 'tester@example.invalid', aud: 'authenticated', role: 'authenticated', created_at: '2026-11-17T00:00:00Z', app_metadata: { provider: 'google' }, user_metadata: { role: 'owner' } }
  const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: userId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test-signature`
  const session = { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
  const control = { fail: false, mismatch: false, moduleIds: options.moduleIds ?? ['post-it-learner'], exchanges: 0, verifier: '', approved: options.approved ?? true, members: [{ user_id: guestId, email: 'friend@example.invalid', role: 'member', active: false, module_ids: [] as string[] }] }
  if (options.signedIn !== false) await page.addInitScript(value => localStorage.setItem('migdot-127-0-0-1-54329-auth', JSON.stringify(value)), session)
  await page.route('http://127.0.0.1:54329/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'content-type': 'application/json' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '{}' })
    const json = (value: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(value) })
    if (path === '/auth/v1/user') return json(user)
    if (path === '/auth/v1/token') { control.exchanges++; control.verifier = request.postDataJSON().code_verifier; return json(session) }
    if (path === '/auth/v1/logout') return json({})
    if (path === '/auth/v1/authorize') return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Mock Google login redirect</p>' })
    if (path.endsWith('/get_app_access')) {
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay))
      if (control.fail) return json({ message: 'Unavailable' }, 503)
      return json({ user_id: control.mismatch ? guestId : userId, approved: control.approved, role: control.approved ? options.role ?? 'member' : null, module_ids: control.approved ? control.moduleIds : [] })
    }
    if (path.endsWith('/admin_list_app_members')) return json(control.members)
    if (path.endsWith('/admin_set_app_member')) {
      const body = request.postDataJSON()
      control.members[0].active = body.approved
      if (!body.approved) control.members[0].module_ids = []
      return json(null)
    }
    if (path.endsWith('/admin_set_module_access')) {
      const body = request.postDataJSON()
      control.members[0].module_ids = body.allowed ? [...control.members[0].module_ids, body.target_module] : control.members[0].module_ids.filter(id => id !== body.target_module)
      return json(null)
    }
    return json({ message: 'Unexpected test request' }, 400)
  })
  return control
}

test('비로그인은 홈에서 보호 모듈을 보지 못하고 직접 주소는 로그인으로 연결된다', async ({ page }) => {
  await mockAuth(page, { signedIn: false })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '로그인하고 나의 앱을 확인하세요' })).toBeVisible()
  await expect(page.locator('main a.card')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link')).toHaveCount(1)
  await page.goto('/post-it-learner')
  await expect(page).toHaveURL('/login?next=%2Fpost-it-learner')
  await expect(page.getByRole('button', { name: 'Google로 계속하기' })).toBeVisible()
  await page.screenshot({ path: 'docs/previews/login-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'docs/previews/login-mobile.png', fullPage: true })
})

test('승인·모듈 권한·운영자 권한은 사용자 메타데이터와 분리된다', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/')
  await expect(page.locator('main a.card')).toHaveCount(1)
  await expect(page.locator('.apps-section').getByRole('link', { name: /포스트잇 러너/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /권한 관리/ })).toHaveCount(0)
  await page.goto('/execution-tracker/records')
  await expect(page.getByRole('heading', { name: '이 공간의 이용 권한이 필요합니다.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '익스큐셔너', exact: true })).toHaveCount(0)
  await page.goto('/settings/access')
  await expect(page.getByRole('heading', { name: '이 공간의 이용 권한이 필요합니다.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '사용자와 모듈 권한' })).toHaveCount(0)
})

test('승인 대기, 권한 조회 실패와 계정 불일치는 차단 상태를 유지한다', async ({ page }) => {
  const control = await mockAuth(page, { approved: false })
  await page.goto('/post-it-learner')
  await expect(page.getByText(/운영자가 권한 관리 화면에서 계정을 확인하고 승인할 수 있습니다/)).toBeVisible()
  control.approved = true; control.fail = true
  await page.getByRole('button', { name: '권한 다시 확인' }).click()
  await expect(page.getByRole('heading', { name: '접근 권한을 확인하지 못했습니다.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toHaveCount(0)
  control.fail = false; control.mismatch = true
  await page.getByRole('button', { name: '다시 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '접근 권한을 확인하지 못했습니다.' })).toBeVisible()
})

test('권한 확인 전에는 콘텐츠가 노출되지 않고 회수 후에는 모듈이 해제된다', async ({ page }) => {
  const control = await mockAuth(page, { delay: 400 })
  await page.goto('/post-it-learner')
  await expect(page.getByRole('status')).toHaveText('접근 권한을 확인하는 중입니다…')
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
  control.moduleIds = []
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading', { name: '이 공간의 이용 권한이 필요합니다.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toHaveCount(0)
})

test('로그아웃은 보호 모듈과 저장된 인증 세션을 제거한다', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/post-it-learner')
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(page).toHaveURL('/login?next=%2Fpost-it-learner')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('migdot-127-0-0-1-54329-auth'))).toBeNull()
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toHaveCount(0)
})

test('운영자는 승인과 모듈 권한을 서버 RPC로 부여·회수한다', async ({ page }) => {
  const control = await mockAuth(page, { role: 'owner', moduleIds: ['meetings', 'updates', 'documentations', 'post-it-learner', 'execution-tracker'] })
  await page.goto('/settings/access')
  await expect(page.getByRole('heading', { name: '사용자와 모듈 권한' })).toBeVisible()
  await page.getByRole('button', { name: '승인됨', exact: true }).click()
  await expect(page.getByText('조건에 맞는 사용자가 없습니다.')).toBeVisible()
  await page.getByRole('button', { name: '승인 대기 / 중지', exact: true }).click()
  await page.getByRole('searchbox', { name: '사용자 검색' }).fill('missing@example.invalid')
  await expect(page.getByText('조건에 맞는 사용자가 없습니다.')).toBeVisible()
  await page.getByRole('searchbox', { name: '사용자 검색' }).fill('friend@example.invalid')
  await expect(page.getByRole('heading', { name: 'friend@example.invalid' })).toBeVisible()
  await page.getByRole('button', { name: '전체', exact: true }).click()
  const member = page.locator('article').filter({ hasText: 'friend@example.invalid' })
  await member.getByRole('button', { name: '이용 승인', exact: true }).click()
  await expect(member.getByRole('checkbox', { name: '포스트잇 러너', exact: true })).toBeEnabled()
  await member.getByRole('checkbox', { name: '포스트잇 러너', exact: true }).click()
  await expect.poll(() => control.members[0].module_ids).toEqual(['post-it-learner'])
  await expect(member.getByRole('checkbox', { name: '포스트잇 러너', exact: true })).toBeChecked()
  await member.getByRole('button', { name: '이용 승인 취소', exact: true }).click()
  await expect(member.getByRole('checkbox', { name: '포스트잇 러너', exact: true })).toBeDisabled()
  expect(control.members[0].module_ids).toEqual([])
  await page.screenshot({ path: 'docs/previews/access-admin-desktop.png', fullPage: true })
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'docs/previews/access-admin-mobile.png', fullPage: true })
})

test('PKCE 콜백은 한 번만 교환하고 원래 모듈로 복귀하며 외부 리디렉션을 허용하지 않는다', async ({ page }) => {
  const control = await mockAuth(page, { signedIn: false })
  await page.addInitScript(() => {
    localStorage.setItem('migdot-127-0-0-1-54329-auth-code-verifier', JSON.stringify('wrong-flow-verifier'))
    localStorage.setItem('migdot-127-0-0-1-54329-auth-flow-test-flow-1234-code-verifier', JSON.stringify('correct-flow-verifier'))
  })
  await page.goto('/auth/callback?code=test-code&sb_flow_id=test-flow-1234&next=%2Fpost-it-learner')
  await expect(page).toHaveURL('/post-it-learner')
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
  expect(control.exchanges).toBe(1)
  expect(control.verifier).toBe('correct-flow-verifier')
  await page.goto('/auth/callback?error=access_denied&next=https%3A%2F%2Fevil.invalid')
  await expect(page.getByRole('heading', { name: '로그인을 완료하지 못했습니다.' })).toBeVisible()
  await expect(page).toHaveURL('/auth/callback')
  await expect(page.getByRole('link', { name: '로그인 다시 시작' })).toHaveAttribute('href', '/login?next=%2F')
})

test('배포 빌드는 설정이 없어도 로컬 체험 권한으로 열리지 않는다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4175/post-it-learner')
  await expect(page.getByRole('heading', { name: '로그인 설정이 필요합니다.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toHaveCount(0)
  await expect(page.getByText('로컬 개발 체험', { exact: false })).toHaveCount(0)
})

test('리디렉션과 권한 응답 검증', () => {
  for (const value of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/login?next=/login', '/auth/callback', 'javascript:alert(1)']) expect(safeReturnPath(value)).toBe('/')
  expect(safeReturnPath('/execution-tracker/records?date=2026-11-16')).toBe('/execution-tracker/records?date=2026-11-16')
  expect(() => parseAccess({ user_id: guestId, approved: true, role: 'owner', module_ids: ['meetings'] }, userId)).toThrow()
  expect(() => parseAccess({ user_id: userId, approved: false, role: null, module_ids: ['meetings'] }, userId)).toThrow()
})

for (const callbackPath of ['/auth/callback', '/']) {
  test(`Google 로그인은 ${callbackPath} 복귀 후 원래 요청한 화면을 연다`, async ({ page }) => {
    const control = await mockAuth(page, { signedIn: false })
    await page.goto('/login?next=%2Fpost-it-learner')
    await page.getByRole('button', { name: 'Google로 계속하기' }).click()
    await expect(page).toHaveURL(/http:\/\/127\.0\.0\.1:54329\/auth\/v1\/authorize/)
    const request = new URL(page.url())
    expect(request.searchParams.get('provider')).toBe('google')
    expect(request.searchParams.get('code_challenge_method')).toBe('s256')
    expect(request.searchParams.get('code_challenge')).toBeTruthy()
    const redirect = new URL(request.searchParams.get('redirect_to')!)
    expect(redirect.origin).toBe('http://127.0.0.1:5176')
    expect(redirect.pathname).toBe('/auth/callback')
    expect(redirect.search).toBe('')
    redirect.pathname = callbackPath
    redirect.searchParams.set('code', 'test-code')
    await page.goto(redirect.toString())
    await expect(page).toHaveURL('/post-it-learner')
    await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
    expect(control.exchanges).toBe(1)
    expect(control.verifier).toBeTruthy()
    await page.reload()
    await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
  })
}

test('같은 브라우저의 다른 탭도 로그아웃을 수신해 보호 화면을 해제한다', async ({ page }) => {
  await mockAuth(page)
  await page.goto('/post-it-learner')
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
  const peer = await page.context().newPage()
  await mockAuth(peer)
  await peer.goto('http://127.0.0.1:5176/post-it-learner')
  await expect(peer.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(peer).toHaveURL('http://127.0.0.1:5176/login?next=%2Fpost-it-learner')
  await expect(peer.getByRole('heading', { name: '포스트잇 러너', exact: true })).toHaveCount(0)
  await peer.close()
})
