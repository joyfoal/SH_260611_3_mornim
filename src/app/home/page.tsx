'use client'

import { useEffect, useState, useCallback, useRef, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Play, Pause, Flame, Shield, Mic, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sun, CloudSun, Moon, Check, Sprout, Grid2X2, Plus, Image as ImageIcon } from 'lucide-react'
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
  getTodayRepeatDone,
  getNaegeSeenDate,
  getHomeDisplaySettings,
  getAlarmSettings,
  saveAlarmSettings,
  getAlarmLastShown,
  setAlarmLastShown,
  type Affirmation,
  type DayRecord,
  type StreakData,
} from '@/lib/storage'
import { getRecentAudioRecord, deleteExpiredAudioRecords, getAudioRecordsByAffirmationId, type AudioRecord } from '@/lib/audioStorage'
import { getSuccessImage } from '@/lib/successImageStorage'
import { WeeklyReportModal } from '@/components/ui/WeeklyReportModal'

const T = {
  bgPrimary: '#FFFCF8',
  card: '#FFFFFF',
  cardBorder: '#F0E3CB',
  divider: '#F4ECDE',
  gold: '#BA7517',
  goldGrad: 'linear-gradient(135deg, #BA7517, #D98A1C)',
  goldTint: '#FBF0DA',
  ink: '#2A1801',
  body: '#412402',
  muted: '#A0937E',
  info: '#1E88E5',
  infoBg: '#EAF2FB',
  waveform: '#E0C89A',
}

function getGreeting(): ReactElement {
  const h = new Date().getHours()
  if (h < 12) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>좋은 아침이에요 <Sun size={20} color={T.gold} /></span>
  if (h < 18) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>좋은 오후예요 <CloudSun size={20} color={T.gold} /></span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>좋은 저녁이에요 <Moon size={20} color="#8B5CF6" /></span>
}

// ── 문장 끝 1/3 어절을 골드로 강조 ───────────────────────────────────────────
function HighlightedSentence({ text }: { text: string }) {
  const words = text.split(' ')
  const highlightCount = Math.max(1, Math.ceil(words.length / 3))
  const normalWords = words.slice(0, words.length - highlightCount)
  const goldWords = words.slice(words.length - highlightCount)
  return (
    <p style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.4, color: T.ink, margin: 0, wordBreak: 'keep-all' }}>
      {normalWords.length > 0 && <span>{normalWords.join(' ')} </span>}
      <span style={{ color: T.gold }}>{goldWords.join(' ')}</span>
    </p>
  )
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
        background: T.card,
        borderRadius: '16px',
        border: `1px solid ${T.cardBorder}`,
        boxShadow: '0 4px 16px rgba(65,36,2,0.05)',
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
          background: T.goldGrad,
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
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '10px', color: T.muted, marginBottom: '2px', fontWeight: 500 }}>최근 녹음</div>
        <div
          style={{
            fontSize: '13px',
            color: T.body,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {record.affirmationText}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
        {[55, 80, 60, 100, 70, 85, 50].map((pct, k) => (
          <span key={k} style={{
            display: 'block', width: 3, borderRadius: 2,
            background: T.waveform,
            height: isPlaying ? undefined : `${pct}%`,
            minHeight: isPlaying ? 3 : undefined,
            animation: isPlaying ? `waveBar 0.45s ease-in-out ${k * 0.07}s infinite` : 'none',
            opacity: isPlaying ? 1 : 0.7,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function CalendarView() {
  const todayDate = new Date()
  const [viewYear, setViewYear] = useState(todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth())
  const [records, setRecords] = useState<DayRecord[]>([])
  const [selectedDay, setSelectedDay] = useState<DayRecord | null>(null)
  const [selectedAffirmations, setSelectedAffirmations] = useState<Affirmation[]>([])
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const isCurrentMonth = viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth()
  const showExpanded = expanded || !isCurrentMonth

  const loadRecords = useCallback(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const recs: DayRecord[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const rec = getDayRecord(dateStr)
      recs.push(rec ?? { date: dateStr, completedCount: 0, dominantCategory: null })
    }
    setRecords(recs)
  }, [viewYear, viewMonth])

  useEffect(() => {
    loadRecords()
    const onVisible = () => { if (document.visibilityState === 'visible') loadRecords() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadRecords])

  const handlePrevMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  const handleNextMonth = () => {
    setSelectedDay(null)
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

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
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  // 이번 주 7일 (일~토) — 로컬 시간 기준, 현재 달일 때만 사용
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
    const c = rec.completedCount
    const bgColor = c === 0 ? '#F7F1E6' : c < 3 ? '#FBEBCF' : '#F4CE85'
    const textColor = c === 0 ? T.muted : T.body
    const isGoldFill = isToday || isSelected
    return (
      <button
        key={rec.date}
        onClick={() => handleDayClick(rec)}
        style={{
          width: size,
          height: size,
          borderRadius: '10px',
          background: isGoldFill ? T.goldGrad : bgColor,
          border: '1px solid transparent',
          fontSize: '11px',
          color: isGoldFill ? '#FFFFFF' : textColor,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          flexShrink: 0,
          fontWeight: isToday ? 700 : 400,
        }}
      >
        {day}
      </button>
    )
  }

  return (
    <div style={{ margin: '0 16px 16px', padding: '16px', background: T.card, borderRadius: '18px', border: `1px solid ${T.cardBorder}`, boxShadow: '0 4px 16px rgba(65,36,2,0.05)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={handlePrevMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.gold, display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <span style={{ fontSize: '14px', color: T.body, fontWeight: 600, minWidth: '80px', textAlign: 'center' }}>
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            style={{ background: 'none', border: 'none', cursor: isCurrentMonth ? 'default' : 'pointer', padding: '4px', color: isCurrentMonth ? T.divider : T.gold, display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
        {isCurrentMonth && (
          <button
            onClick={() => { setExpanded((v) => !v); setSelectedDay(null) }}
            style={{ fontSize: '12px', color: T.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            {expanded ? '접기' : '전체 보기'}
            {expanded
              ? <ChevronUp size={14} strokeWidth={1.75} />
              : <ChevronDown size={14} strokeWidth={1.75} />
            }
          </button>
        )}
      </div>

      {/* 요일 레이블 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ fontSize: '10px', color: '#B7AB96', textAlign: 'center', padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 주간 뷰 (현재 달 기본) */}
      {!showExpanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {weekRecords.map((rec) => renderDayBtn(rec, 32))}
        </div>
      )}

      {/* 월간 뷰 (펼침 또는 다른 달) */}
      {showExpanded && (
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
            background: '#FBF3E4',
            borderRadius: '14px',
            fontSize: '13px',
            color: T.body,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', color: T.ink }}>
            {selectedDay.date}
          </div>

          {selectedDay.completedCount > 0 ? (
            <>
              <div style={{ marginBottom: '8px', color: T.muted }}>
                완료: {selectedDay.completedCount}개
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {selectedAffirmations.length > 0 ? selectedAffirmations.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '8px 10px',
                      background: T.card,
                      border: `1px solid ${T.cardBorder}`,
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: T.ink,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={13} color="#3B8B4E" /> {a.text}</span>
                  </div>
                )) : (
                  <div style={{ fontSize: '12px', color: T.muted }}>
                    완료한 성공의 말이 삭제되었어요
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '8px', color: T.muted }}>아직 기록이 없어요</div>
          )}

          {selectedNote && (
            <div
              style={{
                padding: '10px 12px',
                background: T.goldTint,
                borderRadius: '10px',
                border: `1px solid ${T.cardBorder}`,
                marginBottom: '8px',
              }}
            >
              <div style={{ fontSize: '10px', color: T.gold, marginBottom: '4px' }}>오늘의 나에게</div>
              <div style={{ fontSize: '13px', color: T.body, lineHeight: 1.5 }}>{selectedNote}</div>
            </div>
          )}

          <button
            onClick={() => setSelectedDay(null)}
            style={{ marginTop: '4px', fontSize: '12px', color: T.muted, background: 'none', border: 'none', cursor: 'pointer' }}
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
    let objectUrl: string | null = null
    getSuccessImage().then((record) => {
      if (!record?.imageBlob) return
      objectUrl = URL.createObjectURL(record.imageBlob)
      setImageUrl(objectUrl)
    }).catch(() => {})
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
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


export default function HomePage() {
  const router = useRouter()
  const [todayAffirmation, setTodayAffirmation] = useState<Affirmation | null>(null)
  const [allDone, setAllDone] = useState(false)
  const [repeatDone, setRepeatDone] = useState(false)
  const [hasAffirmations, setHasAffirmations] = useState(true)
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, lastCompletedDate: null, shields: 0 })
  const [todayCount, setTodayCount] = useState(0)
  const [tomorrowNote, setTomorrowNote] = useState<string | null>(null)
  const [tomorrowEnabled, setTomorrowEnabled] = useState(false)
  const [naegeSavedToday, setNaegeSavedToday] = useState(false)
  const [greeting, setGreeting] = useState<ReactElement | null>(null)
  const [tomorrowFallback, setTomorrowFallback] = useState('오늘도 잘 할 수 있어!')
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)
  const [displaySettings, setDisplaySettings] = useState({ showRecentRec: true, showSuccessImg: true, showCalendar: true })

  useEffect(() => {
    setGreeting(getGreeting())
    setTomorrowFallback(new Date().getHours() < 18 ? '오늘도 잘 할 수 있어!' : '오늘도 수고했어!')
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

  // Schedule alarm via Service Worker on app open + play audio if alarm just fired
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('@/lib/alarmScheduler').then(({ scheduleAlarm }) => scheduleAlarm())
    ;(async () => {
      const alarm = getAlarmSettings()
      if (!alarm?.affirmationId) return
      const now = new Date()
      const alarmMin = alarm.hour * 60 + alarm.minute
      const nowMin = now.getHours() * 60 + now.getMinutes()
      if (Math.abs(nowMin - alarmMin) > 5) return
      const days = alarm.repeatDays?.length > 0 ? alarm.repeatDays : [0,1,2,3,4,5,6]
      if (!days.includes(now.getDay())) return
      if (alarm.endType === 'count' && alarm.endCount && (alarm.firedCount ?? 0) >= alarm.endCount) return
      if (alarm.endType === 'date' && alarm.endDate && todayStr() > alarm.endDate) return
      if (getAlarmLastShown() === todayStr()) return
      setAlarmLastShown(todayStr())
      saveAlarmSettings({ ...alarm, firedCount: (alarm.firedCount ?? 0) + 1 })
      try {
        const records = await getAudioRecordsByAffirmationId(alarm.affirmationId)
        if (records.length > 0) {
          const latest = records.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
          const url = URL.createObjectURL(latest.blob)
          const audio = new Audio(url)
          audio.onended = () => URL.revokeObjectURL(url)
          audio.onerror = () => URL.revokeObjectURL(url)
          audio.play().catch(() => {})
        }
      } catch { /* ignore */ }
    })()
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
    setRepeatDone(getTodayRepeatDone())
    setStreakData(getStreakData())
    setTodayCount(getDayRecord(todayStr())?.completedCount ?? 0)
    const dayNote = getDayNote(today)
    if (dayNote) setTomorrowNote(dayNote)
    setTomorrowEnabled(isTomorrowEnabled())
    setNaegeSavedToday(getNaegeSeenDate() === todayStr())
  }, [])

  useEffect(() => {
    loadData()
    deleteExpiredAudioRecords().catch(() => {})
    setDisplaySettings(getHomeDisplaySettings())
    const onVisible = () => { if (document.visibilityState === 'visible') loadData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])

  const handlePlay = () => {
    if (!todayAffirmation) return
    const ids = getTodayAffirmationIds()
    const startIndex = Math.max(0, ids.indexOf(todayAffirmation.id))
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ealo-speak-queue', JSON.stringify(ids))
        sessionStorage.setItem('ealo-speak-index', String(startIndex))
        sessionStorage.setItem('ealo-speak-phase', 'initial')
        sessionStorage.removeItem('ealo-repeat-remaining')
      } catch { /* 프라이빗 브라우징 등 storage 비활성화 환경 */ }
    }
    router.push(`/speak?id=${todayAffirmation.id}`)
  }

  const handleMore = () => {
    const affirmations = getAffirmations()
    if (affirmations.length === 0) return
    const today = todayStr()
    const notDoneToday = affirmations.filter((a) => !a.completedDates.includes(today))
    const pool = notDoneToday.length > 0 ? notDoneToday : affirmations
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ealo-speak-queue', JSON.stringify([pick.id]))
        sessionStorage.setItem('ealo-speak-index', '0')
      } catch { /* 프라이빗 브라우징 등 storage 비활성화 환경 */ }
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
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.bgPrimary }}>
        {/* Greeting + Motto */}
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: T.ink, whiteSpace: 'nowrap' }}>
            {greeting}
          </div>
          <div style={{ fontSize: '16px', color: T.gold, fontWeight: 800, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            이뤄
          </div>
        </div>

        {/* Affirmation card */}
        {todayAffirmation ? (
          <div
            style={{
              background: 'linear-gradient(160deg, #FFFFFF, #FFF9EE)',
              border: `1px solid ${T.cardBorder}`,
              boxShadow: '0 8px 28px rgba(65,36,2,0.07)',
              borderRadius: '22px',
              padding: '22px 20px',
              margin: '0 16px 16px',
            }}
          >
            <div style={{
              display: 'inline-block', fontSize: '11px', fontWeight: 700, color: T.gold,
              marginBottom: '12px', letterSpacing: '0.2px',
              padding: '4px 10px', borderRadius: '999px', background: T.goldTint,
            }}>
              오늘의 성공의 말
            </div>
            <HighlightedSentence text={todayAffirmation.text} />
            <button
              onClick={handlePlay}
              style={{
                width: '100%',
                marginTop: '18px',
                padding: '14px',
                background: T.goldGrad,
                border: 'none',
                borderRadius: '14px',
                boxShadow: '0 6px 16px rgba(186,117,23,0.28)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '15px',
                fontWeight: 700,
                color: 'white',
                fontFamily: 'inherit',
              }}
            >
              <Mic size={18} strokeWidth={1.75} />
              성공의 말하기
            </button>
          </div>
        ) : allDone ? (
          <div
            style={{
              background: 'linear-gradient(160deg, #FFFFFF, #FFF9EE)',
              border: `1px solid ${T.cardBorder}`,
              boxShadow: '0 8px 28px rgba(65,36,2,0.07)',
              borderRadius: '22px',
              padding: '24px 16px',
              margin: '0 16px 16px',
              textAlign: 'center',
            }}
          >
            {repeatDone ? (
              <div style={{ fontSize: '15px', color: T.body }}>
                오늘의 성공의 말하기는 반복까지 완료했어요 🎉
              </div>
            ) : (
              <>
                <div style={{ fontSize: '15px', color: T.body, marginBottom: '14px' }}>
                  오늘의 성공의 말하기 완료했어요 🎉
                </div>
                <button
                  onClick={handleMore}
                  style={{
                    padding: '12px 28px',
                    background: T.goldGrad,
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    boxShadow: '0 6px 16px rgba(186,117,23,0.28)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  더 말하기
                </button>
              </>
            )}
            {tomorrowEnabled && naegeSavedToday && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  background: T.goldTint,
                  borderRadius: '12px',
                  border: `1px solid ${T.cardBorder}`,
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tomorrowNote ? '4px' : 0 }}>
                  <div style={{ fontSize: '11px', color: T.gold }}>오늘 나에게</div>
                  <button
                    onClick={() => router.push('/tomorrow')}
                    style={{ fontSize: '11px', color: T.gold, background: 'transparent', border: `1px solid ${T.cardBorder}`, borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}
                  >
                    수정
                  </button>
                </div>
                <div style={{ fontSize: '14px', color: tomorrowNote ? T.body : T.gold, lineHeight: 1.5 }}>
                  {tomorrowNote ?? tomorrowFallback}
                </div>
              </div>
            )}
          </div>
        ) : !hasAffirmations ? (
          <div
            style={{
              background: 'linear-gradient(160deg, #FFFFFF, #FFF9EE)',
              border: `1px solid ${T.cardBorder}`,
              boxShadow: '0 8px 28px rgba(65,36,2,0.07)',
              borderRadius: '22px',
              padding: '28px 20px',
              margin: '0 16px 16px',
              textAlign: 'center',
            }}
          >
            <Sprout size={36} color={T.gold} style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: T.ink, marginBottom: '6px' }}>
              아직 성공의 말이 없어요
            </div>
            <div style={{ fontSize: '13px', color: T.muted, marginBottom: '18px' }}>
              첫 번째 성공의 말을 만들어보세요
            </div>
            <button
              onClick={() => router.push('/create')}
              style={{
                padding: '12px 28px',
                background: T.goldGrad,
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                boxShadow: '0 6px 16px rgba(186,117,23,0.28)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              만들기
            </button>
          </div>
        ) : null}
      </div>
      <div style={{ paddingBottom: '16px' }}>
        {/* Stats / Streak — 2분할 */}
        <div style={{ margin: '0 16px 16px', display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, padding: '14px', background: T.card, borderRadius: '18px', border: `1px solid ${T.cardBorder}`, boxShadow: '0 4px 16px rgba(65,36,2,0.05)' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #FBE6BE, #F4C876)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
            }}>
              <Flame size={16} color={T.gold} strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: T.ink }}>
              {streakData.currentStreak}
            </div>
            <div style={{ fontSize: '11.5px', color: T.muted, marginTop: '2px' }}>일 연속</div>
          </div>
          <div style={{ flex: 1, padding: '14px', background: T.card, borderRadius: '18px', border: `1px solid ${T.cardBorder}`, boxShadow: '0 4px 16px rgba(65,36,2,0.05)' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: T.infoBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
            }}>
              <Shield size={16} color={T.info} strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: T.ink }}>
              {todayCount}
            </div>
            <div style={{ fontSize: '11.5px', color: T.muted, marginTop: '2px' }}>
              {streakData.shields > 0 ? `오늘 완료 · 보호막 ${streakData.shields}개` : '오늘 완료'}
            </div>
          </div>
        </div>

        {/* Calendar */}
        {displaySettings.showCalendar && <CalendarView />}

        {/* Shortcuts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '0 16px 16px' }}>
          <button
            onClick={() => router.push('/games')}
            style={{
              padding: '12px 6px',
              background: T.card,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: '14px',
              color: T.gold,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              wordBreak: 'keep-all',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textAlign: 'center',
              minHeight: '64px',
              fontFamily: 'inherit',
            }}
          >
            <Grid2X2 size={18} strokeWidth={1.75} />
            게임하기
          </button>
          <button
            onClick={() => router.push('/create')}
            style={{
              padding: '12px 6px',
              background: T.goldGrad,
              border: 'none',
              borderRadius: '14px',
              boxShadow: '0 6px 16px rgba(186,117,23,0.28)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              wordBreak: 'keep-all',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textAlign: 'center',
              minHeight: '64px',
              fontFamily: 'inherit',
            }}
          >
            <Plus size={18} strokeWidth={1.75} />
            성공의 말 만들기
          </button>
          <button
            onClick={() => router.push('/home/success-image')}
            style={{
              padding: '12px 6px',
              background: T.card,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: '14px',
              color: T.gold,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              wordBreak: 'keep-all',
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              textAlign: 'center',
              minHeight: '64px',
              fontFamily: 'inherit',
            }}
          >
            <ImageIcon size={18} strokeWidth={1.75} />
            성공 이미지 만들기
          </button>
        </div>

        {/* Recent recording player */}
        {displaySettings.showRecentRec && <RecentRecordingPlayer />}

        {/* 저장된 성공 이미지 */}
        {displaySettings.showSuccessImg && <SavedSuccessImage onTap={() => router.push('/home/success-image')} />}
      </div>

      {showWeeklyReport && <WeeklyReportModal onClose={handleCloseWeeklyReport} />}
    </AppLayout>
  )
}
