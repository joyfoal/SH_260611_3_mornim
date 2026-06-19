'use client'

import { AppLayout } from '@/components/ui/AppLayout'

export default function CommunityPage() {
  return (
    <AppLayout activeTab="함께">
      <div
        className="flex flex-col items-center justify-center"
        style={{ minHeight: '60vh', padding: '40px 24px', textAlign: 'center' }}
      >
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌱</div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
          함께하기
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          함께하기 기능은 곧 출시됩니다 🌱<br />
          더 많은 사람들과 확언을 나눠요
        </p>
      </div>
    </AppLayout>
  )
}
