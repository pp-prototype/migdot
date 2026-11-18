import { expect, test } from '@playwright/test'

test.use({ baseURL: 'http://127.0.0.1:5176', viewport: { width: 390, height: 844 } })

type Row = Record<string, string | number> & { id: string; version: number }

test('개인 주제와 기록을 저장하고 응답 유실과 동시 수정을 복구한다', async ({ page }) => {
  const id = '22222222-2222-4222-8222-222222222222'
  const user = { id, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }
  const expires = Math.floor(Date.now() / 1000) + 3600
  const token = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: id, exp: expires }))}.test`
  await page.addInitScript(value => localStorage.setItem('migdot-127-0-0-1-54329-auth', JSON.stringify(value)), {
    access_token: token, refresh_token: 'test-refresh', expires_at: expires, user,
  })

  const topics: Row[] = []
  const notes: Row[] = []
  let loseResponse = false
  await page.route('http://127.0.0.1:54329/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    }
    const reply = (json: unknown, status = 200) => route.fulfill({ headers, json, status })

    if (method === 'OPTIONS') return reply({})
    if (url.pathname === '/auth/v1/user') return reply(user)
    if (url.pathname === '/rest/v1/rpc/get_app_access') {
      return reply({ user_id: id, approved: true, role: 'member', module_ids: ['post-it-learner'] })
    }

    const rows = url.pathname === '/rest/v1/learning_topics' ? topics
      : url.pathname === '/rest/v1/learning_notes' ? notes : null
    if (!rows) return reply({ code: 'unexpected_route' }, 404)

    const filters = [...url.searchParams.entries()].filter(([, value]) => value.startsWith('eq.'))
    const matching = rows.filter(row => filters.every(([key, value]) => String(row[key]) === value.slice(3)))
    if (method === 'GET') return reply(matching)
    if (method === 'POST') {
      const row = request.postDataJSON() as Row
      if (rows.some(item => item.id === row.id)) return reply({ code: '23505', message: 'Duplicate ID' }, 409)
      rows.push({ ...row, version: 1, created_at: '2026-11-18T00:00:00Z' })
      if (loseResponse) {
        loseResponse = false
        return reply({ code: 'unavailable' }, 503)
      }
      return route.fulfill({ headers, status: 201 })
    }
    if (method === 'PATCH') {
      for (const row of matching) Object.assign(row, request.postDataJSON(), { version: row.version + 1 })
      return reply(matching.map(row => ({ id: row.id })))
    }
    if (method === 'DELETE') {
      for (const row of matching) rows.splice(rows.indexOf(row), 1)
      return reply(matching.map(row => ({ id: row.id })))
    }
    return reply({ code: 'unexpected_method' }, 405)
  })

  await page.goto('/post-it-learner')
  await expect(page.getByText(/아직 학습 주제가 없습니다/)).toBeVisible()
  await page.getByRole('button', { name: '새 학습 주제' }).click()
  const editor = page.getByRole('dialog')
  await editor.getByLabel('이름').fill('웹 접근성')
  await editor.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('heading', { name: '웹 접근성' })).toBeVisible()
  await page.getByRole('button', { name: '주제 수정' }).click()
  await editor.getByLabel('설명 (선택)').fill('키보드 탐색 기록')
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 900
    const context = canvas.getContext('2d')!
    context.fillStyle = '#f00'
    context.fillRect(0, 0, 300, 300)
    context.fillStyle = '#0f0'
    context.fillRect(0, 300, 300, 300)
    context.fillStyle = '#00f'
    context.fillRect(0, 600, 300, 300)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const thumbnail = Buffer.from(png, 'base64')
  await editor.getByLabel('썸네일 (선택)').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: thumbnail })
  const preview = editor.getByRole('img', { name: '등록할 썸네일 미리보기' })
  await expect(preview).toBeVisible()
  await expect(editor.getByRole('radio', { name: '전체 사진' })).toBeChecked()
  const previewPixel = (x: number, y: number) => preview.evaluate((node, point) =>
    Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(point.x, point.y, 1, 1).data), { x, y })
  await expect.poll(() => previewPixel(30, 135)).toEqual([255, 255, 255, 255])
  expect(await previewPixel(240, 10)).toEqual([255, 0, 0, 255])
  expect(await previewPixel(240, 260)).toEqual([0, 0, 255, 255])

  await editor.getByRole('radio', { name: '직접 자르기' }).check()
  const zoom = editor.getByRole('slider', { name: '확대' })
  await zoom.press('End')
  await expect(zoom).toHaveValue('3')
  const vertical = editor.getByRole('slider', { name: '세로 위치' })
  await vertical.press('Home')
  await expect.poll(() => previewPixel(240, 135)).toEqual([0, 0, 255, 255])

  await preview.scrollIntoViewIfNeeded()
  const bounds = (await preview.boundingBox())!
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 30)
  await page.mouse.up()
  await expect(vertical).not.toHaveValue('-1')
  await editor.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByText('키보드 탐색 기록')).toBeVisible()
  await page.getByRole('link', { name: '포스트잇 러너', exact: true }).click()
  const topicCard = page.getByRole('link', { name: /웹 접근성/ })
  const coverImage = topicCard.locator('img')
  await expect(coverImage).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  const savedPixel = await coverImage.evaluate(async node => {
    const image = node as HTMLImageElement
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return Array.from(context.getImageData(240, 135, 1, 1).data)
  })
  expect(savedPixel[2]).toBeGreaterThan(240)
  await topicCard.click()

  await page.getByRole('button', { name: '새 포스트잇' }).click()
  await editor.getByLabel('제목').fill('보이는 포커스')
  await editor.getByLabel('내용').fill('키보드 포커스에 윤곽선을 표시한다.')
  await editor.getByLabel('태그 (선택)').fill('키보드')
  await editor.getByLabel('사진 (선택)').setInputFiles({ name: 'note.png', mimeType: 'image/png', buffer: thumbnail })
  await expect(editor.getByRole('img', { name: '등록할 사진 미리보기' })).toBeVisible()
  loseResponse = true
  await editor.getByRole('button', { name: '저장', exact: true }).click()
  await expect(editor.getByRole('alert')).toContainText('입력을 유지했습니다')
  await expect(editor.getByLabel('내용')).toHaveValue('키보드 포커스에 윤곽선을 표시한다.')
  await editor.getByRole('button', { name: '저장', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await expect(page.getByRole('button', { name: /보이는 포커스/ })).toHaveCount(1)
  expect(notes).toHaveLength(1)
  const board = page.getByRole('list', { name: '포스트잇 보드' })
  await expect(board.getByRole('button').first()).toHaveAccessibleName('새 포스트잇')
  await expect(board.getByRole('button').first()).toHaveCSS('border-top-style', 'dashed')
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    for (const tile of await board.getByRole('button').all()) {
      const size = await tile.boundingBox()
      expect(size).not.toBeNull()
      expect(Math.abs(size!.width - size!.height)).toBeLessThan(1)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })

  await page.reload()
  await page.getByRole('searchbox', { name: '포스트잇 검색' }).fill('윤곽선')
  await page.getByRole('button', { name: /보이는 포커스/ }).click()
  await expect(page.getByRole('img', { name: '포스트잇 첨부 사진' })).toBeVisible()
  await page.getByRole('button', { name: '포스트잇 수정' }).click()
  await editor.getByLabel('제목').fill('선명한 포커스')
  notes[0].body = '다른 기기에서 저장한 내용'
  notes[0].version += 1
  await editor.getByRole('button', { name: '저장', exact: true }).click()
  await expect(editor.getByText('다른 기기에서 저장한 내용')).toBeVisible()
  await expect(editor.getByLabel('제목')).toHaveValue('선명한 포커스')
  await editor.getByRole('button', { name: '내 입력을 유지하고 계속' }).click()
  await editor.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('heading', { name: '선명한 포커스' })).toBeVisible()
  await expect(page.getByRole('img', { name: '포스트잇 첨부 사진' })).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '포스트잇 수정' }).click()
  await editor.getByRole('button', { name: '삭제', exact: true }).click()
  await editor.getByRole('button', { name: '삭제 확인' }).click()
  await expect(page.getByText('포스트잇을 삭제했습니다.')).toBeVisible()
  await expect(page.getByText('일치하는 검색 결과가 없습니다.')).toBeVisible()
  await page.getByRole('button', { name: '검색어 지우기' }).click()
  await expect(page.getByText(/아직 포스트잇이 없습니다/)).toBeVisible()
  expect(notes).toHaveLength(0)
})
