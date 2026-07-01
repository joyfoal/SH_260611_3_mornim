'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  isOnboarded,
  getTodayAffirmationIds,
  saveTodayAffirmationIds,
  getAffirmations,
  generateTodayQueue,
  todayStr,
} from '@/lib/storage'
import { SwirlEmblem } from '@/components/ui/SwirlEmblem'

const FADE_MS = 280

export default function RootPage() {
  const router = useRouter()
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    const go = (path: string) => {
      setFadingOut(true)
      setTimeout(() => router.replace(path), FADE_MS)
    }

    if (!isOnboarded()) {
      go('/onboarding')
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
          try {
            sessionStorage.setItem('ealo-speak-queue', JSON.stringify(ids))
            sessionStorage.setItem('ealo-speak-index', String(ids.indexOf(uncompleted[0].id)))
          } catch { /* 프라이빗 브라우징 등 storage 비활성화 환경 */ }
        }
        go(`/speak?id=${uncompleted[0].id}`)
        return
      }
    }

    go('/home')
  }, [router])

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse 90% 55% at 50% 42%, #FFFDF9 0%, #FBF3E4 60%, #F6EAD2 100%)',
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 45% at 50% 42%, rgba(212,160,55,0.12), transparent 70%)',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SwirlEmblem size={230} inset={28} />
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', color: '#BA7517' }}>이뤄</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#8A7A62', marginTop: 8 }}>말하면, 이루어진다</div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
          width: 24, height: 24, borderRadius: '50%',
          border: '2.5px solid rgba(186,117,23,0.25)', borderTopColor: '#BA7517',
          animation: 'swirlSpin 0.9s linear infinite',
        }}
      />
    </div>
  )
}
