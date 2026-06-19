'use client'

import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'

export default function GamesPage() {
  const router = useRouter()

  return (
    <AppLayout activeTab="게임" decorativeIcons={[1, 8]}>
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          게임
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          게임으로 확언을 익혀보세요
        </p>

        <div className="flex flex-col gap-4">
          {/* Profile Image */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-bg-card))',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid var(--color-accent-secondary)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              프로필 이미지 만들기
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px', lineHeight: 1.5 }}>
              얼굴 사진이나 원하는 글로 나만의 지브리 스타일 캐릭터를 만들어요.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.4, opacity: 0.7 }}>
              얼굴+글 · 얼굴만 · 글만 — 세 가지 방법 중 선택
            </p>
            <button
              onClick={() => router.push('/games/profile-image')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              캐릭터 만들기
            </button>
          </div>

          {/* Success Image */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌟</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              성공 이미지 만들기
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              저장된 프로필 캐릭터와 성공의 말로 AI가 성공한 미래를 그려드려요!
            </p>
            <button
              onClick={() => router.push('/games/success-image')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              성공 이미지 만들기
            </button>
          </div>

          {/* Brick Breaker */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧱</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              벽돌 깨기
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              확언의 단어들이 벽돌이 되어요. 모두 깨면 확언을 완성!
            </p>
            <button
              onClick={() => router.push('/games/brick')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              플레이
            </button>
          </div>

          {/* Word Sort */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔤</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              단어 정렬
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              뒤섞인 확언 단어를 올바른 순서로 맞춰보세요!
            </p>
            <button
              onClick={() => router.push('/games/word-sort')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              플레이
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
