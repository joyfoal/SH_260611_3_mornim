'use client'

import { BarChart2 } from 'lucide-react'
import { getCalendar, getAffirmations, todayStr } from '@/lib/storage'

export function WeeklyReportModal({ onClose }: { onClose: () => void }) {
  const today = new Date()
  const weekDays: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    weekDays.push(d.toISOString().split('T')[0])
  }
  const calendar = getCalendar()
  const affirmations = getAffirmations()
  const weekRecords = weekDays.map((date) => {
    const rec = calendar.find((r) => r.date === date)
    return { date, count: rec?.completedCount ?? 0 }
  })
  const totalCompleted = weekRecords.reduce((s, r) => s + r.count, 0)
  const daysCompleted = weekRecords.filter((r) => r.count > 0).length
  const weekDateSet = new Set(weekDays)
  const topAffirmation = [...affirmations]
    .map((a) => ({ text: a.text, count: a.completedDates.filter((d) => weekDateSet.has(d)).length }))
    .sort((a, b) => b.count - a.count)[0]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: '430px', margin: '0 auto', background: 'var(--color-bg-primary)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: '36px', height: '4px', background: 'var(--color-border)', borderRadius: '2px', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '7px' }}><BarChart2 size={18} /> 이번 주 리포트</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[{ label: '완료한 날', value: daysCompleted }, { label: '총 완료 횟수', value: totalCompleted }].map(({ label, value }) => (
            <div key={label} style={{ padding: '16px', background: 'var(--color-bg-card)', borderRadius: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-accent-primary)' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          {weekRecords.map((rec) => {
            const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][new Date(rec.date + 'T00:00:00').getDay()]
            const isToday = rec.date === todayStr()
            return (
              <div key={rec.date} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', background: rec.count > 0 ? `rgba(186,117,23,${Math.min(0.3 + rec.count * 0.15, 1)})` : 'var(--color-bg-card)', border: isToday ? '2px solid var(--color-accent-primary)' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: rec.count > 0 ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', fontWeight: rec.count > 0 ? 600 : 400 }}>
                  {rec.count || ''}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{dayLabel}</span>
              </div>
            )
          })}
        </div>
        {topAffirmation && topAffirmation.count > 0 && (
          <div style={{ padding: '14px 16px', background: 'var(--color-bg-card)', borderRadius: '14px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>이번 주 가장 많이 말한 성공의 말</p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{topAffirmation.text}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-accent-primary)', marginTop: '4px' }}>{topAffirmation.count}회 완료</p>
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: '14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
          확인
        </button>
      </div>
    </div>
  )
}
