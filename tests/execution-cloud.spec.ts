import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { dayRows, elapsedDays, parseWorkspace, seoulDay, type Workspace } from '../src/modules/execution-tracker/workspace'

test.use({ baseURL: 'http://127.0.0.1:5176' })
const uid = '22222222-2222-4222-8222-222222222222'
async function setup(page: Page) {
  const db = await PGlite.create()
  for (const file of ['supabase/tests/bootstrap.sql', 'supabase/migrations/202611170001_common_auth_access.sql', 'supabase/migrations/202611170002_executioner_workspace.sql', 'supabase/migrations/202611220001_execution_routine_goals.sql', 'supabase/migrations/202611220002_execution_habit_coaching.sql']) await db.exec(await readFile(file, 'utf8'))
  await db.exec(`insert into auth.users(id,email) values('${uid}','tester@example.invalid'); insert into public.app_members(user_id,role) values('${uid}','owner'); select set_config('request.jwt.claim.sub','${uid}',false);`)
  const user = { id: uid, email: 'tester@example.invalid', aud: 'authenticated', role: 'authenticated', created_at: '2026-11-17T00:00:00Z', app_metadata: { provider: 'google' }, user_metadata: {} }
  const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }))}.test-signature`
  await page.addInitScript(value => localStorage.setItem('migdot-127-0-0-1-54329-auth', JSON.stringify(value)), { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user })
  const controls = { conflict: false, failRead: false, loseResponse: false }
  await page.route('http://127.0.0.1:54329/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' }
    const json = (data: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(data) })
    if (req.method() === 'OPTIONS') return json({})
    if (path.endsWith('/user')) return json(user)
    if (path.endsWith('/get_app_access')) return json({ user_id: uid, approved: true, role: 'owner', module_ids: ['execution-tracker'] })
    if (path.endsWith('/get_execution_workspace')) {
      if (controls.failRead) return json({ code: 'unavailable' }, 503)
      const result = await db.query<{ data: unknown }>('select public.get_execution_workspace() as data')
      return json(result.rows[0].data)
    }
    if (path.endsWith('/change_execution_workspace')) {
      if (controls.conflict) { controls.conflict = false; await db.exec(`update public.execution_workspaces set revision=revision+1 where owner_id='${uid}'`) }
      try {
        const body = req.postDataJSON()
        const result = await db.query<{ data: unknown }>('select public.change_execution_workspace($1,$2,$3::jsonb) as data', [body.expected_revision, body.command, JSON.stringify(body.payload)])
        if (controls.loseResponse) { controls.loseResponse = false; return json({ code: 'unavailable' }, 503) }
        return json(result.rows[0].data)
      } catch (err) { return json({ code: (err as { code: string }).code }, 409) }
    }
    return json({ code: 'unexpected' }, 400)
  })
  return { db, controls }
}

test('실제 SQL로 개인 과업·루틴·마감을 저장하고 새로고침해 복원한다', async ({ page }, testInfo) => {
  const { db } = await setup(page)
  try {
    await page.goto('/execution-tracker')
    await expect(page.getByText('개인 클라우드 기록')).toBeVisible()
    const trackerMenu = page.getByRole('navigation', { name: '실행 트래커 메뉴' })
    await trackerMenu.getByRole('link', { name: '알림 설정' }).click()
    await expect(page.getByRole('heading', { name: '알림 설정' })).toBeVisible()
    await expect(page.getByRole('button', { name: '알림 켜기' })).toBeDisabled()
    await trackerMenu.getByRole('link', { name: '오늘', exact: true }).click()
    await expect(page.getByText('아직 오늘 계획한 과업이 없습니다. 작은 일 하나부터 등록하세요.')).toBeVisible()
    await page.getByRole('button', { name: '과업 등록', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('과업 이름').fill('기획서 초안 작성')
    await dialog.getByLabel('첫 행동 · 선택').fill('목차 세 가지 적기')
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    const task = page.locator('li').filter({ has: page.getByRole('heading', { name: '기획서 초안 작성' }) })
    await task.getByRole('button', { name: '시작하기' }).click()
    await expect(page.getByText('지금 집중 · 기획서 초안 작성')).toBeVisible()
    await page.reload()
    await expect(page.getByText('지금 집중 · 기획서 초안 작성')).toBeVisible()
    await task.getByRole('button', { name: '완료', exact: true }).click()
    await expect(task.getByText('집행 완료', { exact: true })).toBeVisible()
    await task.getByRole('button', { name: '완료 취소' }).click()
    await expect(task.getByRole('button', { name: '완료', exact: true })).toBeVisible()
    await task.getByRole('button', { name: '보류', exact: true }).click()
    await page.getByText('예정·보류한 과업 1개').click()
    await task.getByRole('button', { name: '오늘로 복귀' }).click()
    await page.getByRole('button', { name: '루틴 등록', exact: true }).click()
    await dialog.getByLabel('루틴 이름').fill('책 한 쪽 읽기')
    await dialog.getByLabel('이 루틴의 목표').fill('매일 읽을 시간을 만들기')
    await dialog.getByLabel('기대 결과').fill('일주일에 인상 깊은 문장 하나를 남긴다')
    await dialog.getByLabel('시작 신호').fill('저녁 양치를 마치면')
    await dialog.getByLabel('가장 작은 실천').fill('책 한 문장 읽기')
    await expect(dialog.getByRole('spinbutton')).toHaveCount(0)
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    const routine = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: '책 한 쪽 읽기' }) })
    await expect(routine.getByText('오늘 기록 전')).toBeVisible()
    await expect(routine.getByText('레벨 1', { exact: true })).toBeVisible()
    await expect(routine.getByText('레벨 2까지 7일')).toBeVisible()
    await expect(page.getByText('기록하지 않은 루틴 1개', { exact: false })).toBeVisible()
    await routine.getByRole('button', { name: '책 한 쪽 읽기 실천 기록' }).click()
    await expect(routine.getByText('오늘 실천 완료')).toBeVisible()
    await expect(routine.getByText('누적 1 XP · 1일 실천')).toBeVisible()
    await page.reload()
    await expect(routine.getByText('매일 읽을 시간을 만들기')).toBeVisible()
    await expect(routine.getByText('일주일에 인상 깊은 문장 하나를 남긴다')).toBeVisible()
    await expect(routine.getByText('레벨 2까지 6일')).toBeVisible()
    await routine.getByRole('button', { name: '책 한 쪽 읽기 실천 취소' }).click()
    await expect(routine.getByText('레벨 2까지 7일')).toBeVisible()
    await page.getByRole('button', { name: '하루 마감하기' }).click()
    await expect(dialog.getByText('오늘 실천 기록이 없는 루틴이 1개 있습니다.')).toBeVisible()
    await dialog.getByRole('button', { name: '닫기' }).click()

    const result = await db.query<{ data: Workspace }>('select public.get_execution_workspace() as data')
    const { today, routines } = result.rows[0].data
    await db.query('update public.execution_routines set created_on=$1,target_days=1 where id=$2', [shift(today, -18), routines[0].id])
    for (const offset of [-18, -15, -11, -8, -3, -1]) {
      await db.query('insert into public.execution_routine_checks(owner_id,routine_id,day) values($1,$2,$3)', [uid, routines[0].id, shift(today, offset)])
    }
    await page.reload()
    await expect(routine.getByText('누적 6 XP · 6일 실천')).toBeVisible()
    await expect(routine.locator('[data-level="1"] svg')).toBeVisible()
    await routine.getByRole('button', { name: '책 한 쪽 읽기 실천 기록' }).click()
    await expect(page.getByRole('status').filter({ hasText: '레벨 2 달성!' })).toBeVisible()
    await expect(routine.getByText('첫 7일 달성')).toBeVisible()
    await expect(routine.locator('[data-level="2"] svg')).toBeVisible()
    await page.reload()
    await expect(routine.getByText('레벨 2', { exact: true })).toBeVisible()
    await routine.getByRole('button', { name: '책 한 쪽 읽기 실천 취소' }).click()
    await expect(routine.getByText('레벨 1', { exact: true })).toBeVisible()
    await routine.getByRole('button', { name: '책 한 쪽 읽기 실천 기록' }).click()
    await expect(routine.getByText('누적 7 XP · 7일 실천')).toBeVisible()
    await page.getByRole('button', { name: '하루 마감하기' }).click()
    await dialog.getByLabel('오늘 알게 된 것 · 선택').fill('과업을 작게 나누자')
    await dialog.getByLabel('내일의 첫 행동 · 선택').fill('목차부터 다시 읽기')
    await dialog.getByRole('button', { name: '하루 마감 완료' }).click()
    await expect(page.getByRole('heading', { name: '오늘을 정리했습니다.' })).toBeVisible()
    await expect(page.getByRole('button', { name: '과업 등록', exact: true })).toBeDisabled()
    await page.reload()
    await expect(page.getByText('오늘 알게 된 것 · 과업을 작게 나누자')).toBeVisible()
    await page.getByRole('button', { name: '마감 다시 열기' }).click()
    await expect(page.getByRole('button', { name: '과업 등록', exact: true })).toBeEnabled()
    await page.getByRole('link', { name: '기록', exact: true }).click()
    await expect(page.getByText(/당일 완료 0 \/ 당시 대상 1 · 이어짐 1/)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('executioner-cloud-records.png'), fullPage: true })
    await page.getByRole('link', { name: '오늘', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('executioner-cloud-desktop.png'), fullPage: true })
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.screenshot({ path: testInfo.outputPath('executioner-cloud-mobile.png'), fullPage: true })
  } finally { await db.close() }
})

test('충돌·응답 유실에서 입력을 유지하고 확인 전 중복 저장을 막는다', async ({ page }) => {
  const { db, controls } = await setup(page)
  try {
    await page.goto('/execution-tracker')
    await page.getByRole('button', { name: '과업 등록', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('과업 이름').fill('유실되면 안 되는 입력')
    // A committed write whose response is lost must be checked before retrying.
    controls.loseResponse = true
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(dialog.getByText(/저장 결과를 확인하지 못했습니다/)).toBeVisible()
    await expect(dialog.getByLabel('과업 이름')).toHaveValue('유실되면 안 되는 입력')
    await expect(dialog.getByRole('button', { name: '저장', exact: true })).toBeDisabled()
    await dialog.getByRole('button', { name: '최신 기록 불러오기' }).click()
    await expect(dialog.getByRole('button', { name: '저장', exact: true })).toBeEnabled()
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText(/앞서 저장된 요청을 확인했습니다/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '유실되면 안 되는 입력' })).toHaveCount(1)
    await page.getByRole('button', { name: '수정', exact: true }).click()
    await dialog.getByLabel('과업 이름').fill('다른 기기 변경 확인')
    controls.conflict = true
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(dialog.getByText(/다른 화면에서 기록이 변경되었습니다/)).toBeVisible()
    await expect(dialog.getByLabel('과업 이름')).toHaveValue('다른 기기 변경 확인')
    await dialog.getByRole('button', { name: '최신 기록 불러오기' }).click()
    await expect(dialog.getByRole('button', { name: '저장', exact: true })).toBeEnabled()
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByRole('heading', { name: '다른 기기 변경 확인' })).toBeVisible()
  } finally { await db.close() }
})

test('며칠 접속하지 않아도 이월은 중복되지 않고 과거 완료율을 바꾸지 않는다', async ({ page }) => {
  const { db } = await setup(page)
  try {
    // Backdated fixtures represent elapsed real days; application RPCs cannot backdate tasks.
    const result = await db.query<{ data: Workspace }>(`select public.change_execution_workspace(0,'create_task','{"title":"이어온 기획서"}') as data`)
    const w = result.rows[0].data; const task = w.tasks[0]; const past = shift(w.today, -3)
    await db.query(`update public.execution_tasks set original_date=$1,scheduled_date=$1,created_at=($1::date::timestamp at time zone 'Asia/Seoul') where id=$2`, [past, task.id])
    await db.query(`update public.execution_task_events set happened_at=($1::date::timestamp at time zone 'Asia/Seoul'),snapshot=(select to_jsonb(t) from public.execution_tasks t where id=$2) where task_id=$2`, [past, task.id])
    await page.goto('/execution-tracker')
    await expect(page.getByText('현재 일정 경과 3일', { exact: false })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: '이어온 기획서' })).toHaveCount(1)
    await page.getByRole('button', { name: '완료', exact: true }).click()
    await page.goto(`/execution-tracker/records?date=${past}`)
    await expect(page.getByText(/당일 완료 0 \/ 당시 대상 1 · 이어짐 1/)).toBeVisible()
    await expect(page.getByText(`이후 ${w.today} 완료`)).toBeVisible()
    const latest = await db.query<{ data: unknown }>('select public.get_execution_workspace() as data')
    const parsed = parseWorkspace(latest.rows[0].data, uid)
    expect(dayRows(parsed, past)[0].completed).toBe(false)
    expect(dayRows(parsed, parsed.today)[0].completed).toBe(true)
    expect(elapsedDays(past, parsed.today)).toBe(3)
    expect(seoulDay(`${past}T15:00:00Z`)).toBe(shift(past, 1))
  } finally { await db.close() }
})
function shift(day: string, count: number) {
  const value = new Date(`${day}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + count); return value.toISOString().slice(0, 10)
}

test('루틴 상세 기록을 복원하고 반복과 난이도에 따라 실천을 제안한다', async ({ page }) => {
  const { db } = await setup(page)
  try {
    const title = '점심 뒤 걷기'
    const fixture = await db.query<{ data: Workspace }>(
      'select public.change_execution_workspace(0,$1,$2::jsonb) as data',
      ['create_routine', JSON.stringify({ title, goal: '꾸준히 움직이기', expected_outcome: '가까운 거리를 걸어서 다니기', target_days: 1 })],
    )
    const { today, routines: [routine] } = fixture.rows[0].data
    await page.goto('/execution-tracker')
    const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) })
    await expect(card.getByRole('heading', { name: '가볍게 시작하기' })).toBeVisible()
    await card.getByRole('button', { name: /실천 계획 수정/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('시작 신호').fill('점심 식사를 마치면')
    await dialog.getByLabel('가장 작은 실천').fill('건물 밖까지 걷기')
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(card.getByRole('heading', { name: '같은 신호에서 반복하기' })).toBeVisible()

    await db.query('update public.execution_routines set created_on=$1,plan_since=$1 where id=$2', [shift(today, -13), routine.id])
    for (const offset of [-11, -8, -6, -4, -2, -1]) {
      await db.query('insert into public.execution_routine_checks(owner_id,routine_id,day,effort,plan_revision) select $1,id,$3,$4,plan_revision from public.execution_routines where id=$2', [uid, routine.id, shift(today, offset), 'easy'])
    }
    await page.reload()
    const details = card.getByRole('button', { name: `${title} 상세 기록` })
    await details.click()
    await dialog.getByLabel('실천 내용').fill('건물 한 바퀴. 오후에 기분이 나아졌다.')
    await dialog.getByLabel('오늘의 난이도').selectOption('easy')
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(card.getByRole('heading', { name: '다음 단계 시도하기' })).toBeVisible()
    await expect(card.getByText('누적 7 XP · 7일 실천')).toBeVisible()
    await page.reload()
    await expect(card.getByText('건물 한 바퀴. 오후에 기분이 나아졌다.')).toBeVisible()
    await details.click()
    await expect(dialog.getByLabel('오늘의 난이도')).toHaveValue('easy')
    await dialog.getByLabel('오늘의 난이도').selectOption('hard')
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(card.getByRole('heading', { name: '작게 다시 시작하기' })).toBeVisible()
    await expect(card.getByText('누적 7 XP · 7일 실천')).toBeVisible()
    await page.getByRole('link', { name: '기록', exact: true }).click()
    await expect(page.getByText('건물 한 바퀴. 오후에 기분이 나아졌다.')).toBeVisible()
    await expect(page.getByText('버거웠어요')).toBeVisible()
    await page.getByRole('link', { name: '오늘', exact: true }).click()
    await card.getByRole('button', { name: /실천 계획 수정/ }).click()
    await dialog.getByLabel('가장 작은 실천').fill('현관까지 걷기')
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await expect(card.getByText('현관까지 걷기')).toBeVisible()
    await expect(card.getByRole('heading', { name: '같은 신호에서 반복하기' })).toBeVisible()
    await expect(card.getByText('건물 한 바퀴. 오후에 기분이 나아졌다.')).toBeVisible()
  } finally { await db.close() }
})
