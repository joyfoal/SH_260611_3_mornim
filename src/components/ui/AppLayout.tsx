'use client'

import { TabBar } from './TabBar'

interface AppLayoutProps {
  children: React.ReactNode
  activeTab: string
  hideTabBar?: boolean
  decorativeIcons?: [number, number]
}

function SpriteIcon({ index, size }: { index: number; size: number }) {
  const col = index % 3
  const row = Math.floor(index / 3)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundImage: 'url(/ealo.png)',
        backgroundSize: '300% 300%',
        backgroundPosition: `${col * 50}% ${row * 50}%`,
        flexShrink: 0,
      }}
    />
  )
}

export function AppLayout({ children, activeTab, hideTabBar, decorativeIcons }: AppLayoutProps) {
  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: 'var(--color-bg-primary)', position: 'relative' }}
    >
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      {!hideTabBar && <TabBar activeTab={activeTab} />}
      {decorativeIcons && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            right: '16px',
            display: 'flex',
            gap: '8px',
            opacity: 0.28,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <SpriteIcon index={decorativeIcons[0]} size={44} />
          <SpriteIcon index={decorativeIcons[1]} size={44} />
        </div>
      )}
    </div>
  )
}
