'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { DynamicText } from '@/components/ui/DynamicText'
import { Play, Pause } from 'lucide-react'
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
  getAffirmationsByDate,
  getDayNote,
  getWeeklyReportShown,
  setWeeklyReportShown,
  getWeekKey,
  type Affirmation,
  type DayRecord,
  type StreakData,
} from '@/lib/storage'
import { CATEGORY_COLORS, getCategoryColor } from '@/lib/categories'
import { getRecentAudioRecord, deleteExpiredAudioRecords, type AudioRecord } from '@/lib/audioStorage'
import { getSuccessImage } from '@/lib/successImageStorage'
import { WeeklyReportModal } from '@/components/ui/WeeklyReportModal'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return '좋은 아침이에요 ☀'
  if (h < 18) return '좋은 오후예요 🌤'
  return '좋은 저녁이에요 🌙'
}

// ─── Recent Recording Player ──────────────────────────────────────
function RecentRecordingPlayer() {
  const [record, setRecord] = useState<AudioRecord | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    getRecentAudioRecord().then(setRecord).catch(() => {})
    return () => {
      if (audioRef.current) audioRef.current.pause()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const handleToggle = () => {
    if (!record) return
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }
    if (!urlRef.current) {
      urlRef.current = URL.createObjectURL(record.blob)
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(urlRef.current)
      audioRef.current.onended = () => setIsPlaying(false)
    }
    audioRef.current.src = urlRef.current
    audioRef.current.play().catch(() => setIsPlaying(false))
    setIsPlaying(true)
  }

  if (!record) return null

  return (
    <div
      style={{
        margin: '0 16px 16px',
        padding: '14px 16px',
        background: 'var(--color-bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <button
        onClick={handleToggle}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--color-accent-primary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isPlaying ? <Pause size={16} color="white" fill="white" /> : <Play size={16} color="white" fill="white" />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>최근 녹음</div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {record.affirmationText}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function CalendarView() {
  const [records, setRecords] = useState<DayRecord[]>([])
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null)
  const [selectedAffirmations, setSelectedAffirmations] = useState<Affirmation[]>([])
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const loadRecords = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const recs: DayRecord[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const rec = getDayRecord(dateStr)
      recs.push(rec ?? { date: dateStr, completedCount: 0, dominantCategory: null })
    }
    setRecords(recs)
  }, [])

  useEffect(() => {
    loadRecords()
    const onVisible = () => { if (document.visibilityState === 'visible') loadRecords() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadRecords])

  const handleDayClick = (rec: DayRecord) => {
    if (selectedDay?.date === rec.date) {
      setSelectedDay(null)
      return
    }
    setSelectedDay(rec)
    setSelectedAffirmations(getAffirmationsByDate(rec.date))
    setSelectedNote(getDayNote(rec.date))
  }

  const today = todayStr()
  const now = new Date()
  const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay()

  // 이번 주 7일 (일~토) — 로컬 시간 기준
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - now.getDay() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const weekRecords = weekDays.map(
    (date) => records.find((r) => r.date === date) ?? { date, completedCount: 0, dominantCategory: null as null }
  )

  const renderDayBtn = (rec: DayRecord, size = 32) => {
    const day = parseInt(rec.date.split('-')[2])
    const isToday = rec.date === today
    const isSelected = selectedDay?.date === rec.date
    const colors = rec.dominantCategory ? getCategoryColor(rec.dominantCategory) : null
    const intensity =
      rec.completedCount >= 6
        ? colors?.dark
        : rec.completedCount >= 3
        ? (colors?.dark ?? '') + 'CC'
        : rec.completedCount >= 1
        ? colors?.light
        : 'transparent'
    return (
      <button
        key={rec.date}
        onClick={() => handleDayClick(rec)}
        style={{
          width: size,
          height: size,
          borderRadius: '8px',
          background: isSelected ? 'var(--color-accent-primary)' : intensity,
          border: isToday && !isSelected ? '1.5px solid var(--color-accent-primary)' : '1px solid transparent',
          fontSize: '11px',
          color: isSelected ? 'white' : rec.completedCount > 0 ? colors?.dark : 'var(--color-text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          flexShrink: 0,
        }}
      >
        {day}
      </button>
    )
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {now.getFullYear()}년 {now.getMonth() + 1}월
        </div>
        <button
          onClick={() => { setExpanded((v) => !v); setSelectedDay(null) }}
          style={{ fontSize: '12px', color: 'var(--color-accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
        >
          {expanded ? '접기 ↑' : '전체 보기 ↓'}
        </button>
      </div>

      {/* 요일 레이블 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 주간 뷰 (기본) */}
      {!expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekRecords.map((rec) => renderDayBtn(rec, 32))}
        </div>
      )}

      {/* 월간 뷰 (펼침) */}
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`empty-${i}`} />)}
          {records.map((rec) => renderDayBtn(rec, 28))}
        </div>
      )}

      {/* 선택된 날 상세 */}
      {selectedDay && (
        <div
          style={{
            marginTop: '12px',
            padding: '14px 16px',
            background: 'var(--color-bg-card)',
            borderRadius: '14px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-primary)' }}>
            {selectedDay.date}
          </div>

          {selectedDay.completedCount > 0 ? (
            <>
              <div style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                완료: {selectedDay.completedCount}개
                {selectedDay.dominantCategory && ` · ${selectedDay.dominantCategory}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {selectedAffirmations.length > 0 ? selectedAffirmations.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--color-bg-surface)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    ✓ {a.text}
                  </div>
                )) : (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    완료한 성공의 말이 삭제되었어요
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }}>아직 기록이 없어요</div>
          )}

          {selectedNote && (
            <div
              style={{
                padding: '10px 12px',
                background: '#FFFAE6',
                borderRadius: '10px',
                border: '1px solid #F5E066',
                marginBottom: '8px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#9B8A00', marginBottom: '4px' }}>오늘의 나에게</div>
              <div style={{ fontSize: '13px', color: '#4A3C00', lineHeight: 1.5 }}>{selectedNote}</div>
            </div>
          )}

          <button
            onClick={() => setSelectedDay(null)}
            style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Saved Success Image ──────────────────────────────────────────
function SavedSuccessImage({ onTap }: { onTap: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    getSuccessImage().then((record) => {
      if (!record?.imageBlob) return
      const url = URL.createObjectURL(record.imageBlob)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }).catch(() => {})
  }, [])

  if (!imageUrl) return null

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <button
        onClick={onTap}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'block',
        }}
      >
        <img
          src={imageUrl}
          alt="저장된 성공 이미지"
          style={{
            width: '100%',
            borderRadius: '16px',
            display: 'block',
          }}
        />
      </button>
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
  const [hasAffirmations, setHasAffirmations] = useState(true)
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, lastCompletedDate: null, shields: 0 })
  const [tomorrowNote, setTomorrowNote] = useState<string | null>(null)
  const [motto, setMotto] = useState('')
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)

  useEffect(() => {
    setMotto(MOTTOS[Math.floor(Math.random() * MOTTOS.length)])
  }, [])

  // Auto-show weekly report on Saturday
  useEffect(() => {
    const now = new Date()
    if (now.getDay() === 6) {
      const weekKey = getWeekKey(now)
      const shown = getWeeklyReportShown()
      if (shown !== weekKey) {
        setTimeout(() => setShowWeeklyReport(true), 1000)
      }
    }
  }, [])

  // Schedule alarm via Service Worker on app open
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('@/lib/alarmScheduler').then(({ scheduleAlarm }) => scheduleAlarm())
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
    setHasAffirmations(affirmations.length > 0)
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
    deleteExpiredAudioRecords().catch(() => {})
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

  const handleCloseWeeklyReport = () => {
    setShowWeeklyReport(false)
    const weekKey = getWeekKey(new Date())
    setWeeklyReportShown(weekKey)
  }

  return (
    <AppLayout activeTab="홈">
      <div style={{ paddingBottom: '16px' }}>
        {/* Yesterday's note */}
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

        {/* Greeting + Motto */}
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
        ) : !hasAffirmations ? (
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: '20px',
              padding: '28px 20px',
              margin: '0 16px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🌱</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              아직 성공의 말이 없어요
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
              첫 번째 성공의 말을 만들어보세요
            </div>
            <button
              onClick={() => router.push('/create')}
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
              만들기
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

        {/* Recent recording player — above calendar */}
        <RecentRecordingPlayer />

        {/* Calendar */}
        <CalendarView />

        {/* Shortcuts */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 16px' }}>
          <button
            onClick={() => router.push('/create')}
            style={{
              flex: 1,
              padding: '12px 4px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              color: 'var(--color-text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            성공의 말 만들기
          </button>
          <button
            onClick={() => router.push('/games/success-image')}
            style={{
              flex: 1,
              padding: '12px 4px',
              background: 'var(--color-accent-light)',
              border: '1px solid var(--color-accent-primary)',
              borderRadius: '12px',
              color: 'var(--color-accent-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            성공 이미지 만들기
          </button>
          <button
            onClick={() => router.push('/games')}
            style={{
              flex: 1,
              padding: '12px 4px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              color: 'var(--color-text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            게임하기
          </button>
        </div>

        {/* 저장된 성공 이미지 */}
        <SavedSuccessImage onTap={() => router.push('/games/success-image')} />
      </div>

      {showWeeklyReport && <WeeklyReportModal onClose={handleCloseWeeklyReport} />}
    </AppLayout>
  )
}
