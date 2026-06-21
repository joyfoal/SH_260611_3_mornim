export type ThemeName = 'warm' | 'dark' | 'green'

export type AffirmationCategory = string

export interface Affirmation {
  id: string
  text: string
  category: AffirmationCategory
  createdAt: string
  completedDates: string[]
}

export interface DayRecord {
  date: string
  completedCount: number
  dominantCategory: AffirmationCategory | null
}

export interface StreakData {
  currentStreak: number
  lastCompletedDate: string | null
  shields: number
}

export interface TomorrowNote {
  date: string
  message: string
  selectedAffirmationIds: string[]
}

export interface AlarmSettings {
  affirmationId: string
  hour: number
  minute: number
  repeatDays: number[]        // 0=일,1=월,...,6=토; empty=매일
  endType: 'none' | 'date' | 'count'
  endDate: string             // endType='date' 때 사용
  endCount: number            // endType='count' 때 사용
  firedCount: number
  audioId?: string            // legacy
}

export interface AlarmEntry extends AlarmSettings {
  id: string
}

const KEYS = {
  AFFIRMATIONS: 'mornim-affirmations',
  TRASH: 'mornim-trash',
  CALENDAR: 'mornim-calendar',
  STREAK: 'mornim-streak',
  THEME: 'mornim-theme',
  ONBOARDING_DONE: 'mornim-onboarded',
  TOMORROW_NOTE: 'mornim-tomorrow-note',
  TODAY_AFFIRMATIONS: 'mornim-today-affirmations',
  WEEKLY_REPORT_SHOWN: 'mornim-weekly-report-shown',
  TOMORROW_ENABLED: 'mornim-tomorrow-enabled',
  CATEGORIES: 'mornim-categories',
  TODAY_EXTRA: 'mornim-today-extra',
  ALARM: 'mornim-alarm',
  ALARM_LIST: 'mornim-alarm-list',
  ALARM_LAST_SHOWN: 'mornim-alarm-last-shown',
  DAY_NOTES: 'mornim-day-notes',
  WEEKLY_SHIELDS: 'mornim-weekly-shields',
  TODAY_REPEAT_DONE: 'mornim-today-repeat-done',
  NAEGE_SEEN_DATE: 'mornim-naege-seen-date',
  SHOW_RECENT_REC: 'mornim-show-recent-rec',
  SHOW_SUCCESS_IMG: 'mornim-show-success-img',
  SHOW_CALENDAR: 'mornim-show-calendar',
} as const

const DEFAULT_CATEGORIES = [
  '나 자신', '일과 커리어', '돈과 풍요', '관계와 사랑',
  '건강과 몸', '용기와 도전', '마음과 평온', '오늘 하루',
]

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

// Affirmations
export function getAffirmations(): Affirmation[] {
  return safeGet<Affirmation[]>(KEYS.AFFIRMATIONS, [])
}

export function saveAffirmation(a: Affirmation): void {
  const list = getAffirmations()
  list.push(a)
  safeSet(KEYS.AFFIRMATIONS, list)
}

export function updateAffirmation(a: Affirmation): void {
  const list = getAffirmations()
  const idx = list.findIndex((x) => x.id === a.id)
  if (idx >= 0) list[idx] = a
  else list.push(a)
  safeSet(KEYS.AFFIRMATIONS, list)
}

export function deleteAffirmation(id: string): void {
  const list = getAffirmations().filter((x) => x.id !== id)
  safeSet(KEYS.AFFIRMATIONS, list)
}

// Trash (soft-deleted affirmations)
export function getTrash(): Affirmation[] {
  return safeGet<Affirmation[]>(KEYS.TRASH, [])
}

export function moveToTrash(id: string): void {
  const list = getAffirmations()
  const idx = list.findIndex((x) => x.id === id)
  if (idx < 0) return
  const [item] = list.splice(idx, 1)
  safeSet(KEYS.AFFIRMATIONS, list)
  const trash = getTrash()
  trash.push(item)
  safeSet(KEYS.TRASH, trash)
}

export function restoreFromTrash(id: string): void {
  const trash = getTrash()
  const idx = trash.findIndex((x) => x.id === id)
  if (idx < 0) return
  const [item] = trash.splice(idx, 1)
  safeSet(KEYS.TRASH, trash)
  const list = getAffirmations()
  list.push(item)
  safeSet(KEYS.AFFIRMATIONS, list)
}

export function emptyTrash(): void {
  safeSet(KEYS.TRASH, [])
}

// Calendar
export function getCalendar(): DayRecord[] {
  return safeGet<DayRecord[]>(KEYS.CALENDAR, [])
}

export function getDayRecord(date: string): DayRecord | null {
  const list = getCalendar()
  return list.find((r) => r.date === date) ?? null
}

export function saveDayRecord(r: DayRecord): void {
  const list = getCalendar()
  const idx = list.findIndex((x) => x.date === r.date)
  if (idx >= 0) list[idx] = r
  else list.push(r)
  safeSet(KEYS.CALENDAR, list)
}

// Streak
export function getStreakData(): StreakData {
  return safeGet<StreakData>(KEYS.STREAK, {
    currentStreak: 0,
    lastCompletedDate: null,
    shields: 0,
  })
}

export function saveStreakData(s: StreakData): void {
  safeSet(KEYS.STREAK, s)
}

// Today's affirmation queue
export function getTodayAffirmationIds(): string[] {
  return safeGet<string[]>(KEYS.TODAY_AFFIRMATIONS, [])
}

export function saveTodayAffirmationIds(ids: string[]): void {
  safeSet(KEYS.TODAY_AFFIRMATIONS, ids)
}

// Tomorrow note
export function getTomorrowNote(): TomorrowNote | null {
  return safeGet<TomorrowNote | null>(KEYS.TOMORROW_NOTE, null)
}

export function saveTomorrowNote(n: TomorrowNote): void {
  safeSet(KEYS.TOMORROW_NOTE, n)
}

// Onboarding
export function isOnboarded(): boolean {
  return safeGet<boolean>(KEYS.ONBOARDING_DONE, false)
}

export function setOnboarded(): void {
  safeSet(KEYS.ONBOARDING_DONE, true)
}

// Theme
export function getTheme(): ThemeName {
  return safeGet<ThemeName>(KEYS.THEME, 'warm')
}

export function setTheme(t: ThemeName): void {
  safeSet(KEYS.THEME, t)
}

// Tomorrow enabled
export function isTomorrowEnabled(): boolean {
  return safeGet<boolean>(KEYS.TOMORROW_ENABLED, true)
}

export function setTomorrowEnabled(v: boolean): void {
  safeSet(KEYS.TOMORROW_ENABLED, v)
}

// Categories (dynamic)
export function getCategories(): string[] {
  return safeGet<string[]>(KEYS.CATEGORIES, DEFAULT_CATEGORIES)
}

export function saveCategories(cats: string[]): void {
  safeSet(KEYS.CATEGORIES, cats)
}

// Helper
export function todayStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Generate today's affirmation queue
export function generateTodayQueue(): string[] {
  const today = todayStr()
  const note = getTomorrowNote()
  if (note && note.date === today && note.selectedAffirmationIds.length > 0) {
    // 어제 선택한 최대 7개를 랜덤 순서로
    return [...note.selectedAffirmationIds].sort(() => Math.random() - 0.5)
  }
  const affirmations = getAffirmations()
  if (affirmations.length === 0) return []
  return [...affirmations].sort(() => Math.random() - 0.5).slice(0, 3).map((a) => a.id)
}

// Affirmations by date (active + trashed, so deleted items still appear in calendar)
export function getAffirmationsByDate(dateStr: string): Affirmation[] {
  const all = [...getAffirmations(), ...getTrash()]
  return all.filter((a) => a.completedDates.includes(dateStr))
}

// Extra daily affirmations (beyond base 3)
export function getTodayExtraCount(): number {
  const data = safeGet<{ date: string; count: number }>(KEYS.TODAY_EXTRA, { date: '', count: 0 })
  const today = todayStr()
  if (data.date !== today) return 0
  return data.count
}

export function incrementTodayExtraCount(): void {
  const today = todayStr()
  const current = getTodayExtraCount()
  safeSet(KEYS.TODAY_EXTRA, { date: today, count: current + 1 })
}

// Alarm settings (legacy single alarm — kept for backward compat)
export function getAlarmSettings(): AlarmSettings | null {
  return safeGet<AlarmSettings | null>(KEYS.ALARM, null)
}

export function saveAlarmSettings(s: AlarmSettings): void {
  safeSet(KEYS.ALARM, s)
}

export function clearAlarmSettings(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEYS.ALARM)
}

// Alarm list (multiple alarms)
export function getAlarmList(): AlarmEntry[] {
  const list = safeGet<AlarmEntry[]>(KEYS.ALARM_LIST, [])
  if (list.length === 0) {
    // Migrate legacy single alarm
    const old = getAlarmSettings()
    if (old && (old.affirmationId || old.audioId)) {
      const entry: AlarmEntry = { ...old, id: 'alarm-legacy' }
      safeSet(KEYS.ALARM_LIST, [entry])
      return [entry]
    }
  }
  return list
}

export function saveAlarmList(list: AlarmEntry[]): void {
  safeSet(KEYS.ALARM_LIST, list)
}

export function deleteAlarmById(id: string): void {
  saveAlarmList(getAlarmList().filter((a) => a.id !== id))
}

export function getAlarmLastShown(): string {
  return safeGet<string>(KEYS.ALARM_LAST_SHOWN, '')
}

export function setAlarmLastShown(dateStr: string): void {
  safeSet(KEYS.ALARM_LAST_SHOWN, dateStr)
}

// Naege (나에게) seen date — tracks whether the page was auto-shown today
export function getNaegeSeenDate(): string | null {
  return safeGet<string | null>(KEYS.NAEGE_SEEN_DATE, null)
}

export function setNaegeSeenDate(dateStr: string): void {
  safeSet(KEYS.NAEGE_SEEN_DATE, dateStr)
}

// Day notes ("오늘의 나에게" messages)
export function getDayNotes(): Record<string, string> {
  return safeGet<Record<string, string>>(KEYS.DAY_NOTES, {})
}

export function getDayNote(dateStr: string): string | null {
  const notes = getDayNotes()
  return notes[dateStr] ?? null
}

export function saveDayNote(dateStr: string, message: string): void {
  const notes = getDayNotes()
  notes[dateStr] = message
  safeSet(KEYS.DAY_NOTES, notes)
}

// Weekly shields tracking (Sun-Sat week completion)
export function getWeeklyShields(): string[] {
  return safeGet<string[]>(KEYS.WEEKLY_SHIELDS, [])
}

export function saveWeeklyShields(weeks: string[]): void {
  safeSet(KEYS.WEEKLY_SHIELDS, weeks)
}

// Weekly report shown tracking
export function getWeeklyReportShown(): string {
  return safeGet<string>(KEYS.WEEKLY_REPORT_SHOWN, '')
}

export function setWeeklyReportShown(weekKey: string): void {
  safeSet(KEYS.WEEKLY_REPORT_SHOWN, weekKey)
}

// Week key (Sunday of the given date's week)
export function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

// Today repeat done
export function getTodayRepeatDone(): boolean {
  const data = safeGet<{ date: string }>(KEYS.TODAY_REPEAT_DONE, { date: '' })
  return data.date === todayStr()
}

export function setTodayRepeatDone(): void {
  safeSet(KEYS.TODAY_REPEAT_DONE, { date: todayStr() })
}

// Home display settings
export function getHomeDisplaySettings(): { showRecentRec: boolean; showSuccessImg: boolean; showCalendar: boolean } {
  return {
    showRecentRec: safeGet<boolean>(KEYS.SHOW_RECENT_REC, true),
    showSuccessImg: safeGet<boolean>(KEYS.SHOW_SUCCESS_IMG, true),
    showCalendar: safeGet<boolean>(KEYS.SHOW_CALENDAR, true),
  }
}

export function setHomeDisplaySetting(key: 'showRecentRec' | 'showSuccessImg' | 'showCalendar', val: boolean): void {
  const map: Record<string, string> = {
    showRecentRec: KEYS.SHOW_RECENT_REC,
    showSuccessImg: KEYS.SHOW_SUCCESS_IMG,
    showCalendar: KEYS.SHOW_CALENDAR,
  }
  safeSet(map[key], val)
}

// Delete a specific date from calendar + affirmation completedDates
export function deleteDayRecord(date: string): void {
  const list = getCalendar().filter((r) => r.date !== date)
  safeSet(KEYS.CALENDAR, list)
  const affs = getAffirmations().map((a) => ({
    ...a,
    completedDates: a.completedDates.filter((d) => d !== date),
  }))
  safeSet(KEYS.AFFIRMATIONS, affs)
}

// Clear all data
export function clearAllData(): void {
  if (typeof window === 'undefined') return
  try {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
