/* global self, URL */
self.addEventListener('push', event => {
  let data
  try { data = event.data?.json() } catch { return }
  if (!data || !['tasks', 'routines'].includes(data.kind) || !Number.isSafeInteger(data.count) || data.count <= 0) return
  const tasks = data.kind === 'tasks'
  event.waitUntil(self.registration.showNotification(tasks ? '익스큐셔너 · 미완료 과업' : '익스큐셔너 · 루틴 실천', {
    body: tasks ? `아직 마치지 않은 과업이 ${data.count}개 있어요.` : `오늘 실천 기록이 없는 루틴이 ${data.count}개 있어요.`,
    icon: '/apple-touch-icon.png',
    tag: `execution-${data.kind}-${data.day}`,
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const target = new URL('/execution-tracker', self.location.origin).href
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => client.url === target)
    if (existing) await existing.focus()
    else await self.clients.openWindow(target)
  })())
})
