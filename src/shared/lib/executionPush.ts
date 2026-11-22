import { supabase } from './supabase'

export const executionPushKey = import.meta.env.VITE_EXECUTION_VAPID_PUBLIC_KEY?.trim() || ''
const workerPath = '/execution-reminders-sw.js'

export function executionPushSupport() {
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (appleMobile && !standalone) return 'install'
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'supported'
}

export async function registerExecutionPush() {
  await navigator.serviceWorker.register(workerPath)
  return navigator.serviceWorker.ready
}

export async function executionPushEnabled(subscription: PushSubscription) {
  const { data, error } = await supabase!.rpc('has_execution_push_subscription', { push_endpoint: subscription.endpoint })
  if (error) throw error
  return data === true
}

export async function enableExecutionPush(registration: ServiceWorkerRegistration) {
  // Invoke subscribe directly from the user gesture, including on installed iOS apps.
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: executionPushKey,
  })
  const { keys } = subscription.toJSON()
  const { error } = await supabase!.rpc('enable_execution_push', {
    push_endpoint: subscription.endpoint, encryption_key: keys?.p256dh, browser_secret: keys?.auth,
  })
  if (error) throw error
}

export async function disableExecutionPush(subscription: PushSubscription) {
  const [browser, server] = await Promise.allSettled([
    subscription.unsubscribe(),
    supabase!.rpc('disable_execution_push', { push_endpoint: subscription.endpoint }),
  ])
  // Either local unsubscription or removing the backend entry prevents new deliveries.
  if (browser.status === 'fulfilled' || (server.status === 'fulfilled' && !server.value.error)) return
  throw new Error('Unable to disable push')
}

export async function disconnectExecutionPush() {
  if (!supabase || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration?.active || new URL(registration.active.scriptURL).pathname !== workerPath) return
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await disableExecutionPush(subscription)
}
