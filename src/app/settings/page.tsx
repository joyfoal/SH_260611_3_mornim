'use client'

import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/ui/AppLayout'
import { useTheme } from '@/lib/themeContext'
import { getCategoryColor } from '@/lib/categories'
import {
  isTomorrowEnabled,
  setTomorrowEnabled,
  getAffirmations,
  updateAffirmation,
  clearAllData,
  getCategories,
  saveCategories,
  getAlarmSettings,
  saveAlarmSettings,
  clearAlarmSettings,
  type AlarmSettings,
} from '@/lib/storage'
import { getAudioRecords, setAudioKeepForever, clearAllAudioRecords, type AudioRecord } from '@/lib/audioStorage'
import { clearFaceStorage } from '@/lib/faceStorage'
import { clearSuccessImages } from '@/lib/successImageStorage'
import { Pencil, Trash2, Check, X, Plus, Bell, Download } from 'lucide-react'
import { WeeklyReportModal } from '@/components/ui/WeeklyReportModal'

// ─── Category Delete Modal ────────────────────────────────────────
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
  const cats = getCategories()
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}
      onClick={onCancel}
    >
      <div
        style={{ width: '100%', maxWidth: '430px', margin: '0 auto', background: 'var(--color-bg-primary)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: '36px', height: '4px', background: 'var(--color-border)', borderRadius: '2px', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          &ldquo;{category}&rdquo; 삭제
        </h2>
        {affirmationCount > 0 ? (
          <>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              이 카테고리에 성공의 말 {affirmationCount}개가 있어요. 어느 카테고리로 옮길까요?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {otherCategories.map((cat) => {
                const colors = getCategoryColor(cat, cats)
                return (
                  <button
                    key={cat}
                    onClick={() => onMove(cat)}
                    style={{ padding: '12px 16px', background: colors.light, border: `1px solid ${colors.dark}20`, borderRadius: '12px', color: colors.dark, fontSize: '14px', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {cat}으로 옮기기
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => onMove(null)}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #E53935', borderRadius: '12px', color: '#E53935', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}
            >
              옮기지 않고 삭제 (첫 번째 카테고리로 자동 이동)
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              카테고리를 삭제할까요?
            </p>
            <button
              onClick={() => onMove(null)}
              style={{ width: '100%', padding: '13px', background: '#E53935', border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '8px' }}
            >
              삭제하기
            </button>
          </>
        )}
        <button onClick={onCancel} style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '14px', cursor: 'pointer' }}>
          취소
        </button>
      </div>
    </div>
  )
}

// ─── Category Manager ─────────────────────────────────────────────
function CategoryManager() {
  const [categories, setCategories] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; idx: number } | null>(null)

  useEffect(() => {
    setCategories(getCategories())
  }, [])

  const reload = () => setCategories(getCategories())

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(categories[idx])
  }

  const commitEdit = () => {
    if (editingIdx === null) return
    const name = editValue.trim()
    if (!name || name === categories[editingIdx]) { setEditingIdx(null); return }
    if (categories.includes(name)) { alert('이미 있는 카테고리예요.'); return }

    // Rename category in all affirmations
    const oldName = categories[editingIdx]
    const affirmations = getAffirmations()
    affirmations.forEach((a) => {
      if (a.category === oldName) updateAffirmation({ ...a, category: name })
    })

    const updated = [...categories]
    updated[editingIdx] = name
    saveCategories(updated)
    setCategories(updated)
    setEditingIdx(null)
  }

  const handleAdd = () => {
    const name = newCatName.trim()
    if (!name) return
    if (categories.includes(name)) { alert('이미 있는 카테고리예요.'); return }
    const updated = [...categories, name]
    saveCategories(updated)
    setCategories(updated)
    setNewCatName('')
    setAddMode(false)
  }

  const handleDeleteConfirm = (targetCategory: string | null) => {
    if (!deleteTarget) return
    const { name } = deleteTarget
    const remaining = categories.filter((c) => c !== name)
    const fallback = targetCategory ?? remaining[0] ?? '기타'

    const affirmations = getAffirmations()
    affirmations.forEach((a) => {
      if (a.category === name) updateAffirmation({ ...a, category: fallback })
    })

    saveCategories(remaining)
    setCategories(remaining)
    setDeleteTarget(null)
    reload()
  }

  const affCountFor = (cat: string) =>
    getAffirmations().filter((a) => a.category === cat).length

  return (
    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: open ? '12px' : 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          카테고리 관리
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ padding: '6px 14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
        >
          {open ? '닫기' : '관리'}
        </button>
      </div>

      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {categories.map((cat, idx) => {
          const colors = getCategoryColor(cat, categories)
          const isEditing = editingIdx === idx
          return (
            <div
              key={cat}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: colors.light, borderRadius: '10px' }}
            >
              {isEditing ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitEdit()
                      if (e.key === 'Escape') setEditingIdx(null)
                    }}
                    style={{ flex: 1, background: 'white', border: `1px solid ${colors.dark}`, borderRadius: '6px', padding: '6px 10px', fontSize: '13px', color: colors.dark, outline: 'none' }}
                  />
                  <button onClick={commitEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.dark, padding: '2px' }}>
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingIdx(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: colors.dark }}>{cat}</span>
                  <span style={{ fontSize: '11px', color: `${colors.dark}88` }}>{affCountFor(cat)}개</span>
                  <button onClick={() => startEdit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.dark, padding: '2px' }}>
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ name: cat, idx })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E53935', padding: '2px' }}
                    disabled={categories.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>}

      {open && (addMode ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <input
            autoFocus
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd()
              if (e.key === 'Escape') { setAddMode(false); setNewCatName('') }
            }}
            placeholder="새 카테고리 이름"
            style={{ flex: 1, padding: '10px 12px', background: 'white', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none' }}
          />
          <button onClick={handleAdd} style={{ padding: '10px 16px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            추가
          </button>
          <button onClick={() => { setAddMode(false); setNewCatName('') }} style={{ padding: '10px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddMode(true)}
          style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: 'transparent', border: '1.5px dashed var(--color-border)', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '13px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
        >
          <Plus size={14} /> 카테고리 추가
        </button>
      ))}

      {deleteTarget && (
        <CategoryDeleteModal
          category={deleteTarget.name}
          affirmationCount={affCountFor(deleteTarget.name)}
          otherCategories={categories.filter((c) => c !== deleteTarget.name)}
          onMove={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Alarm Manager ────────────────────────────────────────────────
function AlarmManager() {
  const [open, setOpen] = useState(false)
  const [recordings, setRecordings] = useState<AudioRecord[]>([])
  const [alarm, setAlarm] = useState<AlarmSettings | null>(null)
  const [selectedAudioId, setSelectedAudioId] = useState<string>('')
  const [hour, setHour] = useState(7)
  const [minute, setMinute] = useState(0)
  const [saving, setSaving] = useState(false)
  const urlRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const current = getAlarmSettings()
    setAlarm(current)
    if (current) {
      setSelectedAudioId(current.audioId)
      setHour(current.hour)
      setMinute(current.minute)
    }
    getAudioRecords().then(setRecordings).catch(() => {})
  }, [open])

  const handleSave = async () => {
    if (!selectedAudioId) return
    setSaving(true)
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission()
    }
    saveAlarmSettings({ audioId: selectedAudioId, hour, minute })
    setAlarm({ audioId: selectedAudioId, hour, minute })
    import('@/lib/alarmScheduler').then(({ scheduleAlarm }) => scheduleAlarm())
    setSaving(false)
    setOpen(false)
  }

  const handleClear = () => {
    clearAlarmSettings()
    setAlarm(null)
    import('@/lib/alarmScheduler').then(({ cancelAlarm }) => cancelAlarm())
    setOpen(false)
  }

  const handleDownload = (rec: AudioRecord) => {
    const url = urlRef.current[rec.id] ?? URL.createObjectURL(rec.blob)
    urlRef.current[rec.id] = url
    const a = document.createElement('a')
    a.href = url
    a.download = `mornim-${rec.affirmationId.slice(0, 8)}.webm`
    a.click()
  }

  const handleKeepForever = async (rec: AudioRecord) => {
    await setAudioKeepForever(rec.id, !rec.keepForever)
    setRecordings((prev) => prev.map((r) => r.id === rec.id ? { ...r, keepForever: !r.keepForever } : r))
  }

  const fmtHour = (h: number) => {
    const ampm = h < 12 ? '오전' : '오후'
    const hh = ((h + 11) % 12) + 1
    return `${ampm} ${hh}시`
  }

  return (
    <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>알람 설정</p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {alarm ? `${fmtHour(alarm.hour)} ${String(alarm.minute).padStart(2, '0')}분 · 녹음 재생` : '앱 열 때 녹음을 들려드려요'}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ padding: '8px 16px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Bell size={14} />{open ? '닫기' : '설정'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Time picker */}
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>알람 시간</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                style={{ flex: 1, padding: '10px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none' }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{fmtHour(i)}</option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                style={{ width: '80px', padding: '10px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none' }}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recording picker */}
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>재생할 녹음 선택</p>
            {recordings.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                녹음된 내용이 없어요. 말하기 화면에서 성공의 말을 말해보세요.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {recordings.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '10px 12px',
                      background: selectedAudioId === rec.id ? 'var(--color-accent-light)' : 'var(--color-bg-surface)',
                      border: selectedAudioId === rec.id ? '1.5px solid var(--color-accent-primary)' : '1px solid transparent',
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedAudioId(rec.id)}
                  >
                    <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                      {selectedAudioId === rec.id && '✓ '}{rec.affirmationText}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {new Date(rec.createdAt).toLocaleDateString('ko-KR')}
                        {rec.keepForever ? ' · 영구 보관' : ' · 7일 후 삭제'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleKeepForever(rec) }}
                        style={{ fontSize: '10px', padding: '2px 6px', background: rec.keepForever ? 'var(--color-accent-primary)' : 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: rec.keepForever ? 'white' : 'var(--color-text-muted)' }}
                      >
                        {rec.keepForever ? '영구 보관 중' : '계속 보관'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(rec) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}
                        title="다운로드"
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save / Clear */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={!selectedAudioId || saving}
              style={{ flex: 1, padding: '12px', background: selectedAudioId ? 'var(--color-accent-primary)' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: selectedAudioId ? 'pointer' : 'not-allowed' }}
            >
              {saving ? '저장 중...' : '알람 저장'}
            </button>
            {alarm && (
              <button
                onClick={handleClear}
                style={{ padding: '12px 16px', background: 'transparent', border: '1px solid #E53935', borderRadius: '12px', color: '#E53935', fontSize: '14px', cursor: 'pointer' }}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────
export default function SettingsPage() {
  const { themeName, setTheme } = useTheme()
  const [tomorrowOn, setTomorrowOn] = useState(true)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    setTomorrowOn(isTomorrowEnabled())
  }, [])

  const handleTomorrowToggle = () => {
    const newVal = !tomorrowOn
    setTomorrowOn(newVal)
    setTomorrowEnabled(newVal)
  }

  const handleReset = async () => {
    if (confirm('모든 데이터를 초기화할까요? 이 작업은 되돌릴 수 없습니다.')) {
      clearAllData()
      await Promise.all([
        clearAllAudioRecords(),
        clearFaceStorage(),
        clearSuccessImages(),
      ])
      window.location.href = '/'
    }
  }

  const THEMES = [
    { name: 'warm' as const, label: '따뜻한 황금', color: '#BA7517', bg: '#FFFAF5' },
    { name: 'dark' as const, label: '딥 퍼플', color: '#534AB7', bg: '#1a1a2e' },
    { name: 'green' as const, label: '내추럴 그린', color: '#639922', bg: '#F4F9F0' },
  ]

  return (
    <AppLayout activeTab="설정" decorativeIcons={[6, 3]}>
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '24px' }}>
          설정
        </h1>

        {/* Tomorrow toggle */}
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>내일의 나에게</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>성공의 말 완료 후 내일의 나에게 메시지를 남겨요</p>
            </div>
            <button
              onClick={handleTomorrowToggle}
              style={{ width: '48px', height: '28px', borderRadius: '14px', background: tomorrowOn ? 'var(--color-accent-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease' }}
            >
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: tomorrowOn ? '23px' : '3px', transition: 'left 0.2s ease' }} />
            </button>
          </div>
        </div>

        {/* Alarm settings */}
        <AlarmManager />

        {/* Weekly Report */}
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>주간 리포트</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>이번 주 활동을 확인해요</p>
            </div>
            <button onClick={() => setShowReport(true)} style={{ padding: '8px 16px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
              보기
            </button>
          </div>
        </div>

        {/* Category Manager */}
        <CategoryManager />

        {/* Theme selection */}
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '12px' }}>테마 선택</p>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.name}
                onClick={() => setTheme(t.name)}
                style={{ flex: 1, padding: '12px 8px', borderRadius: '12px', border: themeName === t.name ? `2px solid ${t.color}` : '2px solid transparent', background: t.bg, cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.color, margin: '0 auto 6px' }} />
                <p style={{ fontSize: '10px', color: t.color, fontWeight: 500 }}>{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Data reset */}
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', padding: '16px' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>데이터 초기화</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>모든 성공의 말과 기록을 삭제해요</p>
            </div>
            <button onClick={handleReset} style={{ padding: '8px 16px', background: 'transparent', color: '#E53935', border: '1px solid #E53935', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
              초기화
            </button>
          </div>
        </div>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          모님 v0.1.0 · 말하면, 이루어진다.
        </div>
      </div>

      {showReport && <WeeklyReportModal onClose={() => setShowReport(false)} />}
    </AppLayout>
  )
}
