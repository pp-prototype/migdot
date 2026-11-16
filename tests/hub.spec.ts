import { expect, test } from '@playwright/test'

const pages = [
  { path: '/meetings', title: '회의록', document: '2026-11-16 메인 허브 구성' },
  { path: '/updates', title: '개발업데이트', document: '메인 허브와 문서별 라우팅' },
  { path: '/documentations', title: '문서', document: 'MIG DOT 시작하기' },
]

test('허브와 문서 페이지의 이동·검색·새로고침', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message) })
  page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.log('Console:', message.text()) } })
  page.on('requestfailed', request => console.log('Request failed:', request.url(), request.failure()))
  page.on('response', response => { if (response.status() >= 400) console.log('HTTP error:', response.status(), response.url()) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MIG DOT', exact: true })).toBeVisible()
  await expect(page.locator('main a.card')).toHaveCount(3)
  await expect(page.getByText('첫 번째 앱을 연결할 공간이에요')).toBeVisible()
  await expect(page.locator('.recent-list a')).toHaveCount(4)
  await page.screenshot({ path: 'docs/previews/hub-desktop.png', fullPage: true })
  for (const item of pages) {
    await page.locator('main a.card').filter({ hasText: item.title }).click()
    await expect(page).toHaveURL(new RegExp(`${item.path}$`))
    await expect(page.locator('main > h1')).toHaveText(item.title)
    await expect(page.locator('article.markdown h1')).toBeVisible()
    await page.getByRole('button', { name: item.document, exact: true }).click()
    await expect(page.locator('article.markdown h1')).toHaveText(item.document)
    await page.reload()
    await expect(page.locator('article.markdown h1')).toHaveText(item.document)
    await page.screenshot({ path: `docs/previews/${item.path.slice(1)}-desktop.png`, fullPage: true })
    await page.getByRole('searchbox').fill('존재하지않는문서xyz987')
    await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible()
    await page.getByRole('searchbox').fill(item.document)
    await expect(page.locator('aside li')).toHaveCount(1)
    await expect(page.locator('article.markdown h1')).toHaveText(item.document)
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '메인', exact: true }).click()
  }
  for (const item of pages) {
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: item.title, exact: true }).click()
    await expect(page.locator('main > h1')).toHaveText(item.title)
  }
  await page.goto('/unknown-page')
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible()
  expect(errors).toEqual([])
})

test('모바일에서 모든 메뉴와 문서가 화면 안에 표시된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const item of [{ path: '/', title: '메인' }, ...pages]) {
    await page.goto(item.path)
    await expect(page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: item.title, exact: true })).toBeVisible()
    await expect(page.locator('main h1').first()).toBeVisible()
    if (item.path !== '/') await expect(page.locator('article.markdown h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/previews/${item.path === '/' ? 'hub' : item.path.slice(1)}-mobile.png`, fullPage: true })
  }
})


test('최근 기록의 본문 이동과 모바일 문서 목록 접기', async ({ page }) => {
  await page.goto('/')
  const record = page.locator('.recent-list a').first()
  const title = await record.locator('.record-title').innerText()
  await record.click()
  await expect(page.locator('article.markdown h1')).toHaveText(title)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/documentations')
  const toggle = page.getByRole('button', { name: '문서 목록' })
  await expect(page.locator('#document-list')).toBeHidden()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('searchbox').fill('MIG DOT 시작하기')
  await page.getByRole('button', { name: 'MIG DOT 시작하기', exact: true }).click()
  await expect(page.locator('#document-list')).toBeHidden()
  await expect(page.locator('article.markdown h1')).toHaveText('MIG DOT 시작하기')
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '메인', exact: true }).click()
  await expect(page).toHaveURL('/')
})
