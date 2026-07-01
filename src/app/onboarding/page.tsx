'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sprout, Briefcase, TrendingUp, Heart, Leaf, Flame, Moon, Sun, type LucideIcon } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { saveAffirmation, setOnboarded, saveTodayAffirmationIds, saveAlarmList, saveDayRecord, todayStr, saveStreakData, saveCategories } from '@/lib/storage'
import { saveAudioRecord } from '@/lib/audioStorage'
import { useTheme } from '@/lib/themeContext'

/* ── Design tokens (warm gold) ───────────────────────────────── */
const T = {
  bg: '#faf4ea',
  bgSoft: '#f6edda',
  bgSink: '#f1e6cf',
  line: '#e7d8bb',
  gold: '#bd821f',
  goldDeep: '#a36c14',
  goldTint: '#f3e6c8',
  ink: '#2c2314',
  ink2: '#6f5f44',
  ink3: '#a08c68',
  onDark: '#f6efe0',
  onDark2: '#c7b48d',
}

const CAT_ICONS: Record<string, LucideIcon> = {
  '나 자신': Sprout, '일과 커리어': Briefcase, '돈과 풍요': TrendingUp,
  '관계와 사랑': Heart, '건강과 몸': Leaf, '용기와 도전': Flame,
  '마음과 평온': Moon, '오늘 하루': Sun,
}

const SUGGESTIONS: Record<string, string[]> = {
  '나 자신': ['나는 나를 있는 그대로 존중한다.', '나는 매일 조금씩 성장한다.'],
  '일과 커리어': ['나는 내 일에서 가치를 만든다.', '나는 기회를 끌어당긴다.'],
  '돈과 풍요': ['나는 풍요를 누릴 자격이 있다.', '돈은 나에게 편안하게 흐른다.'],
  '관계와 사랑': ['나는 따뜻한 관계를 만든다.', '나는 사랑을 주고받는다.'],
  '건강과 몸': ['나는 내 몸을 소중히 돌본다.', '나는 건강한 에너지로 가득하다.'],
  '용기와 도전': ['나는 두려움보다 크다.', '나는 모든 도전에 용기 있게 맞선다.'],
  '마음과 평온': ['나는 평온한 마음을 지킨다.', '나는 내 마음을 평화로 가득 채운다.'],
  '오늘 하루': ['나는 오늘 하루를 긍정으로 시작한다.', '나는 오늘을 소중히 보낸다.'],
}

function getPhrase(cats: string[]): string {
  const c = cats[0]
  return (c && SUGGESTIONS[c]?.[1]) ?? '나는 매일 성장한다.'
}

function fmtTime(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  const ampm = h < 12 ? '오전' : '오후'
  const hh = ((h + 11) % 12) + 1
  return `${ampm} ${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

/* ── Button styles ───────────────────────────────────────────── */
const btnBase: React.CSSProperties = {
  width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 17, fontWeight: 700, borderRadius: 16, padding: '18px 20px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  transition: 'opacity .15s, background .15s',
}
const btnPrimary: React.CSSProperties = {
  ...btnBase, background: T.gold, color: '#fff',
  boxShadow: '0 8px 20px -8px rgba(189,130,31,.7)',
}
const btnDisabled: React.CSSProperties = {
  ...btnBase, background: T.bgSink, color: T.ink3, cursor: 'not-allowed', boxShadow: 'none',
}
const btnText: React.CSSProperties = {
  ...btnBase, background: 'transparent', color: T.ink3, fontSize: 15, padding: '14px', fontWeight: 600,
}

/* ── Icons ───────────────────────────────────────────────────── */
function SeedIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V11M12 11C12 8 10 5 5 5c0 5 3 6 7 6M12 11c0-3 2-5 7-5 0 4-3 5-7 5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  )
}

function PlayIcon() {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
}

function MicIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

const ALL_ENCOURAGEMENTS = [
  '당신의 말에는 힘이 있어요.',
  '당신이 말하는 대로 이루어져요.',
  '용기 있어요! 계속 나아가요!',
  '당신은 정말 해낼 수 있어요!',
  '성공의 말이 당신의 삶을 바꿀 거예요!',
]

const MANUAL_ENCOURAGEMENTS = [
  '용기 있어요! 계속 나아가요!',
  '당신은 정말 해낼 수 있어요!',
]

/* ── Main component ──────────────────────────────────────────── */
type RecState = 'idle' | 'recording' | 'done'
type Dir = 'next' | 'back' | 'fade'

export default function OnboardingPage() {
  const router = useRouter()
  const { setTheme } = useTheme()

  const [cur, setCur] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [dir, setDir] = useState<Dir>('fade')
  const transRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const curRef = useRef(0)

  const [cats, setCats] = useState<string[]>([])
  const catsRef = useRef<string[]>([])
  const [rec, setRec] = useState<RecState>('idle')
  const [transcript, setTranscript] = useState('')
  const [notifTime, setNotifTime] = useState(480)
  const [notifAllowed, setNotifAllowed] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const recRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [recAffirmations, setRecAffirmations] = useState<string[]>([])
  const [encouragement, setEncouragement] = useState('')

  // Screen 2: camera + STT + recording refs
  const onbVideoRef = useRef<HTMLVideoElement>(null)
  const onbStreamRef = useRef<MediaStream | null>(null)   // video-only (camera)
  const onbAudioStreamRef = useRef<MediaStream | null>(null) // audio (recording)
  const onbRecorderRef = useRef<MediaRecorder | null>(null)
  const onbAudioChunksRef = useRef<Blob[]>([])
  const onbRecognitionRef = useRef<SpeechRecognition | null>(null)
  const onbShouldListenRef = useRef(false)
  const onbCumulativeRef = useRef<Set<string>>(new Set())
  const onbAutoCompleteRef = useRef(false)
  const onbAutoCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onbSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onbAudioBlobRef = useRef<Blob | null>(null)
  const onbAudioRef = useRef<HTMLAudioElement | null>(null)
  const [onbIsPlaying, setOnbIsPlaying] = useState(false)
  // 녹음↔성공의말↔알람 연결용 ID (마이크 탭 시 고정)
  const onbVoiceIdRef = useRef(`voice-${Date.now()}`)
  const onbAudioRecordIdRef = useRef(`onb-audio-${Date.now()}`)
  const [onbRecognizedWords, setOnbRecognizedWords] = useState<Set<string>>(new Set())
  const [onbIsListening, setOnbIsListening] = useState(false)
  const [onbPhrase, setOnbPhrase] = useState('나는 매일 성장한다.')
  const onbPhraseRef = useRef('나는 매일 성장한다.')
  const [onbIsSpeaking, setOnbIsSpeaking] = useState(false)

  const goTo = useCallback((n: number, d: Dir = 'next') => {
    if (transRef.current) clearTimeout(transRef.current)
    setPrev(curRef.current)
    setCur(n)
    curRef.current = n
    setDir(d)
    transRef.current = setTimeout(() => setPrev(null), 450)
  }, [])

  useEffect(() => () => {
    if (recRef.current) clearTimeout(recRef.current)
    if (transRef.current) clearTimeout(transRef.current)
    if (onbAutoCompleteTimerRef.current) clearTimeout(onbAutoCompleteTimerRef.current)
    if (onbSpeakTimerRef.current) clearTimeout(onbSpeakTimerRef.current)
  }, [])

  useEffect(() => {
    if (cur !== 2 || cats.length === 0) return
    const cat = cats[0]
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat }),
    })
      .then((r) => r.json())
      .then((data: { affirmations: string[] }) => {
        setRecAffirmations(data.affirmations.slice(0, 3))
      })
      .catch(() => {
        setRecAffirmations(['나는 오늘도 잘 해낼 수 있다.', '나는 성장하고 있다.', '나는 충분히 가치 있다.'])
      })
  }, [cur, cats])

  const toggleCat = (cat: string) =>
    setCats((p) => {
      const next = p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]
      catsRef.current = next
      return next
    })

  // STT for screen 2 — must be declared before finishRec (TDZ 방지)
  const startOnbSTT = useCallback(() => {
    if (typeof window === 'undefined') return
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRec) return

    if (onbRecognitionRef.current) {
      try { onbRecognitionRef.current.stop() } catch { /* ignore */ }
      onbRecognitionRef.current = null
    }

    const recognition = new SpeechRec()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    onbRecognitionRef.current = recognition

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .toLowerCase()

      setOnbIsSpeaking(true)
      if (onbSpeakTimerRef.current) clearTimeout(onbSpeakTimerRef.current)
      onbSpeakTimerRef.current = setTimeout(() => setOnbIsSpeaking(false), 800)

      const clean = (w: string) => w.replace(/[.,!?。、。·]/g, '').toLowerCase()
      const words = onbPhraseRef.current.split(' ')
      const transcriptWords = transcript.split(/\s+/).map(clean)
      words.forEach((word) => {
        const lw = clean(word)
        if (!lw) return
        if (transcriptWords.some((tw) => tw === lw || tw.startsWith(lw) || lw.startsWith(tw))) {
          onbCumulativeRef.current.add(word)
        }
      })
      setOnbRecognizedWords(new Set(onbCumulativeRef.current))
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!onbShouldListenRef.current) return
      if (event.error === 'not-allowed') { setOnbIsListening(false); return }
      setTimeout(() => { if (onbShouldListenRef.current) startOnbSTT() }, 200)
    }

    recognition.onend = () => {
      setTimeout(() => { if (onbShouldListenRef.current) startOnbSTT() }, 100)
    }

    try {
      recognition.start()
      setOnbIsListening(true)
    } catch {
      setTimeout(() => { if (onbShouldListenRef.current) startOnbSTT() }, 300)
    }
  }, [])

  const finishRec = useCallback(() => {
    if (recRef.current) clearTimeout(recRef.current)
    if (onbAutoCompleteTimerRef.current) clearTimeout(onbAutoCompleteTimerRef.current)

    // Stop STT
    onbShouldListenRef.current = false
    if (onbRecognitionRef.current) {
      try { onbRecognitionRef.current.stop() } catch { /* ignore */ }
      onbRecognitionRef.current = null
    }

    // Stop recorder — onstop은 생성 시점에 이미 설정되어 있음
    if (onbRecorderRef.current && onbRecorderRef.current.state !== 'inactive') {
      onbRecorderRef.current.stop()
    }

    setTranscript(onbPhraseRef.current)
    const pool = onbAutoCompleteRef.current ? ALL_ENCOURAGEMENTS : MANUAL_ENCOURAGEMENTS
    setEncouragement(pool[Math.floor(Math.random() * pool.length)])
    setRec('done')
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#bd821f', '#e8c878', '#f3e6c8', '#ffffff'] })
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 50, origin: { x: 0, y: 0.6 }, colors: ['#bd821f', '#FFD700'] }), 300)
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 50, origin: { x: 1, y: 0.6 }, colors: ['#bd821f', '#FFD700'] }), 500)
    }).catch(() => {})
  }, [])

  // 마이크 버튼 탭 → 녹음 + STT 시작 (사용자 제스처로 getUserMedia 호출)
  const handleMicTap = useCallback(async () => {
    onbCumulativeRef.current = new Set()
    onbAutoCompleteRef.current = false
    setOnbRecognizedWords(new Set())
    setRec('recording')

    // 녹음마다 새 ID 쌍 고정 (성공의말·녹음·알람 모두 동일 ID로 연결)
    const voiceId = `voice-${Date.now()}`
    const audioRecordId = `onb-audio-${Date.now()}`
    onbVoiceIdRef.current = voiceId
    onbAudioRecordIdRef.current = audioRecordId

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      onbAudioStreamRef.current = audioStream
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined)
      onbAudioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) onbAudioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const blob = new Blob(onbAudioChunksRef.current, { type: mimeType || 'audio/webm' })
        if (blob.size > 0) {
          onbAudioBlobRef.current = blob
          try {
            await saveAudioRecord({
              id: onbAudioRecordIdRef.current,
              affirmationId: onbVoiceIdRef.current, // 성공의말 ID와 일치
              affirmationText: onbPhraseRef.current,
              blob,
              createdAt: Date.now(),
              keepForever: true, // 온보딩 녹음은 영구 보관
            })
          } catch { /* ignore */ }
        }
        audioStream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      onbRecorderRef.current = recorder
    } catch { /* mic denied */ }

    onbShouldListenRef.current = true
    startOnbSTT()
  }, [startOnbSTT])

  // 화면 2 진입: 카메라(비디오 전용)만 시작. 녹음은 마이크 버튼 탭 시 시작
  useEffect(() => {
    if (cur !== 2) {
      // 화면 벗어날 때 모두 정리
      onbShouldListenRef.current = false
      if (onbRecognitionRef.current) {
        try { onbRecognitionRef.current.stop() } catch { /* ignore */ }
        onbRecognitionRef.current = null
      }
      if (onbRecorderRef.current && onbRecorderRef.current.state !== 'inactive') {
        try { onbRecorderRef.current.stop() } catch { /* ignore */ }
      }
      if (onbStreamRef.current) {
        onbStreamRef.current.getTracks().forEach((t) => t.stop())
        onbStreamRef.current = null
      }
      if (onbAudioStreamRef.current) {
        onbAudioStreamRef.current.getTracks().forEach((t) => t.stop())
        onbAudioStreamRef.current = null
      }
      setOnbIsListening(false)
      return
    }

    setRec('idle')
    setTranscript('')
    onbCumulativeRef.current = new Set()
    onbAutoCompleteRef.current = false
    setOnbRecognizedWords(new Set())

    // 화면 1에서 추천된 성공의 말(SUGGESTIONS[cat][0])만 풀로 사용
    const pool: string[] = catsRef.current
      .map((cat) => SUGGESTIONS[cat]?.[0])
      .filter(Boolean) as string[]
    const picked = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : '나는 매일 성장한다.'
    onbPhraseRef.current = picked
    setOnbPhrase(picked)

    // 카메라만 먼저 시작 (오디오 없이)
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        onbStreamRef.current = stream
        if (onbVideoRef.current) {
          onbVideoRef.current.srcObject = stream
          onbVideoRef.current.play().catch(() => {})
        }
      })
      .catch(() => {})

    return () => {
      onbShouldListenRef.current = false
      if (onbRecognitionRef.current) {
        try { onbRecognitionRef.current.stop() } catch { /* ignore */ }
        onbRecognitionRef.current = null
      }
      if (onbRecorderRef.current && onbRecorderRef.current.state !== 'inactive') {
        try { onbRecorderRef.current.stop() } catch { /* ignore */ }
      }
      if (onbStreamRef.current) {
        onbStreamRef.current.getTracks().forEach((t) => t.stop())
        onbStreamRef.current = null
      }
      if (onbAudioStreamRef.current) {
        onbAudioStreamRef.current.getTracks().forEach((t) => t.stop())
        onbAudioStreamRef.current = null
      }
      setOnbIsListening(false)
    }
  }, [cur])

  // Auto-complete when all words recognized
  useEffect(() => {
    if (rec !== 'recording') return
    if (onbAutoCompleteRef.current) return
    const words = onbPhraseRef.current.split(' ').filter(Boolean)
    const allRecognized = words.every((w) => onbRecognizedWords.has(w))
    if (words.length > 0 && allRecognized) {
      onbAutoCompleteRef.current = true
      onbAutoCompleteTimerRef.current = setTimeout(() => finishRec(), 600)
    }
  }, [onbRecognizedWords, rec, finishRec])

  const handleReRecord = useCallback(() => {
    // STT 중단
    onbShouldListenRef.current = false
    if (onbRecognitionRef.current) {
      try { onbRecognitionRef.current.stop() } catch { /* ignore */ }
      onbRecognitionRef.current = null
    }
    // 오디오 스트림 중단
    if (onbAudioStreamRef.current) {
      onbAudioStreamRef.current.getTracks().forEach((t) => t.stop())
      onbAudioStreamRef.current = null
    }
    setTranscript('')
    onbAutoCompleteRef.current = false
    onbCumulativeRef.current = new Set()
    setOnbRecognizedWords(new Set())
    setOnbIsListening(false)
    setRec('idle') // 마이크 버튼 화면으로 돌아가기
  }, [])

  const handleFinish = async () => {
    if (isFinishing) return
    setIsFinishing(true)
    const affText = transcript || onbPhraseRef.current
    const category = cats[0] ?? '나 자신'

    const now = Date.now()
    const ids: string[] = []

    // 1. 녹음한 성공의 말 — 온보딩 마이크 탭 시 고정된 ID 사용 (녹음과 연결)
    const today = todayStr()
    const voiceId = onbVoiceIdRef.current || `voice-${now}`
    saveAffirmation({ id: voiceId, text: affText, category, createdAt: new Date().toISOString(), completedDates: [today] })
    saveDayRecord({ date: today, completedCount: 1, dominantCategory: category })
    ids.push(voiceId)

    if (notifAllowed) {
      saveAlarmList([{ id: 'alarm-onboarding', affirmationId: '', audioId: onbAudioRecordIdRef.current, hour: Math.floor(notifTime / 60), minute: notifTime % 60, repeatDays: [], endType: 'none', endDate: '', endCount: 0, firedCount: 0 }])
      import('@/lib/alarmScheduler').then(({ registerSW, scheduleAlarm }) =>
        registerSW().then(() => scheduleAlarm()).catch(() => {})
      ).catch(() => {})
    }

    // 2. 화면 1에서 추천된 성공의 말 — 선택한 카테고리당 1개씩만
    cats.forEach((cat, i) => {
      const suggestion = SUGGESTIONS[cat]?.[0]
      if (suggestion && suggestion !== affText) {
        const id = `suggestion-${now}-${i}`
        saveAffirmation({ id, text: suggestion, category: cat, createdAt: new Date().toISOString(), completedDates: [] })
        ids.push(id)
      }
    })

    saveTodayAffirmationIds(ids.slice(0, 3))
    saveCategories(cats)
    saveStreakData({ currentStreak: 0, lastCompletedDate: null, shields: 1 })
    setTheme('warm')
    setOnboarded()
    router.push('/home')
  }

  const TIME_PRESETS = [360, 420, 480, 540, 600, 660]
  const phrase = transcript || onbPhrase
  const onbWords = onbPhrase.split(' ')

  const renderScreen = (idx: number) => {
    switch (idx) {
      /* ── 0: Welcome ───────────────────────────────────────────── */
      case 0: return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 32px', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, marginBottom: 18,
              background: 'linear-gradient(150deg, #d79a36, #b5750f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SeedIcon size={30} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.6px', color: T.ink, lineHeight: 1.28 }}>안녕하세요 :)</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.6px', color: T.gold, lineHeight: 1.28 }}>저는 '이뤄'예요.</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: T.ink2, lineHeight: 1.55, marginTop: 4 }}>
              성공의 말을 자주 하면 이루어진다.
            </div>
          </div>
          <div style={{ padding: '12px 26px 48px' }}>
            <button style={btnPrimary} onClick={() => goTo(1)}>좋아요, 시작할게요</button>
          </div>
        </div>
      )

      /* ── 1: Category chips ────────────────────────────────────── */
      case 1: return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 26px', overflow: 'hidden' }}>
            <div style={{ paddingTop: 48, marginBottom: 10 }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.6px', color: T.ink, lineHeight: 1.28, marginBottom: 10 }}>
                어떤 성공을<br />이루고 싶으세요?
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: T.ink2, marginBottom: 20 }}>3개 이상 눌러주세요.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((cat) => {
                  const on = cats.includes(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCat(cat)}
                      style={{
                        border: `1.5px solid ${on ? T.gold : T.line}`,
                        background: on ? T.gold : T.bgSoft,
                        color: on ? '#fff' : T.ink2,
                        borderRadius: 999, padding: '9px 15px',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'transform .12s, border-color .15s, background .15s, color .15s',
                      }}
                    >
                      <span style={{ marginRight: 5, display: 'inline-flex', alignItems: 'center' }}>{(() => { const Icon = CAT_ICONS[cat]; return Icon && <Icon size={12} /> })()}</span>{cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 선택한 카테고리별 추천 성공의 말 */}
            {cats.length > 0 && (
              <div style={{ marginTop: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 2 }}>추천 성공의 말</div>
                {cats.map((cat) => {
                  const suggestion = SUGGESTIONS[cat]?.[0]
                  if (!suggestion) return null
                  return (
                    <div key={cat} style={{
                      background: T.bgSoft,
                      border: `1.5px solid ${T.line}`,
                      borderRadius: 16, padding: '14px 16px',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {(() => { const Icon = CAT_ICONS[cat]; return Icon && <Icon size={11} /> })()} {cat}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, lineHeight: 1.5 }}>
                        &ldquo;{suggestion}&rdquo;
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ padding: '12px 26px 48px' }}>
            <button
              style={cats.length >= 3 ? btnPrimary : btnDisabled}
              disabled={cats.length < 3}
              onClick={() => goTo(2)}
            >
              다음
            </button>
          </div>
        </div>
      )

      /* ── 2: Voice recording — full-screen camera like speak page ── */
      case 2: return (
        <div style={{ position: 'relative', height: '100%', background: '#1a140a', overflow: 'hidden' }}>
          {/* Full-screen camera */}
          <video
            ref={onbVideoRef}
            autoPlay playsInline muted
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', transform: 'scaleX(-1)',
            }}
          />

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.65) 100%)',
          }} />

          {/* Speaking glow */}
          {onbIsSpeaking && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              boxShadow: `inset 0 0 60px rgba(189,130,31,0.3)`,
              transition: 'opacity 0.2s',
            }} />
          )}

          {/* Top: title */}
          <div style={{ position: 'absolute', top: 22, left: 22, right: 22, zIndex: 3, textAlign: 'center' }}>
            {rec === 'done' ? (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                잘 했어요!
              </div>
            ) : rec === 'recording' ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(194,85,46,.9)', color: '#fff',
                fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
              }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block',
                  animation: 'onbRecBlink 1s steps(2,end) infinite' }} />
                녹음 중 · 듣고 있어요
              </div>
            ) : (
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                마이크를 눌러서 소리내어 말해보세요
              </div>
            )}
          </div>

          {/* idle: 문장 + 큰 마이크 버튼 */}
          {rec === 'idle' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 32px',
              gap: 32,
            }}>
              <div style={{
                background: 'rgba(20,14,4,.7)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(232,200,120,.3)', borderRadius: 18, padding: '18px 22px',
                width: '100%', textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'rgba(232,200,120,.75)', fontWeight: 600, letterSpacing: '.4px', marginBottom: 8 }}>
                  이 문장을 소리 내어 읽어보세요
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.5 }}>
                  &ldquo;{onbPhrase}&rdquo;
                </div>
              </div>
              {/* 마이크 버튼 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <button
                  onClick={handleMicTap}
                  style={{
                    width: 84, height: 84, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: T.gold, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 10px rgba(189,130,31,0.22), 0 16px 32px -10px rgba(0,0,0,0.6)',
                    transition: 'transform .12s',
                  }}
                >
                  <MicIcon size={38} />
                </button>
              </div>
            </div>
          )}

          {/* recording: 단어 하이라이트 */}
          {rec === 'recording' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 24px',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {onbWords.map((word, i) => (
                  <span key={i} style={{
                    fontSize: 22, fontWeight: 600, padding: '6px 12px', borderRadius: 10,
                    background: onbRecognizedWords.has(word) ? T.gold : 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    transition: 'all 0.3s ease',
                    boxShadow: onbRecognizedWords.has(word) ? '0 4px 12px rgba(189,130,31,0.5)' : 'none',
                  }}>
                    {word}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                {onbIsListening && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} style={{
                        width: 3, borderRadius: 2,
                        background: onbIsSpeaking ? T.gold : 'rgba(255,255,255,0.5)',
                        animation: onbIsSpeaking ? `waveBar 0.4s ease-in-out ${i * 0.08}s infinite` : 'none',
                        height: onbIsSpeaking ? undefined : 4,
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                )}
                <span>{onbIsSpeaking ? '인식 중...' : '듣고 있어요...'}</span>
              </div>
            </div>
          )}

          {/* done: 완료 카드 */}
          {rec === 'done' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '80px 24px 200px',
              gap: 12,
            }}>
              <div style={{
                width: '100%', background: 'rgba(20,14,4,.85)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(232,200,120,.45)', borderRadius: 20, padding: '22px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,200,120,.7)', letterSpacing: '.4px', marginBottom: 8 }}>
                  당신의 첫 성공의 말이에요
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.45, color: '#fff', marginBottom: 14 }}>
                  &ldquo;{transcript}&rdquo;
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e8c878' }}>{encouragement}</div>
                  {onbAudioBlobRef.current && (
                    <button
                      onClick={() => {
                        if (onbIsPlaying) {
                          onbAudioRef.current?.pause()
                          if (onbAudioRef.current) onbAudioRef.current.currentTime = 0
                          setOnbIsPlaying(false)
                          return
                        }
                        const url = URL.createObjectURL(onbAudioBlobRef.current!)
                        const audio = new Audio(url)
                        onbAudioRef.current = audio
                        setOnbIsPlaying(true)
                        audio.onended = () => { setOnbIsPlaying(false); URL.revokeObjectURL(url) }
                        audio.onerror = () => { setOnbIsPlaying(false); URL.revokeObjectURL(url) }
                        audio.play().catch(() => setOnbIsPlaying(false))
                      }}
                      style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: onbIsPlaying ? 'rgba(232,200,120,.25)' : T.gold,
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {onbIsPlaying ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="3" y="2" width="4" height="12" rx="1.5"/>
                          <rect x="9" y="2" width="4" height="12" rx="1.5"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5 3.5l8 4.5-8 4.5V3.5z"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom buttons */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4,
            padding: '16px 26px 48px',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 60%, transparent 100%)',
          }}>
            {rec === 'done' ? (
              <>
                <button style={btnPrimary} onClick={() => goTo(3)}>다음</button>
                <button
                  style={{ ...btnText, color: 'rgba(255,255,255,0.65)' }}
                  onClick={handleReRecord}
                >
                  다시 말하기
                </button>
              </>
            ) : rec === 'recording' ? (
              <button
                style={{
                  ...btnBase,
                  background: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  backdropFilter: 'blur(8px)',
                }}
                onClick={finishRec}
              >
                완료
              </button>
            ) : null}
          </div>
        </div>
      )

      /* ── 3: Notification + time ───────────────────────────────── */
      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', gap: 22 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: T.goldTint, color: T.gold,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BellIcon />
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.6px', color: T.ink, lineHeight: 1.28, marginBottom: 10 }}>
                매일, 성공의 말로<br />하루를 시작하세요
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: T.ink2, lineHeight: 1.55 }}>
                알림을 켜면 정한 시간에 오늘의 성공의 말을 보내드려요.
              </div>
            </div>
            <div style={{ background: T.bgSoft, border: `1.5px solid ${T.line}`, borderRadius: 16, padding: '18px 18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: T.ink2, fontWeight: 600, fontSize: 14 }}>
                <ClockIcon /> 알림 시간
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.ink2 }}>
                  {notifTime < 720 ? '오전' : '오후'}
                </span>
                <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-1px', color: T.ink, fontVariantNumeric: 'tabular-nums' }}>
                  {(() => {
                    const h = Math.floor(notifTime / 60), m = notifTime % 60
                    const hh = ((h + 11) % 12) + 1
                    return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setNotifTime(p)}
                    style={{
                      border: `1.5px solid ${notifTime === p ? T.gold : T.line}`,
                      background: notifTime === p ? T.gold : T.bgSoft,
                      color: notifTime === p ? '#fff' : T.ink2,
                      borderRadius: 999, padding: '9px 15px',
                      fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'border-color .15s, background .15s, color .15s',
                    }}
                  >
                    {fmtTime(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 26px 48px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              style={btnPrimary}
              onClick={async () => {
                let allowed = typeof Notification !== 'undefined' && Notification.permission === 'granted'
                if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                  const result = await Notification.requestPermission()
                  allowed = result === 'granted'
                }
                setNotifAllowed(allowed)
                goTo(4)
              }}
            >
              알림 허용하기
            </button>
            <button style={btnText} onClick={() => goTo(4)}>나중에 할게요</button>
          </div>
        </div>
      )

      /* ── 4: Done ──────────────────────────────────────────────── */
      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', gap: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.4px', color: T.gold }}>말하면, 이루어진다.</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.6px', color: T.ink, lineHeight: 1.28 }}>
              당신의 첫<br />성공의 말이에요.
            </div>
            <div style={{ borderRadius: 22, padding: '26px 24px', background: T.goldTint }}>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.42, letterSpacing: '-0.4px', color: T.ink, marginBottom: 22 }}>
                {phrase}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 26 }}>
                  {[40, 70, 55, 90, 60, 80, 45].map((pct, k) => (
                    <span key={k} style={{
                      display: 'block', width: 4, borderRadius: 2, background: T.gold,
                      height: onbIsPlaying ? undefined : `${pct}%`,
                      minHeight: onbIsPlaying ? 4 : undefined,
                      animation: onbIsPlaying ? `waveBar 0.45s ease-in-out ${k * 0.07}s infinite` : 'none',
                      transition: 'height 0.2s',
                    }} />
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!onbAudioBlobRef.current) return
                    if (onbIsPlaying) {
                      onbAudioRef.current?.pause()
                      if (onbAudioRef.current) onbAudioRef.current.currentTime = 0
                      setOnbIsPlaying(false)
                      return
                    }
                    const url = URL.createObjectURL(onbAudioBlobRef.current)
                    const audio = new Audio(url)
                    onbAudioRef.current = audio
                    setOnbIsPlaying(true)
                    audio.onended = () => { setOnbIsPlaying(false); URL.revokeObjectURL(url) }
                    audio.onerror = () => { setOnbIsPlaying(false); URL.revokeObjectURL(url) }
                    audio.play().catch(() => setOnbIsPlaying(false))
                  }}
                  style={{
                    width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: T.gold, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 22px -8px rgba(189,130,31,.8)',
                  }}
                >
                  {onbIsPlaying ? (
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="3" y="2" width="4" height="12" rx="1.5"/>
                      <rect x="9" y="2" width="4" height="12" rx="1.5"/>
                    </svg>
                  ) : (
                    <PlayIcon />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 26px 48px' }}>
            <button
              style={isFinishing ? btnDisabled : btnPrimary}
              disabled={isFinishing}
              onClick={handleFinish}
            >
              {isFinishing ? '준비하는 중…' : '이뤄 시작하기'}
            </button>
          </div>
        </div>
      )

      default: return null
    }
  }

  const outClass = dir === 'back' ? 'onb-out-back' : 'onb-out-next'
  const inClass = dir === 'fade' ? 'onb-in-fade' : dir === 'back' ? 'onb-in-back' : 'onb-in-next'

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100dvh',
      background: T.bg, overflow: 'hidden',
      fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {prev !== null && (
        <div key={`p${prev}`} className={`onb-scr ${outClass}`}>{renderScreen(prev)}</div>
      )}
      <div key={`c${cur}`} className={`onb-scr ${inClass}`}>{renderScreen(cur)}</div>
    </div>
  )
}
