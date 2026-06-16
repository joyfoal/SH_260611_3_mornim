'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Plus, Trash2 } from 'lucide-react'
import { getAffirmations, deleteAffirmation, getCategories, type Affirmation } from '@/lib/storage'
import { getCategoryColor } from '@/lib/categories'

export default function AffirmationsPage() {
  const router = useRouter()
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  const load = () => {
    setAffirmations(getAffirmations())
    setCategories(getCategories())
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = (id: string) => {
    if (confirm('이 성공의 말을 삭제할까요?')) {
      deleteAffirmation(id)
      load()
    }
  }

  const filtered = filterCategory
    ? affirmations.filter((a) => a.category === filterCategory)
    : affirmations

  const grouped = categories.reduce<Record<string, Affirmation[]>>((acc, cat) => {
    const items = filtered.filter((a) => a.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <AppLayout activeTab="성공의 말" decorativeIcons={[4, 8]}>
      <div style={{ padding: '20px 16px' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            나의 성공의 말
          </h1>
          <button
            onClick={() => router.push('/create')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-accent-primary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} color="white" />
          </button>
        </div>

        {/* Filter chips */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-4"
          style={{ scrollbarWidth: 'none' }}
        >
          <button
            onClick={() => setFilterCategory(null)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: !filterCategory ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
              background: !filterCategory ? 'var(--color-accent-light)' : 'transparent',
              color: !filterCategory ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: filterCategory === cat ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                background: filterCategory === cat ? 'var(--color-accent-light)' : 'transparent',
                color: filterCategory === cat ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {affirmations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-muted)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✨</div>
            <p style={{ fontSize: '15px', marginBottom: '20px' }}>
              아직 성공의 말이 없어요.<br />첫 성공의 말을 만들어보세요!
            </p>
            <button
              onClick={() => router.push('/create')}
              style={{
                padding: '12px 28px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              성공의 말 만들기
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const colors = getCategoryColor(cat, categories)
            return (
              <div key={cat} style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: colors.dark,
                    marginBottom: '8px',
                    padding: '4px 12px',
                    background: colors.light,
                    borderRadius: '20px',
                    display: 'inline-block',
                  }}
                >
                  {cat}
                </div>
                {items.map((affirmation) => (
                  <div
                    key={affirmation.id}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--color-bg-card)',
                      borderRadius: '14px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5, marginBottom: '4px' }}>
                        {affirmation.text}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        완료 {affirmation.completedDates.length}회
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(affirmation.id)}
                      style={{
                        padding: '6px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>
    </AppLayout>
  )
}
