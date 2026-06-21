'use client'

import { AppLayout } from '@/components/ui/AppLayout'
import { UsersRound, MessageCircleHeart, Trophy, Sparkles } from 'lucide-react'

const COMING_FEATURES = [
  {
    icon: <MessageCircleHeart size={18} strokeWidth={1.75} color="var(--color-accent-primary)" />,
    title: '성공의 말 나누기',
    desc: '내 성공의 말을 다른 사람들과 공유해요',
  },
  {
    icon: <Trophy size={18} strokeWidth={1.75} color="var(--color-accent-primary)" />,
    title: '함께 도전',
    desc: '같은 목표를 가진 사람들과 함께 연속 기록에 도전해요',
  },
  {
    icon: <Sparkles size={18} strokeWidth={1.75} color="var(--color-accent-primary)" />,
    title: '서로 응원하기',
    desc: '서로의 성장을 응원하며 동기부여를 나눠요',
  },
]

export default function CommunityPage() {
  return (
    <AppLayout activeTab="함께">
      <div style={{ padding: '20px 16px' }}>
        {/* 헤더 */}
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          함께
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '32px' }}>
          더 많은 사람들과 성공의 말을 나눠요
        </p>

        {/* 메인 일러스트 영역 */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: '24px',
            padding: '40px 24px 32px',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          {/* 아이콘 */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <UsersRound size={34} strokeWidth={1.5} color="var(--color-accent-primary)" />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
            함께하기 준비 중이에요
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '20px' }}>
            혼자가 아닌 함께 성장하는<br />공간을 만들고 있어요
          </p>

          {/* Coming Soon 배지 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              background: 'var(--color-accent-primary)',
              borderRadius: '999px',
            }}
          >
            <Sparkles size={13} strokeWidth={2} color="white" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>
              COMING SOON
            </span>
          </div>
        </div>

        {/* 예정 기능 카드들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {COMING_FEATURES.map((feat) => (
            <div
              key={feat.title}
              style={{
                background: 'var(--color-bg-card)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'color-mix(in srgb, var(--color-accent-light) 50%, var(--color-bg-card))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {feat.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                  {feat.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {feat.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
