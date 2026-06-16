'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES, CATEGORY_COLORS } from '@/lib/categories'
import {
  saveAffirmation,
  setOnboarded,
  saveTodayAffirmationIds,
  type AffirmationCategory,
} from '@/lib/storage'

type InputItem = {
  id: number
  value: string
  suggestion: string | null
  isChecking: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<AffirmationCategory | null>(null)
  const [wakeTime, setWakeTime] = useState('08:00')
  const [isLoading, setIsLoading] = useState(false)
  const [inputs, setInputs] = useState<InputItem[]>([
    { id: 0, value: '', suggestion: null, isChecking: false },
  ])

  const addInput = () => {
    if (inputs.length >= 4) return
    setInputs((prev) => [...prev, { id: Date.now(), value: '', suggestion: null, isChecking: false }])
  }

  const updateInput = (id: number, value: string) => {
    setInputs((prev) => prev.map((inp) => (inp.id === id ? { ...inp, value, suggestion: null } : inp)))
  }

  const checkNegative = async (id: number, text: string) => {
    if (!text.trim()) return
    setInputs((prev) => prev.map((inp) => (inp.id === id ? { ...inp, isChecking: true } : inp)))
    try {
      const res = await fetch('/api/detect-negative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json() as { isNegative: boolean; alternative: string | null }
      setInputs((prev) =>
        prev.map((inp) =>
          inp.id === id
            ? { ...inp, isChecking: false, suggestion: data.isNegative && data.alternative ? data.alternative : null }
            : inp
        )
      )
    } catch {
      setInputs((prev) => prev.map((inp) => (inp.id === id ? { ...inp, isChecking: false } : inp)))
    }
  }

  const acceptSuggestion = (id: number, suggestion: string) => {
    setInputs((prev) =>
      prev.map((inp) => (inp.id === id ? { ...inp, value: suggestion, suggestion: null } : inp))
    )
  }

  const removeInput = (id: number) => {
    setInputs((prev) => prev.filter((inp) => inp.id !== id))
  }

  const handleFinish = async () => {
    if (!selectedCategory) return
    setIsLoading(true)
    try {
      const customTexts = inputs.map((inp) => inp.value.trim()).filter(Boolean)

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '', category: selectedCategory }),
      })
      const data = await res.json() as { affirmations: string[] }
      const ids: string[] = []
      const now = Date.now()

      customTexts.forEach((text, i) => {
        const id = `custom-${now}-${i}`
        saveAffirmation({ id, text, category: selectedCategory, createdAt: new Date().toISOString(), completedDates: [] })
        ids.push(id)
      })

      data.affirmations.forEach((text, i) => {
        const id = `onboarding-${now}-${i}`
        saveAffirmation({ id, text, category: selectedCategory, createdAt: new Date().toISOString(), completedDates: [] })
        ids.push(id)
      })

      saveTodayAffirmationIds(ids.slice(0, 3))
      setOnboarded()
      router.push('/home')
    } catch {
      setOnboarded()
      router.push('/home')
    }
  }

  return (
    <div
      className="flex flex-col px-6 py-8"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', overflowY: 'auto' }}
    >
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 500,
          color: 'var(--color-text-onDark)',
          marginBottom: '8px',
        }}
      >
        모님에 오신 걸 환영해요 🎉
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', marginBottom: '32px' }}>
        당신만의 성공의 말 라이브러리를 만들어 드릴게요
      </p>

      {/* Category selection */}
      <p style={{ fontSize: '16px', color: 'var(--color-text-onDark)', marginBottom: '16px', fontWeight: 500 }}>
        성공하고 싶은 분야를 알려주세요.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat]
          const isSelected = selectedCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: isSelected ? colors.dark : colors.light,
                border: isSelected ? `2px solid ${colors.dark}` : '2px solid transparent',
                borderRadius: '12px',
                padding: '14px 12px',
                color: isSelected ? colors.light : colors.dark,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Custom affirmation inputs */}
      <p style={{ fontSize: '16px', color: 'var(--color-text-onDark)', marginBottom: '12px', fontWeight: 500 }}>
        나만의 성공의 말을 입력하세요
      </p>
      <div className="flex flex-col gap-3 mb-3">
        {inputs.map((inp, index) => (
          <div key={inp.id}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inp.value}
                onChange={(e) => updateInput(inp.id, e.target.value)}
                onBlur={(e) => checkNegative(inp.id, e.target.value)}
                placeholder={`성공의 말 ${index + 1}`}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'var(--color-bg-surface)',
                  border: inp.suggestion
                    ? '1px solid #F59E0B'
                    : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  color: 'var(--color-text-onDark)',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />
              {inputs.length > 1 && (
                <button
                  onClick={() => removeInput(inp.id)}
                  style={{
                    padding: '0 16px',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '16px',
                    color: 'var(--color-text-muted)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {inp.isChecking && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '6px', paddingLeft: '4px' }}>
                확인 중...
              </p>
            )}

            {inp.suggestion && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px',
                }}
              >
                <p style={{ fontSize: '12px', color: '#F59E0B', marginBottom: '6px' }}>
                  💡 긍정적인 표현으로 바꿔보는 건 어떨까요?
                </p>
                <p style={{ fontSize: '14px', color: 'var(--color-text-onDark)', marginBottom: '10px', lineHeight: 1.5 }}>
                  {inp.suggestion}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptSuggestion(inp.id, inp.suggestion!)}
                    style={{
                      padding: '7px 14px',
                      background: '#F59E0B',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    이 표현 사용하기
                  </button>
                  <button
                    onClick={() => setInputs((prev) => prev.map((x) => x.id === inp.id ? { ...x, suggestion: null } : x))}
                    style={{
                      padding: '7px 14px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'var(--color-text-muted)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    그대로 쓸게요
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {inputs.length < 4 && (
        <button
          onClick={addInput}
          style={{
            padding: '12px',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '16px',
            color: 'var(--color-text-muted)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '28px',
            width: '100%',
          }}
        >
          + 추가
        </button>
      )}

      {/* Time picker */}
      <p style={{ fontSize: '16px', color: 'var(--color-text-onDark)', marginBottom: '12px', fontWeight: 500 }}>
        매일 몇 시에 모님을 열고 싶으세요?
      </p>
      <input
        type="time"
        value={wakeTime}
        onChange={(e) => setWakeTime(e.target.value)}
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-accent-primary)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: 'var(--color-text-onDark)',
          fontSize: '16px',
          marginBottom: '32px',
          width: '100%',
        }}
      />

      <button
        onClick={handleFinish}
        disabled={!selectedCategory || isLoading}
        style={{
          background: selectedCategory ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
          color: 'var(--color-text-onDark)',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 600,
          border: 'none',
          cursor: selectedCategory ? 'pointer' : 'not-allowed',
          opacity: selectedCategory ? 1 : 0.5,
        }}
      >
        {isLoading ? '성공의 말 만드는 중...' : '시작하기'}
      </button>
    </div>
  )
}
