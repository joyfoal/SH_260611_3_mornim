import { getAlarmSettings } from './storage'

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch {
    return null
  }
}

export async function scheduleAlarm(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const alarm = getAlarmSettings()
  if (!alarm) return

  let reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) reg = await registerSW() ?? undefined
  if (!reg) return

  const sw = reg.active ?? reg.installing ?? reg.waiting
  if (!sw) return

  const now = new Date()
  const target = new Date()
  target.setHours(alarm.hour, alarm.minute, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)

  const delayMs = target.getTime() - now.getTime()

  sw.postMessage({
    type: 'SCHEDULE_ALARM',
    delayMs,
    title: '모님 - 성공의 말 시간이에요! 🌟',
    body: '오늘의 성공의 말을 소리내어 말해보세요.',
  })
}

export async function cancelAlarm(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) return
  const sw = reg.active ?? reg.installing ?? reg.waiting
  sw?.postMessage({ type: 'CANCEL_ALARM' })
}
