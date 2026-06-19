'use client'

import { useEffect } from 'react'
import { registerSW, scheduleAlarm } from '@/lib/alarmScheduler'
import { getAlarmSettings } from '@/lib/storage'

export function AlarmInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const run = async () => {
      await registerSW()
      if (getAlarmSettings()) await scheduleAlarm()
    }
    run()
  }, [])
  return null
}
