import { getAlarmSettings, getAffirmations, type AlarmSettings } from './storage'

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

function getNextAlarmDate(alarm: AlarmSettings): Date | null {
  const now = new Date()
  const days = alarm.repeatDays?.length > 0 ? alarm.repeatDays : [0, 1, 2, 3, 4, 5, 6]

  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + i)
    candidate.setHours(alarm.hour, alarm.minute, 0, 0)

    if (candidate <= now) continue
    if (!days.includes(candidate.getDay())) continue

    const candStr = candidate.toISOString().split('T')[0]
    if (alarm.endType === 'date' && alarm.endDate && candStr > alarm.endDate) return null
    if (alarm.endType === 'count' && alarm.endCount && (alarm.firedCount ?? 0) >= alarm.endCount) return null

    return candidate
  }
  return null
}

export async function scheduleAlarm(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const alarm = getAlarmSettings()
  if (!alarm?.affirmationId) return

  let reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) reg = (await registerSW()) ?? undefined
  if (!reg) return

  const sw = reg.active ?? reg.installing ?? reg.waiting
  if (!sw) return

  const nextTime = getNextAlarmDate(alarm)
  if (!nextTime) return

  const delayMs = nextTime.getTime() - Date.now()
  const affirmation = getAffirmations().find((a) => a.id === alarm.affirmationId)
  const body = affirmation?.text ?? '성공의 말을 확인해보세요'

  sw.postMessage({
    type: 'SCHEDULE_ALARM',
    delayMs,
    title: '모님 ✨',
    body,
  })
}

export async function cancelAlarm(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) return
  const sw = reg.active ?? reg.installing ?? reg.waiting
  sw?.postMessage({ type: 'CANCEL_ALARM' })
}
