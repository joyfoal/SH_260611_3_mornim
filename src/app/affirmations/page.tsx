'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Plus, Trash2, Play, Pause, Download, FolderOpen, Sparkles } from 'lucide-react'
import { getAffirmations, moveToTrash, updateAffirmation, getCategories, type Affirmation } from '@/lib/storage'
import { getCategoryColor } from '@/lib/categories'
import { getAudioRecords, moveAudioToTrash, type AudioRecord } from '@/lib/audioStorage'

export default function AffirmationsPage() {
  const router = useRouter()
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [audioMap, setAudioMap] = useState<Record<string, AudioRecord>>({})
  const [movingId, setMovingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioBlobUrlRef = useRef<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const scrollStartX = useRef(0)

  const load = async () => {
    setAffirmations(getAffirmations())
    setCategories(getCategories())
    try {
      const records = await getAudioRecords()
      // affirmationId별 가장 최신 녹음 1개씩 매핑
      const map: Record<string, AudioRecord> = {}
      for (const r of records) {
        if (!map[r.affirmationId] || r.createdAt > map[r.affirmationId].createdAt) {
          map[r.affirmationId] = r
        }
      }
      setAudioMap(map)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load()
  }, [])

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current)
      audioBlobUrlRef.current = null
    }
    setPlayingId(null)
  }

  const handlePlayPause = (affirmationId: string) => {
    const record = audioMap[affirmationId]
    if (!record) return

    if (playingId === affirmationId) {
      stopCurrentAudio()
      return
    }

    stopCurrentAudio()
    const url = URL.createObjectURL(record.blob)
    audioBlobUrlRef.current = url
    const audio = new Audio(url)
    audioRef.current = audio
    setPlayingId(affirmationId)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      audioBlobUrlRef.current = null
      setPlayingId(null)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      audioBlobUrlRef.current = null
      setPlayingId(null)
    }
    audio.play().catch(() => setPlayingId(null))
  }

  const handleDownloadAudio = (affirmationId: string, affirmationText: string) => {
    const record = audioMap[affirmationId]
    if (!record) return
    const url = URL.createObjectURL(record.blob)
    const a = document.createElement('a')
    a.href = url
    const ext = record.blob.type.includes('mp4') ? 'mp4' : record.blob.type.includes('ogg') ? 'ogg' : 'webm'
    a.download = `${affirmationText.slice(0, 20).replace(/\s+/g, '_')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAudio = async (affirmationId: string) => {
    const record = audioMap[affirmationId]
    if (!record) return
    if (!confirm('이 녹음을 휴지통으로 이동할까요?')) return
    if (playingId === affirmationId) stopCurrentAudio()
    try {
      await moveAudioToTrash(record.id)
      setAudioMap((prev) => {
        const next = { ...prev }
        delete next[affirmationId]
        return next
      })
    } catch { /* ignore */ }
  }

  const handleDelete = (id: string) => {
    if (confirm('이 성공의 말을 휴지통으로 이동할까요?')) {
      if (playingId === id) stopCurrentAudio()
      moveToTrash(id)
      load()
    }
  }

  const handleMoveCategory = (affirmation: Affirmation, newCategory: string) => {
    updateAffirmation({ ...affirmation, category: newCategory })
    setMovingId(null)
    load()
  }

  const filtered = filterCategory
    ? affirmations.filter((a) => a.category === filterCategory)
    : affirmations

  const grouped = categories.reduce<Record<string, Affirmation[]>>((acc, cat) => {
    const items = filtered.filter((a) => a.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <AppLayout activeTab="성공의 말">
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-bg-primary)', padding: '20px 16px 0' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            나의 성공의 말
          </h1>
          <button
            onClick={() => router.push('/create')}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--color-accent-primary)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={18} color="white" />
          </button>
        </div>

        {/* Filter chips */}
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto pb-2 mb-4"
          style={{ scrollbarWidth: 'none', cursor: isDragging.current ? 'grabbing' : 'grab', userSelect: 'none' }}
          onMouseDown={(e) => {
            isDragging.current = true
            dragStartX.current = e.pageX
            scrollStartX.current = tabsRef.current?.scrollLeft ?? 0
          }}
          onMouseMove={(e) => {
            if (!isDragging.current || !tabsRef.current) return
            tabsRef.current.scrollLeft = scrollStartX.current - (e.pageX - dragStartX.current)
          }}
          onMouseUp={() => { isDragging.current = false }}
          onMouseLeave={() => { isDragging.current = false }}
        >
          <button
            onClick={() => setFilterCategory(null)}
            style={{
              padding: '6px 14px', borderRadius: '20px', flexShrink: 0,
              border: !filterCategory ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
              background: !filterCategory ? 'var(--color-accent-light)' : 'transparent',
              color: !filterCategory ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
              fontSize: '12px', cursor: 'pointer',
            }}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              style={{
                padding: '6px 14px', borderRadius: '20px', flexShrink: 0,
                border: filterCategory === cat ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                background: filterCategory === cat ? 'var(--color-accent-light)' : 'transparent',
                color: filterCategory === cat ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                fontSize: '12px', cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 16px 16px' }}>
        {affirmations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            <Sparkles size={44} color="var(--color-accent-primary)" style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', marginBottom: '20px' }}>
              아직 성공의 말이 없어요.<br />첫 성공의 말을 만들어보세요!
            </p>
            <button
              onClick={() => router.push('/create')}
              style={{
                padding: '12px 28px', background: 'var(--color-accent-primary)',
                color: 'white', border: 'none', borderRadius: '14px',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              성공의 말 만들기
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const colors = getCategoryColor(cat, categories)
            return (
              <div key={cat} style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: colors.dark,
                  marginBottom: '8px', padding: '4px 12px', background: colors.light,
                  borderRadius: '20px', display: 'inline-block',
                }}>
                  {cat}
                </div>
                {items.map((affirmation) => {
                  const record = audioMap[affirmation.id]
                  const isPlaying = playingId === affirmation.id
                  return (
                    <div
                      key={affirmation.id}
                      style={{
                        padding: '14px 16px', background: 'var(--color-bg-card)',
                        borderRadius: '14px', marginBottom: '8px',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {/* 텍스트 + 완료 횟수 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5, marginBottom: '4px' }}>
                            {affirmation.text}
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            {affirmation.completedDates.length}일 완료
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => setMovingId(movingId === affirmation.id ? null : affirmation.id)}
                            style={{
                              padding: '6px', background: movingId === affirmation.id ? 'var(--color-accent-light)' : 'transparent',
                              border: 'none', cursor: 'pointer',
                              color: movingId === affirmation.id ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                              borderRadius: '8px', transition: 'all 0.15s',
                            }}
                            title="카테고리 이동"
                          >
                            <FolderOpen size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(affirmation.id)}
                            style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', borderRadius: '8px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* 카테고리 이동 선택기 */}
                      {movingId === affirmation.id && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>카테고리 선택</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {categories.filter((c) => c !== affirmation.category).map((cat) => {
                              const c = getCategoryColor(cat, categories)
                              return (
                                <button
                                  key={cat}
                                  onClick={() => handleMoveCategory(affirmation, cat)}
                                  style={{
                                    padding: '5px 12px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer',
                                    border: `1px solid ${c.dark}`, background: c.light, color: c.dark, fontWeight: 500,
                                  }}
                                >
                                  {cat}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* 녹음 영역 */}
                      {record && (
                        <div style={{
                          marginTop: 12, paddingTop: 10,
                          borderTop: '1px solid var(--color-border)',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          {/* 파형 막대 */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18, flexShrink: 0 }}>
                            {[55, 80, 60, 100, 70, 85, 50].map((pct, k) => (
                              <span key={k} style={{
                                display: 'block', width: 3, borderRadius: 2,
                                background: 'var(--color-accent-primary)',
                                height: isPlaying ? undefined : `${pct}%`,
                                minHeight: isPlaying ? 3 : undefined,
                                animation: isPlaying ? `waveBar 0.45s ease-in-out ${k * 0.07}s infinite` : 'none',
                                opacity: isPlaying ? 1 : 0.5,
                              }} />
                            ))}
                          </div>

                          {/* 재생 버튼 */}
                          <button
                            onClick={() => handlePlayPause(affirmation.id)}
                            style={{
                              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                              background: isPlaying ? 'var(--color-accent-primary)' : 'var(--color-accent-light)',
                              color: isPlaying ? 'white' : 'var(--color-accent-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                          </button>

                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flex: 1 }}>
                            {new Date(record.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 녹음
                          </span>

                          {/* 다운로드 버튼 */}
                          <button
                            onClick={() => handleDownloadAudio(affirmation.id, affirmation.text)}
                            style={{
                              padding: '4px 10px', border: '1px solid var(--color-border)',
                              borderRadius: 8, background: 'transparent', cursor: 'pointer',
                              fontSize: '11px', color: 'var(--color-text-muted)',
                              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                            }}
                          >
                            <Download size={11} />
                            저장
                          </button>

                          {/* 녹음 삭제 버튼 */}
                          <button
                            onClick={() => handleDeleteAudio(affirmation.id)}
                            style={{
                              padding: '4px 10px', border: '1px solid var(--color-border)',
                              borderRadius: 8, background: 'transparent', cursor: 'pointer',
                              fontSize: '11px', color: 'var(--color-text-muted)',
                              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                            }}
                          >
                            <Trash2 size={11} />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </AppLayout>
  )
}
