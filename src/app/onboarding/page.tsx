'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DynamicText } from '@/components/ui/DynamicText'
import { CelebrationScreen } from '@/components/ui/CelebrationScreen'
import { CATEGORIES, CATEGORY_COLORS } from '@/lib/categories'
import {
  saveAffirmation,
  setOnboarded,
  saveTodayAffirmationIds,
  type AffirmationCategory,
} from '@/lib/storage'

const EXAMPLE_AFFIRMATIONS = [
  '나는 오늘도 충분히 잘하고 있다',
  '나는 내가 하는 일에서 가치를 만든다',
  '나는 두려워도 한 발 내딛을 수 있다',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [selectedAffirmation, setSelectedAffirmation] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AffirmationCategory | null>(null)
  const [wakeTime, setWakeTime] = useState('08:00')
  const [isLoading, setIsLoading] = useState(false)

  const handleBubbleTap = (text: string) => {
    setSelectedAffirmation(text)
    setStep(1)
  }

  const handleCustomSubmit = () => {
    const text = customInput.trim()
    if (!text) return
    setSelectedAffirmation(text)
    setStep(1)
  }

  const handleStep1Next = () => {
    setStep(2)
  }

  const handleSpeakComplete = () => {
    setStep(3)
  }

  const handleCelebrationNext = useCallback(() => {
    setStep(4)
  }, [])

  const handleFinish = async () => {
    if (!selectedCategory) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '', category: selectedCategory }),
      })
      const data = await res.json() as { affirmations: string[] }
      const ids: string[] = []
      data.affirmations.forEach((text, i) => {
        const id = `onboarding-${Date.now()}-${i}`
        saveAffirmation({
          id,
          text,
          category: selectedCategory,
          createdAt: new Date().toISOString(),
          completedDates: [],
        })
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

  // Step 0: Landing bubbles
  if (step === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center px-6"
        style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
      >
        <h1
          style={{
            fontSize: '20px',
            color: 'var(--color-text-onDark)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: '40px',
            lineHeight: 1.5,
          }}
        >
          오늘 나에게 해주고 싶은 성공의 말이 있나요?
        </h1>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {EXAMPLE_AFFIRMATIONS.map((text) => (
            <button
              key={text}
              onClick={() => handleBubbleTap(text)}
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-accent-primary)',
                borderRadius: '20px',
                padding: '16px 20px',
                color: 'var(--color-text-onDark)',
                fontSize: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                lineHeight: 1.5,
              }}
            >
              {text}
            </button>
          ))}

          {/* 직접 입력 */}
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '10px' }}>
              또는 직접 써보세요
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCustomSubmit() }}
                placeholder="나만의 성공의 말을 입력하세요"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'var(--color-bg-surface)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  color: 'var(--color-text-onDark)',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customInput.trim()}
                style={{
                  padding: '14px 18px',
                  background: customInput.trim() ? 'var(--color-accent-primary)' : 'var(--color-bg-surface)',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'var(--color-text-onDark)',
                  fontSize: '16px',
                  cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: customInput.trim() ? 1 : 0.4,
                  transition: 'all 0.2s ease',
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: DynamicText display
  if (step === 1) {
    return (
      <div
        className="flex flex-col items-center justify-center relative"
        style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
        onClick={handleStep1Next}
      >
        <div className="px-8 w-full">
          <DynamicText text={selectedAffirmation} darkBackground />
        </div>
        <div
          className="absolute bottom-12 text-center"
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '14px',
            animation: 'bounce 1.5s ease-in-out infinite',
          }}
        >
          화면을 탭하여 계속 ↑
        </div>
      </div>
    )
  }

  // Step 2: Camera speak
  if (step === 2) {
    return (
      <SimpleSpeakView
        text={selectedAffirmation}
        onComplete={handleSpeakComplete}
      />
    )
  }

  // Step 3: Celebration
  if (step === 3) {
    return (
      <CelebrationScreen
        completedCount={1}
        totalCount={3}
        onNext={handleCelebrationNext}
      />
    )
  }

  // Step 4: Welcome + category + time
  return (
    <div
      className="flex flex-col px-6 py-8"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
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

      <p style={{ fontSize: '16px', color: 'var(--color-text-onDark)', marginBottom: '16px', fontWeight: 500 }}>
        지금 가장 힘든 게 뭔가요?
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

// Simple speak view for onboarding (no camera for simplicity)
function SimpleSpeakView({ text, onComplete }: { text: string; onComplete: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-8"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
    >
      <DynamicText text={text} darkBackground />
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: '14px',
          marginTop: '32px',
          marginBottom: '40px',
          textAlign: 'center',
        }}
      >
        이 성공의 말을 소리 내어 읽어보세요
      </p>
      <button
        onClick={onComplete}
        style={{
          background: 'var(--color-accent-primary)',
          color: 'var(--color-text-onDark)',
          borderRadius: '50px',
          padding: '14px 40px',
          fontSize: '16px',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        완료했어요 ✓
      </button>
    </div>
  )
}
