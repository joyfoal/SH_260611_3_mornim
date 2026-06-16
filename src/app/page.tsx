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
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  // 나선형 순서: 테두리 → 중앙으로 등장
  const ORDER = [0, 1, 2, 5, 8, 7, 6, 3, 4]
  const icons = Array.from({ length: 9 }, (_, i) => ({
    col: i % 3,
    row: Math.floor(i / 3),
    delay: ORDER.indexOf(i) * 0.1,
  }))

  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', padding: '0 24px' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          width: '100%',
          maxWidth: '380px',
        }}
      >
        {icons.map(({ col, row, delay }, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              borderRadius: '22%',
              backgroundImage: 'url(/mornim.png)',
              backgroundSize: '300% 300%',
              backgroundPosition: `${col * 50}% ${row * 50}%`,
              animation: `popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) both, floatIcon 2.5s ease-in-out infinite`,
              animationDelay: `${delay}s, ${delay + 0.6}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
