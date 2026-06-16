'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  isOnboarded,
  getTodayAffirmationIds,
  saveTodayAffirmationIds,
  getAffirmations,
  generateTodayQueue,
  todayStr,
} from '@/lib/storage'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOnboarded()) {
        router.replace('/onboarding')
        return
      }

      let ids = getTodayAffirmationIds()
      if (ids.length === 0) {
        ids = generateTodayQueue()
        saveTodayAffirmationIds(ids)
      }

      if (ids.length > 0) {
        const affirmations = getAffirmations()
        const today = todayStr()
        const uncompleted = affirmations.filter(
          (a) => ids.includes(a.id) && !a.completedDates.includes(today)
        )
        if (uncompleted.length > 0) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('mornim-speak-queue', JSON.stringify(ids))
            sessionStorage.setItem('mornim-speak-index', String(ids.indexOf(uncompleted[0].id)))
          }
          router.replace(`/speak?id=${uncompleted[0].id}`)
          return
        }
      }

      router.replace('/home')
    }, 1000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
    >
      <img src="/mornim.png" alt="모님" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
    </div>
  )
}
