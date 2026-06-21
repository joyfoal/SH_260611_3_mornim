import { getStreakData, saveStreakData, todayStr, getCalendar, getWeeklyShields, saveWeeklyShields, getWeekKey } from './storage'

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function hasFiveHighDays(): boolean {
  const calendar = getCalendar()
  const now = new Date()
  for (let i = 0; i < 5; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const rec = calendar.find((r) => r.date === dateStr)
    if (!rec || rec.completedCount < 7) return false
  }
  return true
}

function isCurrentWeekComplete(): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 6=Sat
  const calendar = getCalendar()

  // Check all days from Sunday to today
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (dayOfWeek - i))
    const dateStr = d.toISOString().split('T')[0]
    const rec = calendar.find((r) => r.date === dateStr)
    if (!rec || rec.completedCount < 3) return false
  }
  return true
}

export function updateStreak(completedToday: boolean): void {
  if (!completedToday) return

  const data = getStreakData()
  const today = todayStr()

  if (data.lastCompletedDate === today) return // already updated

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (data.lastCompletedDate === yesterdayStr) {
    data.currentStreak++
  } else if (data.lastCompletedDate === null) {
    data.currentStreak = 1
  } else {
    const daysMissed = daysBetween(data.lastCompletedDate, today) - 1
    if (daysMissed === 1 && data.shields > 0) {
      data.shields--
      data.currentStreak++
    } else {
      data.currentStreak = 1
    }
  }

  data.lastCompletedDate = today

  saveStreakData(data)

  // Shield for completing all days of a Sun-Sat week
  const weekKey = getWeekKey(new Date())
  const weeklyShields = getWeeklyShields()
  if (!weeklyShields.includes(weekKey) && isCurrentWeekComplete()) {
    data.shields++
    saveStreakData(data)
    weeklyShields.push(weekKey)
    saveWeeklyShields(weeklyShields)
  }

  // Shield for 5 consecutive days with 7+ completions each
  if (hasFiveHighDays()) {
    data.shields++
    saveStreakData(data)
  }
}
