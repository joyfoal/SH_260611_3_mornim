'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAffirmations, updateAffirmation, getDayRecord, saveDayRecord, todayStr } from '@/lib/storage'
import { getAudioRecordsByAffirmationId } from '@/lib/audioStorage'

async function playAffirmationAudio(affirmationId: string, affirmationText: string) {
  try {
    const records = await getAudioRecordsByAffirmationId(affirmationId)
    if (records.length > 0) {
      const latest = records.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
      const url = URL.createObjectURL(latest.blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        speakTTS(affirmationText)
      }
      audio.play().catch(() => speakTTS(affirmationText))
      return
    }
  } catch { /* ignore */ }
  speakTTS(affirmationText)
}

function speakTTS(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    window.speechSynthesis.speak(utter)
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface WordCard {
  id: string
  word: string
  originalIndex: number
}

export default function WordSortPage() {
  const router = useRouter()
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won'>('idle')
  const [cards, setCards] = useState<WordCard[]>([])
  const [correctOrder, setCorrectOrder] = useState<string[]>([])
  const [affirmationText, setAffirmationText] = useState('')
  const [affirmationId, setAffirmationId] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState(false)
  const dragIndexRef = useRef<number | null>(null)

  const initGame = useCallback(() => {
    const affirmations = getAffirmations()
    if (affirmations.length === 0) {
      router.push('/create')
      return
    }
    const aff = affirmations[Math.floor(Math.random() * affirmations.length)]
    const words = aff.text.split(' ')
    setCorrectOrder(words)
    setAffirmationText(aff.text)
    setAffirmationId(aff.id)

    const shuffled = shuffle(words.map((word, i) => ({ id: `word-${i}`, word, originalIndex: i })))
    setCards(shuffled)
    setGameState('playing')
    setIsCorrect(false)
  }, [router])

  const checkOrder = (newCards: WordCard[], correct: string[]) => {
    const currentOrder = newCards.map((c) => c.word)
    return currentOrder.join(' ') === correct.join(' ')
  }

  const handleDragStart = (index: number) => {
    setDragIndex(index)
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const current = dragIndexRef.current
    if (current === null || current === index) return
    setCards((prev) => {
      const newCards = [...prev]
      const [removed] = newCards.splice(current, 1)
      newCards.splice(index, 0, removed)
      dragIndexRef.current = index
      setDragIndex(index)
      if (checkOrder(newCards, correctOrder)) {
        setIsCorrect(true)
        setTimeout(() => {
          setGameState('won')
          playAffirmationAudio(affirmationId, affirmationText)
          const today = todayStr()
          const allAffirmations = getAffirmations()
          const aff = allAffirmations.find((a) => a.id === affirmationId)
          if (aff && !aff.completedDates.includes(today)) {
            updateAffirmation({ ...aff, completedDates: [...aff.completedDates, today] })
            const existing = getDayRecord(today)
            saveDayRecord({
              date: today,
              completedCount: (existing?.completedCount ?? 0) + 1,
              dominantCategory: aff.category,
            })
          }
        }, 600)
      }
      return newCards
    })
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    dragIndexRef.current = null
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', padding: '20px 16px' }}
    >
      <div className="flex items-center justify-between w-full mb-6">
        <button
          onClick={() => router.back()}
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          ← 돌아가기
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-onDark)' }}>
          단어 정렬
        </h1>
        <div style={{ width: '60px' }} />
      </div>

      {gameState === 'idle' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center' }}>
            뒤섞인 성공의 말 단어를 올바른 순서로<br />드래그해서 맞춰보세요!
          </p>
          <button
            onClick={initGame}
            style={{
              padding: '14px 40px',
              background: 'var(--color-accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            시작하기
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="w-full">
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
            드래그해서 올바른 순서로 맞춰보세요
          </p>
          <div className="flex flex-col gap-3">
            {cards.map((card, index) => (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: '16px 20px',
                  background: isCorrect
                    ? 'var(--color-success)'
                    : dragIndex === index
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-bg-surface)',
                  borderRadius: '14px',
                  color: 'var(--color-text-onDark)',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'grab',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                  border: isCorrect
                    ? '2px solid #4CAF50'
                    : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '20px', opacity: 0.4 }}>⠿</span>
                <span>{card.word}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <div style={{ fontSize: '48px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-onDark)' }}>
            정답!
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-accent-light)', lineHeight: 1.6, maxWidth: '280px' }}>
            {affirmationText}
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={initGame}
              style={{
                padding: '12px 24px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              다시 하기
            </button>
            <button
              onClick={() => router.push('/home')}
              style={{
                padding: '12px 24px',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-onDark)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              홈으로
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
