'use client'

import { useEffect, useState } from 'react'

export type CelebrationVariant =
  | 'progress'      // 큐 중간 — 자동 다음으로
  | 'batch_done'    // 배치(초기/추가) 완료 — 더 말하기 / 여기까지
  | 'all_done'      // 오늘 성공의 말 전부 완료 — 추가하기 / 반복하기
  | 'repeat_done'   // 반복 1사이클 완료 — 축하 + 여기까지만

const PHRASES = [
  '잘했어요! ✨', '멋져요! 🌟', '오늘도 해냈어요! 💪', '최고예요! 🏆', '정말 잘하고 있어요! 🌺',
  '대단해요! 🎯', '훌륭해요! 🌸', '스스로를 자랑스러워하세요! 💫', '오늘도 성장했어요! 🌱',
  '포기하지 않는 당신이 멋져요! 🔥', '한 걸음씩, 분명히 나아가고 있어요! 👣',
  '말하는 순간 이미 이루어지고 있어요! ✨', '당신은 충분히 잘하고 있어요! 💛',
  '작은 실천이 큰 변화를 만들어요! 🌟', '오늘의 나에게 박수를! 👏',
  '매일 성장하는 당신을 응원해요! 🌈', '이 순간이 당신을 바꾸고 있어요! ⭐',
  '말의 힘을 믿어요! 계속 해요! 🎇', '자신에게 친절한 당신, 정말 멋져요! 🌻',
  '오늘도 최선을 다한 당신, 수고했어요! 🎉',
  '오늘의 당신, 정말 빛나요! 💎', '믿음이 현실이 되고 있어요! 🌙',
  '당신의 말 한마디가 세상을 바꿔요! 🌍', '꾸준함이 기적을 만들어요! ✨',
  '오늘도 멋지게 해냈어요! 🎊', '당신은 이미 충분해요! 🤍',
  '계속 나아가는 당신이 자랑스러워요! 🦋', '말로 씨앗을 심었어요! 🌷',
  '작은 습관이 인생을 바꿔요! 🔑', '오늘도 자신을 믿어줘서 고마워요! 🫶',
  '긍정의 말이 에너지가 돼요! ⚡', '당신은 날마다 더 강해지고 있어요! 💪',
  '포기 없이 여기까지 왔어요! 🛤️', '마음속 씨앗이 자라고 있어요! 🌿',
  '오늘의 한마디가 내일을 바꿔요! 🌅', '스스로에게 주는 최고의 선물이에요! 🎁',
  '당신의 가능성은 무한해요! ♾️', '말하는 당신이 이미 달라지고 있어요! 🌠',
  '진심으로 수고했어요! 🌸', '매 순간이 소중한 변화예요! 💜',
]

interface CelebrationScreenProps {
  completedCount: number
  totalCount: number
  variant: CelebrationVariant
  onNext: () => void              // progress → 자동 진행 / done 상태 → 오늘은 여기까지
  onMore?: () => void             // 오늘 더 말하고 싶어요
  onAddAffirmation?: () => void   // 성공의 말 추가하기
  onRepeat?: () => void           // 반복하기
}

export function CelebrationScreen({
  completedCount,
  totalCount,
  variant,
  onNext,
  onMore,
  onAddAffirmation,
  onRepeat,
}: CelebrationScreenProps) {
  const [phrase] = useState(() => PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const [visible, setVisible] = useState(false)

  const isBig = variant !== 'progress'

  useEffect(() => {
    setVisible(true)

    if (typeof window !== 'undefined') {
      import('canvas-confetti').then(({ default: confetti }) => {
        if (variant === 'repeat_done') {
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#BD821F', '#E8C878', '#F3E6C8', '#ffffff', '#FFD700'] })
          setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: ['#BD821F', '#FFA500', '#FFD700'] }), 200)
          setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: ['#BD821F', '#FFA500', '#FFD700'] }), 400)
          setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, colors: ['#FF69B4', '#7B68EE', '#00CED1'] }), 700)
        } else if (isBig) {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#BD821F', '#E8C878', '#F3E6C8', '#ffffff', '#FFD700'] })
          setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors: ['#BD821F', '#FFA500', '#FFD700'] }), 200)
          setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: ['#BD821F', '#FFA500', '#FFD700'] }), 400)
        } else {
          confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 }, colors: ['#BD821F', '#E8C878', '#ffffff'] })
        }
      }).catch(() => {})
    }

    if (variant === 'progress') {
      const timer = setTimeout(onNext, 1500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  const mainEmoji =
    variant === 'repeat_done' ? '🎉' :
    isBig ? '🎊' : '🌟'

  const mainMessage =
    variant === 'all_done' ? '오늘 나의 성공의 말을\n다하셨어요!' :
    variant === 'repeat_done' ? '반복까지 완료하셨어요!\n정말 대단해요! 💪' :
    phrase

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', padding: '32px 24px' }}
    >
      {isBig && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                fontSize: `${12 + (i % 3) * 8}px`,
                left: `${(i * 37) % 90}%`,
                top: `${(i * 23 + 10) % 80}%`,
                opacity: 0,
                animation: `starFade 1.2s ease-out ${i * 0.1}s forwards`,
              }}
            >
              {['✨', '⭐', '🌟', '💫'][i % 4]}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '320px',
        }}
      >
        <div style={{ fontSize: isBig ? '72px' : '56px', marginBottom: '16px', lineHeight: 1 }}>
          {mainEmoji}
        </div>

        <div
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--color-text-onDark)',
            marginBottom: '12px',
            lineHeight: 1.4,
            whiteSpace: 'pre-line',
          }}
        >
          {mainMessage}
        </div>

        {completedCount > 0 && (
          <div
            style={{
              fontSize: '15px',
              color: 'var(--color-accent-light)',
              marginBottom: isBig ? '32px' : '0',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.4s ease 0.3s',
            }}
          >
            오늘 {completedCount}회 완료
          </div>
        )}

        {/* batch_done: 더 말하고 싶어요 + 여기까지 */}
        {variant === 'batch_done' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.4s ease 0.5s',
            }}
          >
            <button
              onClick={onMore}
              style={{
                padding: '16px',
                background: 'var(--color-accent-primary)',
                border: 'none',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              오늘 더 말하고 싶어요 💪
            </button>
            <button
              onClick={onNext}
              style={{
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '16px',
                color: 'var(--color-text-muted)',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              오늘은 여기까지
            </button>
          </div>
        )}

        {/* all_done: 성공의 말 추가하기 + 반복하기 */}
        {variant === 'all_done' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.4s ease 0.5s',
            }}
          >
            <button
              onClick={onAddAffirmation}
              style={{
                padding: '16px',
                background: 'var(--color-accent-primary)',
                border: 'none',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              성공의 말 추가하기
            </button>
            <button
              onClick={onRepeat}
              style={{
                padding: '14px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '16px',
                color: 'var(--color-text-onDark)',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              반복하기
            </button>
          </div>
        )}

        {/* repeat_done: 반복 완료 축하 + 여기까지만 */}
        {variant === 'repeat_done' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              alignItems: 'center',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.4s ease 0.5s',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              카메라 말하기는 내일 다시 만나요 👋
            </div>
            <button
              onClick={onNext}
              style={{
                width: '100%',
                padding: '16px',
                background: 'var(--color-accent-primary)',
                border: 'none',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              오늘은 여기까지
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes starFade {
          0% { opacity: 0; transform: scale(0) rotate(-20deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(10deg); }
          100% { opacity: 0.7; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  )
}
