import { expect, test } from '@playwright/test'
import { days, sampleDay, shiftDay, taskProgress, validDay } from '../src/modules/execution-tracker/data'

test('실행 미리보기의 과업·루틴 구분과 날짜별 기록 탐색', async ({ page }) => {
  const errors: string[] = []
  const dataRequests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('supabase.co') || new URL(request.url()).pathname.startsWith('/api/')) dataRequests.push(request.url()) })
  await page.goto('/')
  await page.locator('.apps-section').getByRole('link', { name: /실행 트래커/ }).click()
  await expect(page).toHaveURL('/execution-tracker')
  const initialStorage = await page.evaluate(async () => JSON.stringify({ local: { ...localStorage }, databases: await indexedDB.databases() }))
  await expect(page.getByText('예시 기록을 살펴보는 읽기 전용 화면입니다.', { exact: false })).toBeVisible()
  const progress = page.getByRole('progressbar', { name: '필수 과업 완료' })
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(progress).toHaveAttribute('aria-valuemax', '3')
  await expect(page.getByRole('heading', { name: '2개의 과업이 남았어요' })).toBeVisible()
  await expect(page.getByRole('region', { name: '필수 과업' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('region', { name: '선택 루틴' }).getByRole('listitem')).toHaveCount(3)
  await page.screenshot({ path: 'docs/previews/tracker-today-desktop.png', fullPage: true })
  await page.getByRole('navigation', { name: '실행 트래커 메뉴' }).getByRole('link', { name: '기록', exact: true }).click()
  await expect(page).toHaveURL('/execution-tracker/records')
  await expect(page.locator('[aria-label="최근 28일 실천 기록"] button')).toHaveCount(28)
  await expect(page.getByRole('button', { name: `${days[0]} 생성 전`, exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '건강한 한 끼 기록', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(`${sampleDay} · 기록 없음`)
  await page.getByRole('button', { name: '이전 날짜', exact: true }).click()
  await expect(page.getByRole('heading', { name: '2026-11-15 과업', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '건강한 한 끼 기록', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('조회 날짜', { exact: true })).toHaveValue('2026-11-15')
  await page.screenshot({ path: 'docs/previews/tracker-records-desktop.png', fullPage: true })
  await page.getByLabel('조회 날짜', { exact: true }).fill('2026-11-01')
  await expect(page.getByText('이 날짜에는 등록한 과업이 없습니다.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '기준일', exact: true }).click()
  await expect(page.getByRole('button', { name: '다음 날짜', exact: true })).toBeDisabled()
  await page.goto('/execution-tracker/records?date=2026-02-30&routine=missing')
  await expect(page.getByLabel('조회 날짜', { exact: true })).toHaveValue(sampleDay)
  expect(await page.evaluate(async () => JSON.stringify({ local: { ...localStorage }, databases: await indexedDB.databases() }))).toBe(initialStorage)
  expect(errors).toEqual([])
  expect(dataRequests).toEqual([])
  await page.goto('/execution-tracker/unknown')
  await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeVisible()
  await page.getByRole('link', { name: '← MIG DOT 메인' }).click()
  await expect(page).toHaveURL('/')
})

test('실행 미리보기 모바일 레이아웃과 공통 메뉴 유지', async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    for (const path of ['/execution-tracker', '/execution-tracker/records']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: '실행 트래커', exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (width === 390) await page.screenshot({ path: `docs/previews/tracker-${path.endsWith('records') ? 'records' : 'today'}-mobile.png`, fullPage: true })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link')).toHaveCount(4)
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '메인', exact: true }).click()
  await page.locator('.apps-section').getByRole('link', { name: /포스트잇 러너/ }).click()
  await expect(page.getByRole('heading', { name: '포스트잇 러너', exact: true })).toBeVisible()
})

test('날짜 경계와 필수 과업 진행률', () => {
  expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
  expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29')
  expect(validDay('2026-02-30')).toBe(false)
  expect(validDay('not-a-date')).toBe(false)
  expect(taskProgress([])).toEqual({ done: 0, total: 0, remaining: 0, percent: 0 })
  expect(taskProgress([{ id: 'a', date: sampleDay, title: '예시', done: true }])).toEqual({ done: 1, total: 1, remaining: 0, percent: 100 })
})
