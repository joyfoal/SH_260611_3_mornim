'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { DynamicText } from '@/components/ui/DynamicText'
import { Play } from 'lucide-react'
import {
  getAffirmations,
  getTodayAffirmationIds,
  saveTodayAffirmationIds,
  getDayRecord,
  getStreakData,
  getTomorrowNote,
  isTomorrowEnabled,
  generateTodayQueue,
  todayStr,
  type Affirmation,
  type DayRecord,
  type StreakData,
} from '@/lib/storage'
import { CATEGORY_COLORS } from '@/lib/categories'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return '좋은 아침이에요 ☀'
  if (h < 18) return '좋은 오후예요 🌤'
  return '좋은 저녁이에요 🌙'
}

function CalendarView() {
  const [records, setRecords] = useState<DayRecord[]>([])
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null)

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const recs: DayRecord[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const rec = getDayRecord(dateStr)
      recs.push(
        rec ?? { date: dateStr, completedCount: 0, dominantCategory: null }
      )
    }
    setRecords(recs)
  }, [])

  const today = todayStr()
  const now = new Date()
  const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay()

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: '8px',
          fontWeight: 500,
        }}
      >
        {now.getFullYear()}년 {now.getMonth() + 1}월
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div
            key={d}
            style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {records.map((rec) => {
          const day = parseInt(rec.date.split('-')[2])
          const isToday = rec.date === today
          const colors = rec.dominantCategory
            ? CATEGORY_COLORS[rec.dominantCategory]
            : null
          const intensity =
            rec.completedCount >= 6
              ? colors?.dark
              : rec.completedCount >= 3
              ? colors?.dark + 'CC'
              : rec.completedCount >= 1
              ? colors?.light
              : 'transparent'

          return (
            <button
              key={rec.date}
              onClick={() => setSelectedDay(rec)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: intensity,
                border: isToday ? '1.5px solid var(--color-accent-primary)' : '1px solid transparent',
                fontSize: '11px',
                color: rec.completedCount > 0 ? colors?.dark : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: 'var(--color-bg-card)',
            borderRadius: '12px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{selectedDay.date}</div>
          {selectedDay.completedCount > 0 ? (
            <div>
              완료: {selectedDay.completedCount}개
              {selectedDay.dominantCategory && ` · ${selectedDay.dominantCategory}`}
            </div>
          ) : (
            <div>아직 기록이 없어요</div>
          )}
          <button
            onClick={() => setSelectedDay(null)}
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  )
}

const MOTTOS = [
  '말하면 이루어진다.',
  '반드시 성공한다.',
  '꿈은 현실이 된다.',
  '성공은 시작되었다.',
  '성공에 가까워지고 있다.',
  '말이 나의 현실을 만든다.',
  '성공은 나를 향해 오고 있다.',
  '잘 사는 사람이 된다.',
  '나의 시간은 성공으로 향하고 있다.',
  '오늘도 성공에 가까워진다.',
  '성공은 나의 것이다.',
  '날마다 더 나아지고 있다.',
]

export default function HomePage() {
  const router = useRouter()
  const [todayAffirmation, setTodayAffirmation] = useState<Affirmation | null>(null)
  const [allDone, setAllDone] = useState(false)
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, lastCompletedDate: null, shields: 0 })
  const [tomorrowNote, setTomorrowNote] = useState<string | null>(null)
  const [motto, setMotto] = useState('')

  useEffect(() => {
    setMotto(MOTTOS[Math.floor(Math.random() * MOTTOS.length)])
  }, [])

  const loadData = useCallback(() => {
    let ids = getTodayAffirmationIds()
    if (ids.length === 0) {
      ids = generateTodayQueue()
      saveTodayAffirmationIds(ids)
    }
    const affirmations = getAffirmations()
    const today = todayStr()
    const notDone = affirmations.filter(
      (a) => ids.includes(a.id) && !a.completedDates.includes(today)
    )
    setTodayAffirmation(notDone[0] ?? null)
    setAllDone(notDone.length === 0 && affirmations.length > 0)
    setStreakData(getStreakData())
    if (isTomorrowEnabled()) {
      const note = getTomorrowNote()
      if (note && note.date === today && note.message) {
        setTomorrowNote(note.message)
      }
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePlay = () => {
    if (!todayAffirmation) return
    const ids = getTodayAffirmationIds()
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mornim-speak-queue', JSON.stringify(ids))
      sessionStorage.setItem('mornim-speak-index', '0')
    }
    router.push(`/speak?id=${todayAffirmation.id}`)
  }

  const handleMore = () => {
    const affirmations = getAffirmations()
    if (affirmations.length === 0) return
    const pick = affirmations[Math.floor(Math.random() * affirmations.length)]
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mornim-speak-queue', JSON.stringify([pick.id]))
      sessionStorage.setItem('mornim-speak-index', '0')
    }
    router.push(`/speak?id=${pick.id}`)
  }

  return (
    <AppLayout activeTab="홈" decorativeIcons={[0, 2]}>
      <div style={{ paddingBottom: '16px' }}>
        {/* Tomorrow's note */}
        {tomorrowNote && (
          <div
            style={{
              margin: '16px 16px 0',
              padding: '14px 16px',
              background: '#FFFAE6',
              borderRadius: '16px',
              border: '1px solid #F5E066',
            }}
          >
            <div style={{ fontSize: '11px', color: '#9B8A00', marginBottom: '4px' }}>
              어제 내가 남긴 메시지
            </div>
            <div style={{ fontSize: '14px', color: '#4A3C00', lineHeight: 1.5 }}>
              {tomorrowNote}
            </div>
          </div>
        )}

        {/* Greeting + Motto (same line) */}
        <div style={{ padding: '20px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {getGreeting()}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-accent-primary)', fontWeight: 500, textAlign: 'right' }}>
            {motto}
          </div>
        </div>

        {/* Affirmation card */}
        {todayAffirmation ? (
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: '20px',
              padding: '20px 16px',
              margin: '0 16px 16px',
            }}
          >
            <DynamicText text={todayAffirmation.text} compact />
            <div className="flex justify-end mt-4">
              <button
                onClick={handlePlay}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={18} color="white" fill="white" />
              </button>
            </div>
          </div>
        ) : allDone ? (
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: '20px',
              padding: '24px 16px',
              margin: '0 16px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
              오늘의 성공의 말을 모두 완료했어요 🎉
            </div>
            <button
              onClick={handleMore}
              style={{
                padding: '12px 28px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              더 말하기
            </button>
          </div>
        ) : null}

        {/* Streak */}
        {streakData.currentStreak > 0 && (
          <div
            style={{
              margin: '0 16px 16px',
              padding: '12px 16px',
              background: 'var(--color-bg-card)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '24px' }}>🔥</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {streakData.currentStreak}일 연속
              </div>
              {streakData.shields > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  🛡 스트릭 보호막 {streakData.shields}개
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar */}
        <CalendarView />

        {/* Shortcuts */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={() => router.push('/create')}
            style={{
              flex: 1,
              padding: '14px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '14px',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ✨ 성공의 말 만들기
          </button>
          <button
            onClick={() => router.push('/games')}
            style={{
              flex: 1,
              padding: '14px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '14px',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🎮 게임하기
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
