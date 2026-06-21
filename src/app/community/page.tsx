'use client'

import { AppLayout } from '@/components/ui/AppLayout'
import { UsersRound, DoorOpen, MessageCircleHeart, Heart, Trophy, Sparkles } from 'lucide-react'

const ROOM_FEATURES = [
  {
    icon: <MessageCircleHeart size={16} strokeWidth={1.75} color="var(--color-accent-primary)" />,
    title: '성공의 말 나누기',
    desc: '내 성공의 말을 방 사람들과 공유해요',
  },
  {
    icon: <Heart size={16} strokeWidth={1.75} color="var(--color-accent-primary)" />,
    title: '서로 응원하기',
    desc: '서로의 성장을 응원하며 동기부여를 나눠요',
  },
]

export default function CommunityPage() {
  const chipBg = 'color-mix(in srgb, var(--color-accent-light) 50%, var(--color-bg-card))'

  return (
    <AppLayout activeTab="함께">
      <div style={{ padding: '20px 16px' }}>
        {/* 헤더 */}
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          함께
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
          더 많은 사람들과 성공의 말을 나눠요
        </p>

        {/* 히어로 카드 */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: '24px',
            padding: '36px 24px 28px',
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <UsersRound size={34} strokeWidth={1.5} color="var(--color-accent-primary)" />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
            함께하기 준비 중이에요
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
            여러 방을 만들어 혼자가 아닌<br />함께 성장하는 공간을 만들고 있어요
          </p>

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

        {/* 방 미리보기 카드 */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            borderRadius: '20px',
            padding: '18px',
            marginBottom: '10px',
            border: '1.5px solid var(--color-accent-light)',
          }}
        >
          {/* 방 라벨 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: chipBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DoorOpen size={15} strokeWidth={1.75} color="var(--color-accent-primary)" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              방 미리보기
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-accent-primary)',
                background: chipBg,
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              방 안의 기능
            </span>
          </div>

          {/* 기능 행 */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {ROOM_FEATURES.map((feat, idx) => (
              <div
                key={feat.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 0',
                  borderTop: idx === 0 ? '1px solid var(--color-border)' : '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: chipBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {feat.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                    {feat.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                    {feat.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 함께 도전 카드 */}
        <div
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
              background: chipBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Trophy size={18} strokeWidth={1.75} color="var(--color-accent-primary)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
              함께 도전
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              같은 목표를 가진 사람들과 함께 연속 기록에 도전해요
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
