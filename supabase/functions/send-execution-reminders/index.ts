import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import webPush from 'npm:web-push@3.6.7'
import { timingSafeEqual } from 'node:crypto'

type Delivery = {
  subscription_id: string
  owner_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  kind: 'tasks' | 'routines'
  remaining_count: number
  day: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EXECUTION_PUSH_CRON_SECRET = Deno.env.get('EXECUTION_PUSH_CRON_SECRET')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const encoder = new TextEncoder()

function authorized(request: Request) {
  if (!EXECUTION_PUSH_CRON_SECRET) return false
  const supplied = encoder.encode(request.headers.get('x-execution-push-secret') ?? '')
  const expected = encoder.encode(EXECUTION_PUSH_CRON_SECRET)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function isPushEndpoint(endpoint: string) {
  const url = new URL(endpoint)
  return url.protocol === 'https:' && !url.username && !url.password && !url.port && (
    url.hostname === 'fcm.googleapis.com' ||
    url.hostname === 'updates.push.services.mozilla.com' ||
    url.hostname === 'push.apple.com' || url.hostname.endsWith('.push.apple.com')
  )
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  if (!authorized(request)) return new Response(null, { status: 401 })
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Response.json({ error: 'Push sender configuration incomplete' }, { status: 503 })
  }
  const vapidDetails = { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY }
  try { webPush.setVapidDetails(vapidDetails.subject, vapidDetails.publicKey, vapidDetails.privateKey) }
  catch { return Response.json({ error: 'Invalid VAPID configuration' }, { status: 503 }) }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await db.rpc('claim_execution_push_batch')
  if (error) {
    console.error('Reminder claim failed', error.code)
    return Response.json({ error: 'Unable to claim reminders' }, { status: 500 })
  }

  async function send(delivery: Delivery) {
    try {
      if (!isPushEndpoint(delivery.endpoint)) return 'failed'
      const payload = JSON.stringify({
        kind: delivery.kind,
        day: delivery.day,
        count: delivery.remaining_count,
      })
      const outgoing = webPush.generateRequestDetails({
        endpoint: delivery.endpoint,
        keys: { p256dh: delivery.p256dh, auth: delivery.auth_key },
      }, payload, {
        vapidDetails,
        TTL: 1800,
        topic: `execution-${delivery.kind}`,
      })
      const headers = new Headers()
      for (const [name, value] of Object.entries(outgoing.headers)) headers.set(name, String(value))
      // fetch sets Content-Length itself in the Edge runtime.
      headers.delete('Content-Length')
      const response = await fetch(outgoing.endpoint, {
        method: 'POST',
        headers,
        body: outgoing.body,
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      })
      await response.body?.cancel()
      if (response.status === 404 || response.status === 410) {
        const { error } = await db.from('execution_push_subscriptions').delete()
          .eq('id', delivery.subscription_id).eq('owner_id', delivery.owner_id)
        if (error) console.error('Expired subscription cleanup failed', error.code)
        return error ? 'failed' : 'expired'
      }
      if (!response.ok) console.error('Push provider rejected delivery', response.status)
      return response.ok ? 'sent' : 'failed'
    } catch {
      console.error('Push delivery failed')
      return 'failed'
    }
  }

  const deliveries = data as Delivery[]
  const results = { sent: 0, expired: 0, failed: 0 }
  for (let start = 0; start < deliveries.length; start += 20) {
    const batch = await Promise.all(deliveries.slice(start, start + 20).map(send))
    for (const result of batch) results[result]++
  }
  return Response.json(results, { status: results.failed ? 502 : 200 })
})
