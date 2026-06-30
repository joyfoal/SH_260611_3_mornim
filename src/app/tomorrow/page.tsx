'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAffirmations, saveTomorrowNote, saveDayNote, todayStr, setNaegeSeenDate, type Affirmation } from '@/lib/storage'
import { ChevronLeft, Mic } from 'lucide-react'

function getTimePlaceholder(): string {
  const hour = new Date().getHours()
  return hour < 18 ? '오늘도 잘 할 수 있어!' : '오늘도 수고했어!'
}

export default function TomorrowPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [placeholder, setPlaceholder] = useState('오늘도 잘 할 수 있어!')
  const [negativeSuggestion, setNegativeSuggestion] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    setAffirmations(getAffirmations())
    setPlaceholder(getTimePlaceholder())
  }, [])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 7) return prev
      return [...prev, id]
    })
  }

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRec) return
    const rec = new SpeechRec()
    rec.lang = 'ko-KR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: SpeechRecognitionEvent) => {
      if (!e.results?.[0]?.[0]) return
      const text: string = e.results[0][0].transcript
      setMessage((prev) => prev ? prev + ' ' + text : text)
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.start()
    recognitionRef.current = rec
    setIsListening(true)
  }

  const handleSave = async () => {
    const trimmed = message.trim()
    if (trimmed) {
      setSaving(true)
      try {
        const res = await fetch('/api/detect-negative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        })
        const data = await res.json() as { isNegative: boolean; alternative: string | null }
        if (data.isNegative && data.alternative) {
          setNegativeSuggestion(data.alternative)
          setSaving(false)
          return
        }
      } catch {
        // proceed without check
      }
      setSaving(false)
    }
    setSaving(true)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    let finalIds = selectedIds
    if (finalIds.length === 0) {
      const shuffled = [...affirmations].sort(() => Math.random() - 0.5)
      finalIds = shuffled.slice(0, 3).map((a) => a.id)
    }

    saveTomorrowNote({
      date: tomorrowStr,
      message: message.trim(),
      selectedAffirmationIds: finalIds,
    })

    // Mark naege as seen today (only on save, not skip)
    setNaegeSeenDate(todayStr())

    // Save today's note only if user wrote something (placeholder is shown dynamically on home)
    if (message.trim()) {
      saveDayNote(todayStr(), message.trim())
    }

    router.push('/home')
  }

  const handleSkip = () => {
    router.push('/home')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg-dark)',
        padding: '0 16px 32px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px 0 16px' }}>
        <button
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-onDark)' }}>나에게</h1>
      </div>

      {/* Today's note section */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '18px', color: 'var(--color-text-onDark)', marginBottom: '10px', fontWeight: 700 }}>
          오늘의 나에게
        </p>
        <div style={{ position: 'relative' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={3}
            style={{
              width: '100%',
              padding: '14px 44px 14px 14px',
              background: 'var(--color-bg-surface)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              fontSize: '15px',
              color: 'var(--color-text-onDark)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
          <button
            onClick={toggleVoiceInput}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: isListening ? '#E53935' : 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            title={isListening ? '듣는 중 — 탭하여 중지' : '음성으로 입력'}
          >
            <Mic size={16} color={isListening ? 'white' : 'rgba(255,255,255,0.6)'} />
          </button>
        </div>
      </div>

      {/* Tomorrow's affirmation picker */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-onDark)', marginBottom: '6px' }}>
          내일의 나에게
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '6px', lineHeight: 1.6 }}>
          내일 말할 성공의 말을 골라주세요<br />최대 7개 선택가능, 고르지 않으면 AI가 3개를 골라줘요
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-accent-light)', marginBottom: '12px' }}>
          {selectedIds.length}/7 선택됨
        </p>
        <div className="flex flex-col gap-2">
          {affirmations.map((aff) => {
            const isSelected = selectedIds.includes(aff.id)
            return (
              <button
                key={aff.id}
                onClick={() => toggleSelect(aff.id)}
                style={{
                  padding: '12px 16px',
                  background: isSelected ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                  border: isSelected
                    ? '1px solid var(--color-accent-secondary)'
                    : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: isSelected ? 'white' : 'var(--color-text-onDark)',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  lineHeight: 1.5,
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <span style={{ marginRight: '8px' }}>✓</span>}
                {aff.text}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {negativeSuggestion && (
          <div style={{ padding: '14px', background: '#FFF3CD', borderRadius: '12px', border: '1px solid #FFE082' }}>
            <p style={{ fontSize: '13px', color: '#795548', marginBottom: '8px' }}>
              부정적인 표현이 감지되었어요. 이렇게 바꿔볼까요?
            </p>
            <p style={{ fontSize: '15px', color: '#4E342E', fontWeight: 500, marginBottom: '12px' }}>
              {negativeSuggestion}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setMessage(negativeSuggestion); setNegativeSuggestion(null) }}
                style={{ flex: 1, padding: '10px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
              >
                바꿔서 남기기
              </button>
              <button
                onClick={() => { setNegativeSuggestion(null); setMessage('') }}
                style={{ flex: 1, padding: '10px', background: 'transparent', color: '#795548', border: '1px solid #FFE082', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
              >
                다시 쓰기
              </button>
            </div>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px',
            background: 'var(--color-accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {saving ? '저장 중...' : '남기기'}
        </button>
        <button
          onClick={handleSkip}
          style={{
            width: '100%',
            padding: '14px',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          건너뛰기
        </button>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(136,135,128,0.6)', marginTop: '4px' }}>
          설정에서 이 페이지를 항상 건너뛸 수 있어요
        </p>
      </div>
    </div>
  )
}
