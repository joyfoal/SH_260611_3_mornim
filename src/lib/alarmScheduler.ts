import { getAlarmList, getAffirmations, type AlarmSettings } from './storage'

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

async function getSW(): Promise<ServiceWorker | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  let reg = await navigator.serviceWorker.getRegistration('/')
  if (!reg) reg = (await registerSW()) ?? undefined
  if (!reg) return null
  return reg.active ?? reg.installing ?? reg.waiting ?? null
}

export async function scheduleAlarm(): Promise<void> {
  const sw = await getSW()
  if (!sw) return

  const list = getAlarmList()
  const affirmations = getAffirmations()

  // Cancel all existing, then reschedule from list
  sw.postMessage({ type: 'CANCEL_ALARM' })

  for (const alarm of list) {
    if (!alarm.affirmationId) continue
    const nextTime = getNextAlarmDate(alarm)
    if (!nextTime) continue
    const delayMs = nextTime.getTime() - Date.now()
    const affirmation = affirmations.find((a) => a.id === alarm.affirmationId)
    const body = affirmation?.text ?? '성공의 말을 확인해보세요'
    sw.postMessage({ type: 'SCHEDULE_ALARM', id: alarm.id, delayMs, title: '이뤄 ✨', body })
  }
}

export async function cancelAlarm(): Promise<void> {
  const sw = await getSW()
  sw?.postMessage({ type: 'CANCEL_ALARM' })
}

export async function cancelAlarmById(id: string): Promise<void> {
  const sw = await getSW()
  sw?.postMessage({ type: 'CANCEL_ALARM_BY_ID', id })
}
