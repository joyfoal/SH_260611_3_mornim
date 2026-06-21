'use client'

import { useEffect, useState } from 'react'

// ── 어절 분할 (라이트/컴팩트 모드용, 기존 유지) ─────────────────────────────
interface LineConfig {
  text: string
  size: string
  color: string
  weight: number
}

function splitKoreanText(text: string): string[] {
  const words = text.split(' ')
  if (words.length <= 1) return [text, '', '', '']
  if (words.length === 2) return [words[0], words[1], '', '']
  if (words.length === 3) return [words[0], words[1], words[2], '']

  const first = words[0]
  const last = words[words.length - 1]
  const secondLast = words[words.length - 2]
  const middle = words.slice(1, words.length - 2)

  if (middle.length === 0) return [first, secondLast, last, '']
  if (middle.length === 1) return [first, middle[0], secondLast, last]
  const line3 = middle.slice(1).join(' ')
  return [first, middle[0], line3, `${secondLast} ${last}`]
}

interface DynamicTextProps {
  text: string
  darkBackground?: boolean
  compact?: boolean
}

// ── 다크 읽기 화면 — 어절 일정 크기 + 상태별 색/투명도 ──────────────────────
function DarkReadingText({ text }: { text: string }) {
  const words = text.split(' ').filter(Boolean)
  const [currentIdx, setCurrentIdx] = useState(-1)

  useEffect(() => {
    setCurrentIdx(-1)
    let idx = 0
    const timer = setInterval(() => {
      setCurrentIdx(idx)
      idx++
      if (idx >= words.length) clearInterval(timer)
    }, 480)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {words.map((word, i) => {
        const isRead    = i < currentIdx
        const isCurrent = i === currentIdx
        return (
          <span
            key={i}
            style={{
              fontSize: '52px',
              fontWeight: 800,
              letterSpacing: '1px',
              lineHeight: 1.15,
              color: isCurrent ? 'var(--color-text-onDark)' : 'var(--color-accent-light)',
              opacity: isRead ? 0.55 : isCurrent ? 1 : 0.85,
              textShadow: isCurrent ? '0 0 24px rgba(232,200,120,.35)' : 'none',
              transition: 'color 0.4s ease, opacity 0.4s ease, text-shadow 0.4s ease',
              display: 'block',
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export function DynamicText({ text, darkBackground = false, compact = false }: DynamicTextProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  // 다크 읽기 화면: 새 디자인
  if (darkBackground) {
    return <DarkReadingText text={text} />
  }

  // 라이트 / 컴팩트 모드: 기존 로직 유지
  const chunks = splitKoreanText(text)
  const lines: LineConfig[] = [
    { text: chunks[0], size: compact ? '16px' : '26px', color: 'var(--color-text-secondary)', weight: 400 },
    { text: chunks[1], size: compact ? '28px' : '52px', color: 'var(--color-text-primary)', weight: 500 },
    { text: chunks[2], size: compact ? '18px' : '28px', color: 'var(--color-accent-light)', weight: 400 },
    { text: chunks[3], size: compact ? '20px' : '32px', color: 'var(--color-accent-secondary)', weight: 500 },
  ]

  return (
    <div style={{ letterSpacing: '-0.5px', lineHeight: 1.9 }}>
      {lines.map((line, i) =>
        line.text ? (
          <div
            key={i}
            style={{
              fontSize: line.size,
              color: line.color,
              fontWeight: line.weight,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.4s ease ${i * 0.2}s, transform 0.4s ease ${i * 0.2}s`,
            }}
          >
            {line.text}
          </div>
        ) : null
      )}
    </div>
  )
}
