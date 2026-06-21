'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

const CANVAS_WIDTH = 360
const CANVAS_HEIGHT = 540
const PADDLE_H = 12
const PADDLE_W = 80
const BALL_R = 8
const BRICK_H = 32
const BRICK_GAP = 6

interface Brick {
  x: number
  y: number
  w: number
  h: number
  word: string
  alive: boolean
  color: string
}

const COLORS = ['#FAEEDA', '#E6F1FB', '#EAF3DE', '#FBEAF0', '#E1F5EE', '#FCEBEB', '#EEEDFE']

export default function BrickGamePage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const gameRef = useRef({
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, vx: 3, vy: -4 },
    paddle: { x: CANVAS_WIDTH / 2 - PADDLE_W / 2 },
    bricks: [] as Brick[],
    running: false,
    won: false,
    affirmationText: '',
    affirmationId: '',
    timeLeft: 120,
  })
  const [gameState, setGameState] = useState<'idle' | 'running' | 'won' | 'lost'>('idle')
  const [affirmationText, setAffirmationText] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const initGame = useCallback(() => {
    const affirmations = getAffirmations()
    if (affirmations.length === 0) {
      router.push('/create')
      return
    }
    const aff = affirmations[Math.floor(Math.random() * affirmations.length)]
    const words = aff.text.split(' ')
    setAffirmationText(aff.text)
    gameRef.current.affirmationText = aff.text
    gameRef.current.affirmationId = aff.id

    // Layout bricks
    const cols = Math.min(4, words.length)
    const totalGap = BRICK_GAP * (cols - 1)
    const brickW = (CANVAS_WIDTH - 32 - totalGap) / cols
    const rows = Math.ceil(words.length / cols)
    const bricks: Brick[] = []

    words.forEach((word, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      bricks.push({
        x: 16 + col * (brickW + BRICK_GAP),
        y: 60 + row * (BRICK_H + BRICK_GAP),
        w: brickW,
        h: BRICK_H,
        word,
        alive: true,
        color: COLORS[idx % COLORS.length],
      })
    })

    gameRef.current.bricks = bricks
    gameRef.current.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100, vx: 3, vy: -4 }
    gameRef.current.paddle = { x: CANVAS_WIDTH / 2 - PADDLE_W / 2 }
    gameRef.current.running = true
    gameRef.current.won = false
    gameRef.current.timeLeft = 120
    setGameState('running')

    timerRef.current = setInterval(() => {
      gameRef.current.timeLeft--
      if (gameRef.current.timeLeft <= 0) {
        gameRef.current.running = false
        setGameState('lost')
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, 1000)
  }, [router])

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const g = gameRef.current
    if (!g.running) return

    // Clear
    ctx.fillStyle = '#1A0E05'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Move ball
    g.ball.x += g.ball.vx
    g.ball.y += g.ball.vy

    // Wall bounce
    if (g.ball.x - BALL_R < 0 || g.ball.x + BALL_R > CANVAS_WIDTH) g.ball.vx *= -1
    if (g.ball.y - BALL_R < 0) g.ball.vy *= -1
    if (g.ball.y + BALL_R > CANVAS_HEIGHT) {
      g.running = false
      setGameState('lost')
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    // Paddle bounce
    const px = g.paddle.x
    const py = CANVAS_HEIGHT - 30
    if (
      g.ball.y + BALL_R >= py &&
      g.ball.y + BALL_R <= py + PADDLE_H &&
      g.ball.x >= px &&
      g.ball.x <= px + PADDLE_W
    ) {
      g.ball.vy = -Math.abs(g.ball.vy)
      const offset = (g.ball.x - (px + PADDLE_W / 2)) / (PADDLE_W / 2)
      g.ball.vx = offset * 5
    }

    // Brick collision
    let allClear = true
    g.bricks.forEach((brick) => {
      if (!brick.alive) return
      allClear = false
      if (
        g.ball.x + BALL_R >= brick.x &&
        g.ball.x - BALL_R <= brick.x + brick.w &&
        g.ball.y + BALL_R >= brick.y &&
        g.ball.y - BALL_R <= brick.y + brick.h
      ) {
        brick.alive = false
        g.ball.vy *= -1
      }
    })

    if (allClear) {
      g.running = false
      g.won = true
      setGameState('won')
      if (timerRef.current) clearInterval(timerRef.current)
      playAffirmationAudio(g.affirmationId, g.affirmationText)
      // Mark completion
      const today = todayStr()
      const affirmations = getAffirmations()
      const aff = affirmations.find((a) => a.id === g.affirmationId)
      if (aff && !aff.completedDates.includes(today)) {
        updateAffirmation({ ...aff, completedDates: [...aff.completedDates, today] })
        const existing = getDayRecord(today)
        saveDayRecord({
          date: today,
          completedCount: (existing?.completedCount ?? 0) + 1,
          dominantCategory: aff.category,
        })
      }
      return
    }

    // Draw destroyed bricks — show text in place
    g.bricks.forEach((brick) => {
      if (brick.alive) return
      ctx.fillStyle = `${brick.color}28`
      ctx.beginPath()
      ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 6)
      ctx.fill()
      ctx.fillStyle = brick.color
      ctx.font = `bold 12px Pretendard, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(brick.word, brick.x + brick.w / 2, brick.y + brick.h / 2, brick.w - 8)
    })

    // Draw alive bricks (no text — hidden until hit)
    g.bricks.forEach((brick) => {
      if (!brick.alive) return
      ctx.fillStyle = brick.color
      ctx.beginPath()
      ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 6)
      ctx.fill()
    })

    // Draw ball
    ctx.fillStyle = '#EF9F27'
    ctx.beginPath()
    ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()

    // Draw paddle
    ctx.fillStyle = '#BA7517'
    ctx.beginPath()
    ctx.roundRect(g.paddle.x, CANVAS_HEIGHT - 30, PADDLE_W, PADDLE_H, 6)
    ctx.fill()

    // Timer
    ctx.fillStyle = '#888780'
    ctx.font = '12px Pretendard, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${g.timeLeft}초`, CANVAS_WIDTH - 16, 20)

    animRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    if (gameState === 'running') {
      animRef.current = requestAnimationFrame(loop)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [gameState, loop])

  // Touch/mouse controls
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    gameRef.current.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_W, x - PADDLE_W / 2))
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.touches[0].clientX - rect.left
    gameRef.current.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_W, x - PADDLE_W / 2))
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', padding: '20px 16px' }}
    >
      <div className="flex items-center justify-between w-full mb-4">
        <button
          onClick={() => router.back()}
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
        >
          ← 돌아가기
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-onDark)' }}>
          벽돌 깨기
        </h1>
        <div style={{ width: '60px' }} />
      </div>

      {gameState === 'idle' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center' }}>
            성공의 말 단어들이 벽돌로 숨어 있어요.<br />공을 튕겨 모두 깨면 성공의 말 완성!
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

      {(gameState === 'running') && (
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          style={{
            borderRadius: '16px',
            maxWidth: '100%',
            touchAction: 'none',
          }}
        />
      )}

      {gameState === 'won' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <div style={{ fontSize: '48px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-onDark)' }}>
            완성!
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--color-accent-light)', lineHeight: 1.6 }}>
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

      {gameState === 'lost' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <div style={{ fontSize: '48px' }}>😅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-onDark)' }}>
            아쉬워요!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            다시 도전해보세요
          </p>
          <button
            onClick={initGame}
            style={{
              padding: '12px 32px',
              background: 'var(--color-accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            다시 하기
          </button>
        </div>
      )}
    </div>
  )
}
