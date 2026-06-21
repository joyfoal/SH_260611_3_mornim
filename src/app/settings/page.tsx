'use client'

import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/ui/AppLayout'
import { useTheme } from '@/lib/themeContext'
import { getCategoryColor } from '@/lib/categories'
import {
  isTomorrowEnabled, setTomorrowEnabled,
  getAffirmations, updateAffirmation, clearAllData,
  getCategories, saveCategories,
  getAlarmSettings, saveAlarmSettings, clearAlarmSettings,
  getTrash, restoreFromTrash, emptyTrash,
  getCalendar, getStreakData, saveStreakData,
  getHomeDisplaySettings, setHomeDisplaySetting, deleteDayRecord,
  todayStr,
  type AlarmSettings, type Affirmation,
} from '@/lib/storage'
import {
  getAudioRecords, setAudioKeepForever, clearAllAudioRecords,
  getTrashAudioRecords, restoreAudioFromTrash, emptyAudioTrash,
  deleteAudioRecordsByAffirmationId, type AudioRecord,
} from '@/lib/audioStorage'
import { clearFaceStorage, getFaceProfileFromTrash, restoreFaceProfileFromTrash, type FaceProfile } from '@/lib/faceStorage'
import { clearSuccessImages, getSuccessImageFromTrash, restoreSuccessImageFromTrash, type SuccessImageRecord } from '@/lib/successImageStorage'
import { Pencil, Trash2, Check, X, Plus, Bell, Download, GripVertical, Palette, Power, BarChart3, Search, HardDrive, RotateCcw, Folder, BookOpen, ChevronDown, Ban } from 'lucide-react'
import { WeeklyReportModal } from '@/components/ui/WeeklyReportModal'

// ─── helpers ──────────────────────────────────────────────────────────────────
function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadJSON(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토']

// ─── Category Delete Modal ─────────────────────────────────────────────────
function CategoryDeleteModal({
  category,
  affirmationCount,
  otherCategories,
  onMove,
  onCancel,
}: {
  category: string
  affirmationCount: number
  otherCategories: string[]
  onMove: (target: string | null) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<string>(otherCategories[0] ?? '')
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', background: 'var(--color-bg-card)', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          "{category}" 삭제
        </p>
        {affirmationCount > 0 ? (
          <>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              이 카테고리에 성공의 말이 {affirmationCount}개 있어요. 어떻게 할까요?
            </p>
            {otherCategories.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>이동할 카테고리 선택</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {otherCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelected(c)}
                      style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', border: selected === c ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border)', background: selected === c ? 'var(--color-accent-light)' : 'transparent', color: selected === c ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontWeight: selected === c ? 600 : 400 }}
                    >{c}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {otherCategories.length > 0 && (
                <button onClick={() => onMove(selected)} style={{ padding: '14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                  "{selected}"로 이동 후 삭제
                </button>
              )}
              <button onClick={() => onMove(null)} style={{ padding: '14px', background: 'transparent', color: '#E53935', border: '1px solid #E53935', borderRadius: '14px', fontSize: '14px', cursor: 'pointer' }}>
                성공의 말도 함께 삭제
              </button>
              <button onClick={onCancel} style={{ padding: '12px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer' }}>
                취소
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>카테고리를 삭제할까요?</p>
            <button onClick={() => onMove(null)} style={{ padding: '14px', background: '#E53935', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>삭제</button>
            <button onClick={onCancel} style={{ padding: '12px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer' }}>취소</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
      {children}
    </div>
  )
}

// ─── 테마 패널 ──────────────────────────────────────────────────────────────────
function ThemePanel() {
  const { themeName, setTheme } = useTheme()
  const THEMES = [
    { name: 'warm' as const, label: '따뜻한 황금', color: '#BA7517', bg: '#FFFAF5' },
    { name: 'dark' as const, label: '딥 퍼플', color: '#534AB7', bg: '#1a1a2e' },
    { name: 'green' as const, label: '내추럴 그린', color: '#639922', bg: '#F4F9F0' },
  ]
  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>테마 선택</p>
      <div className="flex gap-3">
        {THEMES.map((t) => (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            style={{ flex: 1, padding: '14px 8px', borderRadius: '14px', border: themeName === t.name ? `2px solid ${t.color}` : '2px solid transparent', background: t.bg, cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.color, margin: '0 auto 8px' }} />
            <p style={{ fontSize: '11px', color: t.color, fontWeight: 600 }}>{t.label}</p>
          </button>
        ))}
      </div>
    </Panel>
  )
}

// ─── On/Off 패널 ──────────────────────────────────────────────────────────────
function TogglePanel() {
  const [settings, setSettings] = useState({ showRecentRec: true, showSuccessImg: true, showCalendar: true })
  const [naege, setNaege] = useState(true)

  useEffect(() => {
    setSettings(getHomeDisplaySettings())
    setNaege(isTomorrowEnabled())
  }, [])

  const toggle = (key: 'showRecentRec' | 'showSuccessImg' | 'showCalendar') => {
    const val = !settings[key]
    setHomeDisplaySetting(key, val)
    setSettings((p) => ({ ...p, [key]: val }))
  }

  const toggleNaege = () => {
    const val = !naege
    setTomorrowEnabled(val)
    setNaege(val)
  }

  const items = [
    { key: 'showRecentRec' as const, label: '최근 녹음 표시', desc: '홈 화면에 최근 녹음 플레이어 표시' },
    { key: 'showSuccessImg' as const, label: '성공 이미지 표시', desc: '홈 화면에 성공 이미지 표시' },
    { key: 'showCalendar' as const, label: '달력 표시', desc: '홈 화면에 달력 표시' },
  ]

  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>홈 화면 표시 설정</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              style={{ width: '48px', height: '28px', borderRadius: '14px', background: settings[key] ? 'var(--color-accent-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: settings[key] ? '23px' : '3px', transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>성공의 말 후 나에게 표시</p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>완료 후 나에게 메시지 남기기</p>
          </div>
          <button
            onClick={toggleNaege}
            style={{ width: '48px', height: '28px', borderRadius: '14px', background: naege ? 'var(--color-accent-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: naege ? '23px' : '3px', transition: 'left 0.2s' }} />
          </button>
        </div>
      </div>
    </Panel>
  )
}

// ─── 알림 패널 ────────────────────────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function CustomSelect({ value, onChange, options, width }: {
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const label = options.find((o) => o.value === value)?.label ?? ''
  return (
    <div style={{ position: 'relative', width: width ?? '100%' }}>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--color-accent-primary)', borderRadius: '12px', fontSize: '14px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
      >
        <span>{label}</span>
        <ChevronDown size={16} color="var(--color-accent-primary)" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--color-bg-card)', border: '1.5px solid var(--color-accent-primary)', borderRadius: '12px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{ padding: '11px 14px', fontSize: '14px', color: opt.value === value ? 'var(--color-accent-primary)' : 'var(--color-text-primary)', background: opt.value === value ? 'var(--color-accent-light)' : 'transparent', cursor: 'pointer', fontWeight: opt.value === value ? 600 : 400 }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlarmPanel() {
  const [alarm, setAlarm] = useState<AlarmSettings | null>(null)
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [audioMap, setAudioMap] = useState<Record<string, AudioRecord>>({})
  const [selectedAffId, setSelectedAffId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hour, setHour] = useState(7)
  const [minute, setMinute] = useState(0)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [endType, setEndType] = useState<'none' | 'date' | 'count'>('none')
  const [endDate, setEndDate] = useState('')
  const [endCount, setEndCount] = useState(30)
  const [saving, setSaving] = useState(false)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const current = getAlarmSettings()
    setAlarm(current)
    if (current) {
      setSelectedAffId(current.affirmationId ?? '')
      setHour(current.hour)
      setMinute(current.minute)
      setRepeatDays(current.repeatDays ?? [])
      setEndType(current.endType ?? 'none')
      setEndDate(current.endDate ?? '')
      setEndCount(current.endCount ?? 30)
    }
    const affs = getAffirmations()
    setAffirmations(affs)
    setCategories(getCategories())
    getAudioRecords().then((recs) => {
      const map: Record<string, AudioRecord> = {}
      for (const r of recs) {
        if (!map[r.affirmationId] || r.createdAt > map[r.affirmationId].createdAt) map[r.affirmationId] = r
      }
      setAudioMap(map)
    }).catch(() => {})
    if (typeof window !== 'undefined' && 'Notification' in window) setNotifPerm(Notification.permission)
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) return
    setNotifPerm(await Notification.requestPermission())
  }

  const toggleDay = (day: number) =>
    setRepeatDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])

  const playPreview = (affId: string) => {
    const rec = audioMap[affId]
    if (!rec) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const url = URL.createObjectURL(rec.blob)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null }
    audio.play().catch(() => URL.revokeObjectURL(url))
  }

  const handleSave = async () => {
    if (!selectedAffId) return
    setSaving(true)
    if ('Notification' in window && Notification.permission !== 'granted') {
      setNotifPerm(await Notification.requestPermission())
    }
    const settings: AlarmSettings = {
      affirmationId: selectedAffId,
      hour, minute, repeatDays, endType,
      endDate: endType === 'date' ? endDate : '',
      endCount: endType === 'count' ? endCount : 0,
      firedCount: alarm?.firedCount ?? 0,
    }
    saveAlarmSettings(settings)
    setAlarm(settings)
    import('@/lib/alarmScheduler').then(({ scheduleAlarm }) => scheduleAlarm())
    setSaving(false)
  }

  const handleClear = () => {
    clearAlarmSettings(); setAlarm(null)
    import('@/lib/alarmScheduler').then(({ cancelAlarm }) => cancelAlarm())
  }

  const fmtHour = (h: number) => `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}시`
  const catAffs = selectedCategory ? affirmations.filter((a) => a.category === selectedCategory) : []
  const selectedAff = affirmations.find((a) => a.id === selectedAffId)

  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>알림 설정</p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
        {alarm ? `${fmtHour(alarm.hour)} ${String(alarm.minute).padStart(2, '0')}분 알림 설정됨` : '설정된 알림 없음'}
      </p>

      {/* 알림 권한 */}
      <div style={{ padding: '12px 14px', background: notifPerm === 'denied' ? '#FFF0EE' : notifPerm === 'granted' ? '#F0FBF0' : 'var(--color-accent-light)', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: notifPerm === 'denied' ? '#FFDDD9' : notifPerm === 'granted' ? '#C8F0C8' : 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {notifPerm === 'denied' ? <Ban size={16} color="#E53935" /> : notifPerm === 'granted' ? <Check size={16} color="#2E7D32" /> : <Bell size={16} color="var(--color-accent-primary)" />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: notifPerm === 'denied' ? '#E53935' : notifPerm === 'granted' ? '#2E7D32' : 'var(--color-accent-primary)' }}>
            {notifPerm === 'granted' ? '알림 허용됨' : notifPerm === 'denied' ? '알림 차단됨' : '알림 권한 필요'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
            {notifPerm === 'denied' ? '기기 설정에서 알림을 허용해주세요' : notifPerm === 'granted' ? '백그라운드에서도 알림을 받을 수 있어요' : '알림을 받으려면 권한을 허용해주세요'}
          </p>
        </div>
        {notifPerm === 'default' && (
          <button onClick={requestPermission} style={{ padding: '7px 14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            허용
          </button>
        )}
      </div>

      {/* 알림 시간 */}
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>알림 시간</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <CustomSelect
          value={hour}
          onChange={setHour}
          options={Array.from({ length: 24 }, (_, i) => ({ value: i, label: fmtHour(i) }))}
        />
        <CustomSelect
          value={minute}
          onChange={setMinute}
          options={[0, 10, 20, 30, 40, 50].map((m) => ({ value: m, label: `${String(m).padStart(2, '0')}분` }))}
          width="110px"
        />
      </div>

      {/* 성공의 말 선택 */}
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>성공의 말 선택</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {categories.map((cat) => {
          const on = selectedCategory === cat
          return (
            <button key={cat} onClick={() => setSelectedCategory(on ? null : cat)}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: on ? 700 : 500, cursor: 'pointer', border: 'none', background: on ? 'var(--color-accent-primary)' : 'var(--color-accent-light)', color: on ? '#fff' : 'var(--color-accent-primary)', transition: 'all 0.15s' }}>
              {cat}
            </button>
          )
        })}
      </div>

      {selectedCategory && catAffs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto', marginBottom: '12px' }}>
          {catAffs.map((aff) => {
            const hasRec = !!audioMap[aff.id]
            const isSel = selectedAffId === aff.id
            return (
              <div key={aff.id} onClick={() => setSelectedAffId(aff.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: isSel ? 'var(--color-accent-light)' : 'var(--color-bg-primary)', border: isSel ? '1.5px solid var(--color-accent-primary)' : '1px solid var(--color-border)', borderRadius: '10px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{aff.text}</span>
                {hasRec && (
                  <button onClick={(e) => { e.stopPropagation(); playPreview(aff.id) }}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-accent-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▶</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 선택된 성공의 말 표시 */}
      {selectedAff && (
        <div style={{ padding: '10px 14px', background: 'var(--color-bg-primary)', borderRadius: '10px', border: '1px solid var(--color-accent-primary)', marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-accent-primary)', marginBottom: '4px', fontWeight: 600 }}>선택된 성공의 말</p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{selectedAff.text}</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {audioMap[selectedAffId] ? '🎙 녹음 있음 — 알림 시 재생됩니다' : '알림 시 성공의 말 텍스트만 표시됩니다'}
          </p>
        </div>
      )}

      {/* 반복 설정 */}
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>반복 요일 <span style={{ fontSize: '11px' }}>(선택 없음 = 매일)</span></p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '16px' }}>
        {DAY_LABELS.map((label, day) => {
          const on = repeatDays.includes(day)
          return (
            <button key={day} onClick={() => toggleDay(day)}
              style={{ aspectRatio: '1', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: on ? 'none' : '1.5px solid var(--color-accent-primary)', background: on ? 'var(--color-accent-primary)' : 'transparent', color: on ? '#fff' : 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {label}
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '8px' }}>종료 설정</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {(['none', 'date', 'count'] as const).map((type) => {
          const on = endType === type
          return (
            <div key={type} onClick={() => setEndType(type)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${on ? 'var(--color-accent-primary)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.15s' }}>
                {on && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent-primary)' }} />}
              </div>
              {type === 'none' && <span style={{ fontSize: '13px', color: on ? 'var(--color-accent-primary)' : 'var(--color-text-primary)', fontWeight: on ? 600 : 400 }}>무제한 반복</span>}
              {type === 'date' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '13px', color: on ? 'var(--color-accent-primary)' : 'var(--color-text-primary)', fontWeight: on ? 600 : 400, flexShrink: 0 }}>종료 날짜</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={() => setEndType('date')}
                    style={{ flex: 1, padding: '7px 10px', border: `1.5px solid ${on ? 'var(--color-accent-primary)' : 'var(--color-border)'}`, borderRadius: '10px', fontSize: '13px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} />
                </div>
              )}
              {type === 'count' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="number" min={1} value={endCount} onChange={(e) => setEndCount(Number(e.target.value))} onClick={() => setEndType('count')}
                    style={{ width: '64px', padding: '7px 10px', border: `1.5px solid ${on ? 'var(--color-accent-primary)' : 'var(--color-border)'}`, borderRadius: '10px', fontSize: '13px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none', textAlign: 'center' }} />
                  <span style={{ fontSize: '13px', color: on ? 'var(--color-accent-primary)' : 'var(--color-text-primary)', fontWeight: on ? 600 : 400 }}>회 반복 후 종료</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSave} disabled={!selectedAffId || saving}
          style={{ flex: 1, padding: '14px', background: selectedAffId ? 'var(--color-accent-primary)' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: selectedAffId ? 'pointer' : 'not-allowed', transition: 'background 0.15s' }}>
          {saving ? '저장 중...' : '알림 설정 저장'}
        </button>
        {alarm && (
          <button onClick={handleClear} style={{ padding: '14px 18px', background: 'transparent', border: '1.5px solid #E53935', borderRadius: '14px', color: '#E53935', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            해제
          </button>
        )}
      </div>
    </Panel>
  )
}

// ─── 통계 패널 ────────────────────────────────────────────────────────────────
function StatsPanel() {
  const [showReport, setShowReport] = useState(false)

  const affirmations = getAffirmations()
  const calendar = getCalendar()
  const streak = getStreakData()
  const categories = getCategories()

  const totalCompletions = affirmations.reduce((s, a) => s + a.completedDates.length, 0)
  const daysWithCompletions = calendar.filter((d) => d.completedCount > 0).length

  const topAffirmations = [...affirmations]
    .sort((a, b) => b.completedDates.length - a.completedDates.length)
    .slice(0, 10)

  const byCategory = categories.map((cat) => ({
    cat,
    count: affirmations.filter((a) => a.category === cat).reduce((s, a) => s + a.completedDates.length, 0),
  })).sort((a, b) => b.count - a.count)

  // Last 14 days
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().split('T')[0]
    const rec = calendar.find((c) => c.date === key)
    return { date: key, count: rec?.completedCount ?? 0, dayKo: DAY_KO[d.getDay()] }
  })

  const maxCount = Math.max(...last14.map((d) => d.count), 1)

  const handleExport = () => {
    const lines: string[] = [
      '=== 모님 통계 리포트 ===',
      `생성: ${new Date().toLocaleString('ko-KR')}`,
      '',
      '▸ 전체 요약',
      `등록된 성공의 말: ${affirmations.length}개`,
      `전체 완료 횟수: ${totalCompletions}회`,
      `완료한 날: ${daysWithCompletions}일`,
      `현재 연속: ${streak.currentStreak}일`,
      '',
      '▸ 최근 14일',
      ...last14.map((d) => `${d.date} (${d.dayKo}): ${d.count}회`),
      '',
      '▸ 많이 한 성공의 말 TOP 10',
      ...topAffirmations.map((a, i) => `${i + 1}. "${a.text}" — ${a.completedDates.length}회`),
      '',
      '▸ 카테고리별 완료',
      ...byCategory.map((c) => `${c.cat}: ${c.count}회`),
    ]
    downloadText(lines.join('\n'), `mornim-stats-${todayStr()}.txt`)
  }

  const statBox = (label: string, value: string) => (
    <div style={{ flex: 1, background: 'var(--color-bg-primary)', borderRadius: '12px', padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  )

  return (
    <Panel>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>통계</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowReport(true)} style={{ padding: '6px 12px', background: 'var(--color-accent-light)', border: 'none', borderRadius: '8px', fontSize: '12px', color: 'var(--color-accent-primary)', fontWeight: 600, cursor: 'pointer' }}>
            주간 리포트
          </button>
          <button onClick={handleExport} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Download size={11} />텍스트
          </button>
        </div>
      </div>

      {/* Summary boxes */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {statBox('성공의 말', `${affirmations.length}개`)}
        {statBox('전체 완료', `${totalCompletions}회`)}
        {statBox('완료 일수', `${daysWithCompletions}일`)}
        {statBox('연속 기록', `${streak.currentStreak}일`)}
      </div>

      {/* 14-day bar chart */}
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>최근 14일</p>
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '60px', marginBottom: '4px' }}>
        {last14.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
            <div
              style={{ width: '100%', background: d.count > 0 ? 'var(--color-accent-primary)' : 'var(--color-border)', borderRadius: '3px 3px 0 0', height: `${d.count === 0 ? 4 : Math.max(8, (d.count / maxCount) * 52)}px`, transition: 'height 0.3s' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '3px' }}>
        {last14.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '8px', color: 'var(--color-text-muted)' }}>{d.dayKo}</div>
        ))}
      </div>

      {/* Top affirmations */}
      {topAffirmations.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>많이 한 성공의 말 TOP 10</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topAffirmations.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--color-bg-primary)', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: i < 3 ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', minWidth: '20px' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '12px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{a.text}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent-primary)', flexShrink: 0 }}>{a.completedDates.length}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By category */}
      {byCategory.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>카테고리별 완료</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {byCategory.map(({ cat, count }) => {
              const colors = getCategoryColor(cat, categories)
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: colors.dark, background: colors.light, padding: '2px 10px', borderRadius: '12px', minWidth: '80px' }}>{cat}</span>
                  <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: colors.dark, borderRadius: '3px', width: `${byCategory[0].count > 0 ? (count / byCategory[0].count) * 100 : 0}%` }} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', minWidth: '30px', textAlign: 'right' }}>{count}회</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showReport && <WeeklyReportModal onClose={() => setShowReport(false)} />}
    </Panel>
  )
}

// ─── 찾기 패널 ────────────────────────────────────────────────────────────────
function SearchPanel() {
  const [query, setQuery] = useState('')
  const [dateQuery, setDateQuery] = useState('')
  const [dateQueryEnd, setDateQueryEnd] = useState('')

  const affirmations = getAffirmations()

  const textResults = query.trim()
    ? affirmations.filter((a) => a.text.includes(query.trim()))
    : []

  const handleExportText = () => {
    if (textResults.length === 0) return
    const lines = [
      `=== 찾기 결과: "${query}" ===`,
      `생성: ${new Date().toLocaleString('ko-KR')}`,
      `결과: ${textResults.length}개`,
      '',
      ...textResults.map((a, i) => [
        `${i + 1}. "${a.text}"`,
        `   카테고리: ${a.category}`,
        `   총 완료: ${a.completedDates.length}회`,
        `   마지막 완료: ${a.completedDates.length > 0 ? a.completedDates[a.completedDates.length - 1] : '없음'}`,
        `   완료 날짜: ${a.completedDates.join(', ') || '없음'}`,
      ].join('\n')),
    ]
    downloadText(lines.join('\n'), `mornim-search-${todayStr()}.txt`)
  }


  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>찾기</p>

      {/* Text search */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>성공의 말 검색</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }}
          />
          {textResults.length > 0 && (
            <button onClick={handleExportText} style={{ padding: '10px 12px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <Download size={12} />텍스트
            </button>
          )}
        </div>
        {query.trim() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {textResults.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>검색 결과가 없어요</p>
            ) : textResults.map((a) => (
              <div key={a.id} style={{ padding: '12px', background: 'var(--color-bg-primary)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginBottom: '6px', lineHeight: 1.4 }}>{a.text}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-accent-primary)' }}>✓ {a.completedDates.length}회 완료</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{a.category}</span>
                  {a.completedDates.length > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>마지막: {a.completedDates[a.completedDates.length - 1]}</span>
                  )}
                </div>
                {a.completedDates.length > 0 && (
                  <details style={{ marginTop: '6px' }}>
                    <summary style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>완료 날짜 보기 ({a.completedDates.length}일)</summary>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', lineHeight: 1.8 }}>
                      {a.completedDates.join(' · ')}
                    </p>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date range search */}
      <div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>날짜 범위 검색</p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <input type="date" value={dateQuery} onChange={(e) => setDateQuery(e.target.value)}
            style={{ flex: 1, minWidth: '120px', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} />
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>~</span>
          <input type="date" value={dateQueryEnd} onChange={(e) => setDateQueryEnd(e.target.value)}
            style={{ flex: 1, minWidth: '120px', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} />
        </div>
        {dateQuery && (
          <>
            {(() => {
              const endStr = dateQueryEnd || dateQuery
              const dateRangeResults = affirmations.filter((a) =>
                a.completedDates.some((d) => d >= dateQuery && d <= endStr)
              )
              const totalInRange = dateRangeResults.reduce((sum, a) => sum + a.completedDates.filter((d) => d >= dateQuery && d <= endStr).length, 0)

              const handleExportRange = () => {
                if (dateRangeResults.length === 0) return
                const lines = [
                  `=== ${dateQuery} ~ ${endStr} 기록 ===`,
                  `생성: ${new Date().toLocaleString('ko-KR')}`,
                  `기간 내 완료 횟수: ${totalInRange}회`,
                  '',
                  ...dateRangeResults.map((a) => {
                    const datesInRange = a.completedDates.filter((d) => d >= dateQuery && d <= endStr)
                    return `"${a.text}" (${a.category}) — ${datesInRange.length}회\n  ${datesInRange.join(', ')}`
                  }),
                ]
                downloadText(lines.join('\n'), `mornim-search-${dateQuery}-${endStr}.txt`)
              }

              return (
                <>
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--color-accent-primary)', fontWeight: 600 }}>
                      {dateRangeResults.length}개 · 총 {totalInRange}회 완료
                    </p>
                    {dateRangeResults.length > 0 && (
                      <button onClick={handleExportRange} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <Download size={11} />텍스트
                      </button>
                    )}
                  </div>
                  {dateRangeResults.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>해당 기간에 완료한 성공의 말이 없어요</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {dateRangeResults.map((a) => {
                        const cnt = a.completedDates.filter((d) => d >= dateQuery && d <= endStr).length
                        return (
                          <div key={a.id} style={{ padding: '10px 12px', background: 'var(--color-bg-primary)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{a.text}</p>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{a.category} · 기간 내 {cnt}회 완료</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}
      </div>
    </Panel>
  )
}

// ─── 백업 패널 ────────────────────────────────────────────────────────────────
function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackup = () => {
    downloadJSON({
      version: '1.0',
      app: '모님',
      exportedAt: new Date().toISOString(),
      affirmations: getAffirmations(),
      categories: getCategories(),
      calendar: getCalendar(),
      streak: getStreakData(),
    }, `mornim-backup-${todayStr()}.json`)
  }

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.affirmations) { alert('올바른 백업 파일이 아니에요.'); return }
        const dateStr = data.exportedAt ? new Date(data.exportedAt).toLocaleString('ko-KR') : '알 수 없음'
        if (!confirm(`${dateStr} 백업을 복구할까요?\n현재 데이터가 덮어씌워집니다.`)) return
        if (typeof window === 'undefined') return
        localStorage.setItem('mornim-affirmations', JSON.stringify(data.affirmations ?? []))
        localStorage.setItem('mornim-categories', JSON.stringify(data.categories ?? []))
        localStorage.setItem('mornim-calendar', JSON.stringify(data.calendar ?? []))
        localStorage.setItem('mornim-streak', JSON.stringify(data.streak ?? { currentStreak: 0, lastCompletedDate: null, shields: 0 }))
        alert('복구 완료! 앱을 다시 시작해요.')
        window.location.reload()
      } catch { alert('파일을 읽을 수 없어요.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>백업</p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
        성공의 말, 카테고리, 달력 기록을 JSON 파일로 저장하고 복구해요
      </p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
        녹음 파일은 백업·복구할 수 없어요
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleBackup}
          style={{ flex: 1, padding: '14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Download size={16} />백업
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1, padding: '14px', background: 'transparent', border: '1.5px solid var(--color-accent-primary)', borderRadius: '14px', fontSize: '15px', fontWeight: 600, color: 'var(--color-accent-primary)', cursor: 'pointer' }}>
          복구
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestoreFile} style={{ display: 'none' }} />
      </div>
    </Panel>
  )
}

// ─── 지우기 패널 ──────────────────────────────────────────────────────────────
function DeletePanel() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [msg, setMsg] = useState('')

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const handleDeleteAll = async () => {
    if (!confirm('모든 성공의 말과 녹음을 삭제할까요?')) return
    for (const a of getAffirmations()) {
      try { await deleteAudioRecordsByAffirmationId(a.id) } catch { /* ignore */ }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mornim-affirmations')
      localStorage.removeItem('mornim-today-affirmations')
    }
    showMsg('성공의 말과 녹음이 삭제됐어요.')
  }

  const handleDeleteAudio = async () => {
    if (!confirm('저장된 모든 녹음 파일을 삭제할까요?')) return
    await clearAllAudioRecords()
    showMsg('모든 녹음이 삭제됐어요.')
  }

  const handleDeleteDateRange = () => {
    if (!dateFrom) return
    const endStr = dateTo || dateFrom
    const affs = getAffirmations()
    const dates: string[] = []
    const d = new Date(dateFrom)
    const end = new Date(endStr)
    while (d <= end) {
      dates.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    const totalRecords = affs.reduce((sum, a) => sum + a.completedDates.filter((c) => dates.includes(c)).length, 0)
    if (totalRecords === 0) { showMsg('해당 기간에 기록이 없어요.'); return }
    const label = dateFrom === endStr ? dateFrom : `${dateFrom} ~ ${endStr}`
    if (!confirm(`${label} 기간의 기록 ${totalRecords}개를 삭제할까요?`)) return
    dates.forEach((date) => deleteDayRecord(date))
    setDateFrom(''); setDateTo('')
    showMsg(`${label} 기록이 삭제됐어요.`)
  }

  const handleReset = async () => {
    if (!confirm('모든 데이터를 초기화할까요?\n이 작업은 되돌릴 수 없습니다.')) return
    clearAllData()
    await Promise.all([clearAllAudioRecords(), clearFaceStorage(), clearSuccessImages()])
    window.location.href = '/'
  }

  const btnStyle = (color: string, bg: string, border?: string): React.CSSProperties => ({
    width: '100%', padding: '14px', background: bg, color, border: border ?? 'none',
    borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', textAlign: 'left',
  })

  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>지우기</p>

      {msg && (
        <div style={{ padding: '10px 14px', background: '#E8F5E9', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', color: '#2E7D32' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 날짜 범위 지우기 */}
        <div style={{ padding: '14px', background: 'var(--color-bg-primary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '10px' }}>날짜 선택 지우기</p>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ flex: 1, minWidth: '110px', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', background: 'white', color: 'var(--color-text-primary)', outline: 'none' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>~</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={{ flex: 1, minWidth: '110px', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px', background: 'white', color: 'var(--color-text-primary)', outline: 'none' }} />
          </div>
          <button onClick={handleDeleteDateRange} disabled={!dateFrom}
            style={{ width: '100%', padding: '9px', background: dateFrom ? '#FF7043' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: dateFrom ? 'pointer' : 'not-allowed', fontWeight: 500 }}>
            삭제
          </button>
        </div>

        <button onClick={handleDeleteAudio} style={btnStyle('var(--color-text-primary)', 'var(--color-bg-primary)', '1px solid var(--color-border)')}>
          🎙 모든 녹음 파일 삭제
        </button>

        <button onClick={handleDeleteAll} style={btnStyle('#E65100', '#FFF3E0', '1px solid #FFCCBC')}>
          ✦ 성공의 말 전체 지우기
        </button>

        <button onClick={handleReset} style={btnStyle('#C62828', 'transparent', '1px solid #E53935')}>
          <span style={{ fontWeight: 600 }}>⚠ 전체 초기화</span>
        </button>
      </div>
    </Panel>
  )
}

// ─── 휴지통 패널 ──────────────────────────────────────────────────────────────
function TrashPanel() {
  const [affirmations, setAffirmations] = useState<ReturnType<typeof getTrash>>([])
  const [audios, setAudios] = useState<AudioRecord[]>([])
  const [faceProfile, setFaceProfile] = useState<FaceProfile | null>(null)
  const [successImage, setSuccessImage] = useState<SuccessImageRecord | null>(null)

  const totalCount = affirmations.length + audios.length + (faceProfile ? 1 : 0) + (successImage ? 1 : 0)

  const reload = async () => {
    setAffirmations(getTrash())
    try { setAudios(await getTrashAudioRecords()) } catch { setAudios([]) }
    try { setFaceProfile(await getFaceProfileFromTrash()) } catch { setFaceProfile(null) }
    try { setSuccessImage(await getSuccessImageFromTrash()) } catch { setSuccessImage(null) }
  }

  useEffect(() => { reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestoreAffirmation = (id: string) => { restoreFromTrash(id); reload() }
  const handleRestoreAudio = async (id: string) => { await restoreAudioFromTrash(id); reload() }
  const handleRestoreFace = async () => { await restoreFaceProfileFromTrash(); reload() }
  const handleRestoreSuccess = async () => { await restoreSuccessImageFromTrash(); reload() }
  const handleEmpty = async () => {
    if (!confirm('휴지통을 비울까요? 모든 항목이 영구 삭제됩니다.')) return
    emptyTrash()
    await Promise.all([emptyAudioTrash(), faceProfile ? clearFaceStorage() : Promise.resolve(), successImage ? clearSuccessImages() : Promise.resolve()])
    reload()
  }

  const itemStyle: React.CSSProperties = { padding: '10px 12px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }
  const restoreBtn: React.CSSProperties = { padding: '5px 10px', border: '1px solid var(--color-accent-primary)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--color-accent-primary)', flexShrink: 0 }
  const label = (icon: string, text: string) => (
    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', background: 'var(--color-bg-primary)', borderRadius: '6px', padding: '2px 6px', marginBottom: '2px', display: 'inline-block' }}>{icon} {text}</span>
  )

  return (
    <Panel>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>휴지통</p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>성공의 말 · 녹음 · 이미지 · {totalCount}개</p>
        </div>
        {totalCount > 0 && (
          <button onClick={handleEmpty} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #E53935', borderRadius: '10px', color: '#E53935', fontSize: '12px', cursor: 'pointer' }}>
            비우기
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
          휴지통이 비어있어요
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {affirmations.map((item) => (
            <div key={item.id} style={itemStyle}>
              <div style={{ flex: 1 }}>
                {label('✦', '성공의 말')}
                <p style={{ fontSize: '13px', color: 'var(--color-text-onDark)', lineHeight: 1.4, marginBottom: '2px' }}>{item.text}</p>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.category}</span>
              </div>
              <button onClick={() => handleRestoreAffirmation(item.id)} style={restoreBtn}>복원</button>
            </div>
          ))}
          {audios.map((rec) => (
            <div key={rec.id} style={itemStyle}>
              <div style={{ flex: 1 }}>
                {label('🎙', '녹음 파일')}
                <p style={{ fontSize: '13px', color: 'var(--color-text-onDark)', lineHeight: 1.4, marginBottom: '2px' }}>{rec.affirmationText}</p>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{new Date(rec.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              <button onClick={() => handleRestoreAudio(rec.id)} style={restoreBtn}>복원</button>
            </div>
          ))}
          {faceProfile && (
            <div style={itemStyle}>
              <div style={{ flex: 1 }}>
                {label('👤', '프로필 이미지')}
                <p style={{ fontSize: '13px', color: 'var(--color-text-onDark)', lineHeight: 1.4 }}>{new Date(faceProfile.createdAt).toLocaleDateString('ko-KR')} 생성</p>
              </div>
              <button onClick={handleRestoreFace} style={restoreBtn}>복원</button>
            </div>
          )}
          {successImage && (
            <div style={itemStyle}>
              <div style={{ flex: 1 }}>
                {label('🖼', '성공 이미지')}
                <p style={{ fontSize: '13px', color: 'var(--color-text-onDark)', lineHeight: 1.4 }}>{new Date(successImage.createdAt).toLocaleDateString('ko-KR')} 생성</p>
              </div>
              <button onClick={handleRestoreSuccess} style={restoreBtn}>복원</button>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

// ─── 카테고리 패널 ────────────────────────────────────────────────────────────
function CategoryPanel() {
  const [categories, setCategories] = useState<string[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; idx: number } | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragStartYRef = useRef(0)
  const [addingCat, setAddingCat] = useState(false)
  const [catAlternative, setCatAlternative] = useState<string | null>(null)

  useEffect(() => { setCategories(getCategories()) }, [])
  const reload = () => setCategories(getCategories())

  const handleGripDown = (e: React.PointerEvent, idx: number) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartYRef.current = e.clientY
    setDragIdx(idx)
    setOverIdx(idx)
  }
  const handleGripMove = (e: React.PointerEvent, idx: number) => {
    if (dragIdx !== idx) return
    const delta = Math.round((e.clientY - dragStartYRef.current) / 52)
    setOverIdx(Math.max(0, Math.min(categories.length - 1, idx + delta)))
  }
  const handleGripUp = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const updated = [...categories]
      const [removed] = updated.splice(dragIdx, 1)
      updated.splice(overIdx, 0, removed)
      saveCategories(updated)
      setCategories(updated)
    }
    setDragIdx(null); setOverIdx(null)
  }

  const commitEdit = () => {
    if (editingIdx === null) return
    const name = editValue.trim()
    if (!name || name === categories[editingIdx]) { setEditingIdx(null); return }
    if (categories.includes(name)) { alert('이미 있는 카테고리예요.'); return }
    const oldName = categories[editingIdx]
    getAffirmations().forEach((a) => { if (a.category === oldName) updateAffirmation({ ...a, category: name }) })
    const updated = [...categories]; updated[editingIdx] = name
    saveCategories(updated); setCategories(updated); setEditingIdx(null)
  }

  const doAddCategory = (name: string) => {
    const updated = [...categories, name]
    saveCategories(updated); setCategories(updated)
    setNewCatName(''); setCatAlternative(null); setAddMode(false)
  }

  const handleAdd = async () => {
    const name = newCatName.trim()
    if (!name) return
    if (categories.includes(name)) { alert('이미 있는 카테고리예요.'); return }
    setAddingCat(true)
    try {
      const res = await fetch('/api/detect-negative', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: name }) })
      const data = await res.json() as { isNegative: boolean; alternative: string | null }
      if (data.isNegative && data.alternative) { setCatAlternative(data.alternative); setAddingCat(false); return }
    } catch { /* 네트워크 오류 시 통과 */ }
    setAddingCat(false); doAddCategory(name)
  }

  const handleDeleteConfirm = (targetCategory: string | null) => {
    if (!deleteTarget) return
    const { name } = deleteTarget
    const remaining = categories.filter((c) => c !== name)
    const fallback = targetCategory ?? remaining[0] ?? '기타'
    getAffirmations().forEach((a) => { if (a.category === name) updateAffirmation({ ...a, category: fallback }) })
    saveCategories(remaining); setCategories(remaining); setDeleteTarget(null); reload()
  }

  const affCountFor = (cat: string) => getAffirmations().filter((a) => a.category === cat).length

  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>카테고리 관리</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {categories.map((cat, idx) => {
          const colors = getCategoryColor(cat, categories)
          const isEditing = editingIdx === idx
          const isDraggingThis = dragIdx === idx
          const isOver = overIdx === idx && overIdx !== dragIdx
          return (
            <div key={cat} style={{ borderTop: isOver ? '2px solid var(--color-accent-primary)' : '2px solid transparent', transition: 'border-color 0.1s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '10px', background: colors.light, opacity: isDraggingThis ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                {isEditing ? (
                  <>
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitEdit(); if (e.key === 'Escape') setEditingIdx(null) }}
                      style={{ flex: 1, background: 'white', border: `1px solid ${colors.dark}`, borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: colors.dark, outline: 'none' }} />
                    <button onClick={commitEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.dark, padding: '2px' }}><Check size={16} /></button>
                    <button onClick={() => setEditingIdx(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: colors.dark }}>{cat}</span>
                    <span style={{ fontSize: '11px', color: `${colors.dark}88` }}>{affCountFor(cat)}개</span>
                    <button onClick={() => { setEditingIdx(idx); setEditValue(categories[idx]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.dark, padding: '2px' }}><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget({ name: cat, idx })} disabled={categories.length <= 1} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', padding: '2px' }}><Trash2 size={14} /></button>
                    <button onPointerDown={(e) => handleGripDown(e, idx)} onPointerMove={(e) => handleGripMove(e, idx)} onPointerUp={handleGripUp} onPointerCancel={handleGripUp} style={{ background: 'none', border: 'none', cursor: 'grab', color: `${colors.dark}88`, padding: '2px', touchAction: 'none' }}><GripVertical size={16} /></button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {addMode ? (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input autoFocus value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setCatAlternative(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd(); if (e.key === 'Escape') { setAddMode(false); setNewCatName(''); setCatAlternative(null) } }}
              placeholder="새 카테고리 이름"
              style={{ flex: 1, padding: '10px 12px', background: 'white', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none' }} />
            <button onClick={handleAdd} disabled={addingCat} style={{ padding: '10px 16px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: addingCat ? 0.6 : 1 }}>{addingCat ? '확인 중...' : '추가'}</button>
            <button onClick={() => { setAddMode(false); setNewCatName(''); setCatAlternative(null) }} style={{ padding: '10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={14} /></button>
          </div>
          {catAlternative && (
            <div style={{ marginTop: '8px', padding: '12px', background: '#FFF3CD', borderRadius: '10px', border: '1px solid #FFE082' }}>
              <p style={{ fontSize: '12px', color: '#795548', marginBottom: '6px' }}>부정적인 표현이 감지됐어요. 이렇게 바꿔볼까요?</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#4E342E', marginBottom: '10px' }}>{catAlternative}</p>
              <div className="flex gap-2">
                <button onClick={() => doAddCategory(catAlternative)} style={{ flex: 1, padding: '8px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>이 이름으로 추가</button>
                <button onClick={() => { setNewCatName(''); setCatAlternative(null) }} style={{ flex: 1, padding: '8px', background: 'transparent', color: '#795548', border: '1px solid #FFE082', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>다시 쓰기</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button onClick={() => setAddMode(true)} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: 'transparent', border: '1.5px dashed var(--color-border)', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '13px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
          <Plus size={14} /> 카테고리 추가
        </button>
      )}

      {deleteTarget && (
        <CategoryDeleteModal
          category={deleteTarget.name}
          affirmationCount={affCountFor(deleteTarget.name)}
          otherCategories={categories.filter((c) => c !== deleteTarget.name)}
          onMove={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Panel>
  )
}

// ─── 사용설명서 패널 ──────────────────────────────────────────────────────────
function ManualPanel() {
  const sections = [
    {
      title: '🏠 홈 화면',
      items: [
        '오늘의 성공의 말이 표시돼요. 카드를 눌러 말하기를 시작해요.',
        '연속 기록과 오늘 완료한 성공의 말 수를 확인할 수 있어요.',
        '연속 기록 보호막: 5일 연속으로 하루 7개 이상 완료하면 보호막 1개가 생겨요.',
        '연속 기록 보호막: 이번 주(일~토) 매일 3개 이상 완료해도 보호막 1개가 생겨요.',
        '보호막이 있으면 하루 빠져도 연속 기록이 유지돼요.',
        '달력에서 날짜별 완료 기록을 볼 수 있어요.',
        '최근 녹음 플레이어로 내 목소리를 바로 들을 수 있어요.',
      ],
    },
    {
      title: '✦ 성공의 말 만들기',
      items: [
        'AI 추천 탭: 주제를 입력하면 AI가 긍정 확언을 추천해줘요.',
        '직접 입력 탭: 내가 원하는 성공의 말을 직접 쓸 수 있어요.',
        'Talk Mode 탭: 말로 입력할 수 있어요 (마이크 버튼).',
        '부정적인 표현이 감지되면 긍정적인 대안을 추천해드려요.',
        '카테고리를 지정해서 성공의 말을 분류해요.',
      ],
    },
    {
      title: '🎙 말하기',
      items: [
        '성공의 말을 소리내어 말하고 녹음해요.',
        '녹음된 내 목소리는 게임 성공 시 자동으로 재생돼요.',
        '다시 녹음 버튼으로 언제든지 녹음을 새로 할 수 있어요.',
        '녹음은 자동 저장되고 영구 보관돼요.',
      ],
    },
    {
      title: '📋 나의 성공의 말',
      items: [
        '저장된 모든 성공의 말을 카테고리별로 볼 수 있어요.',
        '재생 버튼으로 녹음을 들을 수 있고, 다운로드도 가능해요.',
        '폴더 버튼으로 카테고리를 이동할 수 있어요.',
        '삭제된 항목은 휴지통으로 이동해요.',
      ],
    },
    {
      title: '🎮 게임',
      items: [
        '단어 맞추기: 성공의 말 단어를 올바른 순서로 맞춰요.',
        '벽돌 깨기: 벽돌을 모두 깨면 성공의 말을 내 목소리로 들려줘요.',
        '게임 성공 시 녹음이 있으면 내 목소리로, 없으면 TTS로 읽어줘요.',
      ],
    },
    {
      title: '⚙️ 설정',
      items: [
        '테마: 앱 색상 테마를 바꿀 수 있어요.',
        'On/Off: 홈 화면에 표시할 요소를 선택해요.',
        '알림: 매일 정해진 시간에 알림을 받을 수 있어요.',
        '통계: 완료 현황, 많이 한 성공의 말, 카테고리별 기록을 확인해요.',
        '찾기: 성공의 말을 검색하고 날짜별 기록을 찾아요.',
        '백업: 모든 데이터를 파일로 저장해 안전하게 보관해요.',
        '지우기: 날짜별 기록, 녹음, 성공의 말을 선택적으로 삭제해요.',
        '휴지통: 삭제된 항목을 복원하거나 영구 삭제해요.',
        '카테고리: 카테고리를 추가·수정·삭제하고 순서를 변경해요.',
      ],
    },
  ]

  return (
    <Panel>
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>사용설명서</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map((sec) => (
          <div key={sec.title}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-accent-primary)', marginBottom: '8px' }}>{sec.title}</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sec.items.map((item, i) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, paddingLeft: '12px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--color-accent-primary)' }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        모님 v0.1.0 · 말하면, 이루어진다.
      </div>
    </Panel>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
const BUTTONS: { id: string; icon: LucideIcon; label: string; danger?: boolean }[] = [
  { id: 'theme',    icon: Palette,    label: '테마' },
  { id: 'toggle',   icon: Power,      label: 'On / Off' },
  { id: 'alarm',    icon: Bell,       label: '알림' },
  { id: 'stats',    icon: BarChart3,  label: '통계' },
  { id: 'search',   icon: Search,     label: '찾기' },
  { id: 'backup',   icon: HardDrive,  label: '백업' },
  { id: 'delete',   icon: Trash2,     label: '지우기', danger: true },
  { id: 'trash',    icon: RotateCcw,  label: '휴지통' },
  { id: 'category', icon: Folder,     label: '카테고리' },
  { id: 'manual',   icon: BookOpen,   label: '설명서' },
]

export default function SettingsPage() {
  const [active, setActive] = useState<string | null>(null)
  const toggle = (id: string) => setActive((prev) => prev === id ? null : id)

  return (
    <AppLayout activeTab="설정">
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '20px' }}>설정</h1>

        {/* Button grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {BUTTONS.map((btn) => {
            const isActive = active === btn.id
            const chipBg = btn.danger
              ? (isActive ? '#FFDDD9' : '#FFF0EE')
              : (isActive ? 'var(--color-accent-primary)' : 'var(--color-accent-light)')
            const iconColor = btn.danger ? '#E53935' : (isActive ? '#fff' : 'var(--color-accent-primary)')
            return (
              <button
                key={btn.id}
                onClick={() => toggle(btn.id)}
                style={{
                  padding: '16px 14px',
                  background: isActive ? 'var(--color-accent-light)' : 'var(--color-bg-card)',
                  border: isActive
                    ? (btn.danger ? '2px solid #E53935' : '2px solid var(--color-accent-primary)')
                    : '2px solid transparent',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                  <btn.icon size={20} strokeWidth={2} color={iconColor} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: btn.danger ? (isActive ? '#E53935' : 'var(--color-text-primary)') : (isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)') }}>
                  {btn.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active panel */}
        {active === 'theme' && <ThemePanel />}
        {active === 'toggle' && <TogglePanel />}
        {active === 'alarm' && <AlarmPanel />}
        {active === 'stats' && <StatsPanel />}
        {active === 'search' && <SearchPanel />}
        {active === 'backup' && <BackupPanel />}
        {active === 'delete' && <DeletePanel />}
        {active === 'trash' && <TrashPanel />}
        {active === 'category' && <CategoryPanel />}
        {active === 'manual' && <ManualPanel />}
      </div>
    </AppLayout>
  )
}
