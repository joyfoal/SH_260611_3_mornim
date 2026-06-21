'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { DynamicText } from '@/components/ui/DynamicText'
import { CelebrationScreen, type CelebrationVariant } from '@/components/ui/CelebrationScreen'
import {
  getAffirmations,
  updateAffirmation,
  getDayRecord,
  saveDayRecord,
  isTomorrowEnabled,
  todayStr,
  setTodayRepeatDone,
  getNaegeSeenDate,
  type Affirmation,
} from '@/lib/storage'
import { updateStreak } from '@/lib/streak'
import { saveAudioRecord, getAudioRecords, deleteAudioRecordsByAffirmationId } from '@/lib/audioStorage'

type SpeakPhase = 'initial' | 'extra' | 'repeat'

function useSwipeUp(onSwipeUp: () => void) {
  const startY = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startY.current - e.changedTouches[0].clientY > 50) onSwipeUp()
  }
  return { handleTouchStart, handleTouchEnd }
}

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function SpeakPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [screen, setScreen] = useState<'text' | 'speak' | 'celebration'>('text')
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [queue, setQueue] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [recognizedWords, setRecognizedWords] = useState<Set<string>>(new Set())
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [celebrationVariant, setCelebrationVariant] = useState<CelebrationVariant>('progress')

  // Re-record state: idle | recording | confirm
  const [reRecordState, setReRecordState] = useState<'idle' | 'recording' | 'confirm'>('idle')
  const [hasExistingRecording, setHasExistingRecording] = useState(false)
  const hasExistingRecordingRef = useRef(false)
  const reRecordBlobRef = useRef<Blob | null>(null)
  const reRecordRecorderRef = useRef<MediaRecorder | null>(null)
  const reRecordChunksRef = useRef<Blob[]>([])
  const reRecordStreamRef = useRef<MediaStream | null>(null)
  const prewarmStreamRef = useRef<MediaStream | null>(null)

  const [isRecording, setIsRecording] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const shouldListenRef = useRef(false)
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedCountRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const pendingAffirmationRef = useRef<Affirmation | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const speakPhaseRef = useRef<SpeakPhase>('initial')
  const autoCompleteTriggeredRef = useRef(false)
  const autoCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cumulativeRecognizedRef = useRef<Set<string>>(new Set())

  // queue / currentIndex를 ref로도 유지 — handleComplete 클로저에서 최신값 사용
  const queueRef = useRef<string[]>([])
  const currentIndexRef = useRef(0)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedQueue = sessionStorage.getItem('mornim-speak-queue')
    const storedIndex = sessionStorage.getItem('mornim-speak-index')
    const storedPhase = sessionStorage.getItem('mornim-speak-phase') as SpeakPhase | null
    const q = storedQueue ? (JSON.parse(storedQueue) as string[]) : []
    const idx = storedIndex ? parseInt(storedIndex) : 0
    if (storedPhase) speakPhaseRef.current = storedPhase
    setQueue(q)
    setCurrentIndex(idx)
    const idFromParam = searchParams.get('id')
    const affirmId = q[idx] ?? idFromParam
    if (affirmId) {
      const all = getAffirmations()
      const found = all.find((a) => a.id === affirmId)
      setAffirmation(found ?? null)
    }
    setDataLoaded(true)
  }, [searchParams])

  useEffect(() => {
    if (!affirmation) return
    getAudioRecords().then((records) => {
      const has = records.some(
        (r) => r.affirmationId === affirmation.id || r.affirmationText === affirmation.text
      )
      hasExistingRecordingRef.current = has
      setHasExistingRecording(has)
    }).catch(() => {
      hasExistingRecordingRef.current = false
      setHasExistingRecording(false)
    })
  }, [affirmation])

  useEffect(() => {
    if (!dataLoaded || affirmation !== null) return
    const timer = setTimeout(() => router.replace('/home'), 3000)
    return () => clearTimeout(timer)
  }, [dataLoaded, affirmation, router])

  // 오디오 스트림 사전 확보 — 화면 전환 전에 미리 권한 획득
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => { prewarmStreamRef.current = stream })
      .catch(() => {})
    return () => {
      prewarmStreamRef.current?.getTracks().forEach((t) => t.stop())
      prewarmStreamRef.current = null
    }
  }, [])

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = videoStream
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream
        videoRef.current.play().catch(() => {})
      }
    } catch { /* 카메라 권한 없음 */ }

    if (!hasExistingRecordingRef.current) {
      try {
        const audioStream = prewarmStreamRef.current
          ?? await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        prewarmStreamRef.current = null
        audioStreamRef.current = audioStream
        const mimeType = getSupportedMimeType()
        const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined)
        audioChunksRef.current = []
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
        recorder.onstart = () => setIsRecording(true)
        recorder.onstop = async () => {
          setIsRecording(false)
          audioStreamRef.current?.getTracks().forEach((t) => t.stop())
          audioStreamRef.current = null
          const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
          const aff = pendingAffirmationRef.current
          if (aff && blob.size > 0 && !hasExistingRecordingRef.current) {
            try {
              await saveAudioRecord({
                id: `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                affirmationId: aff.id,
                affirmationText: aff.text,
                blob,
                createdAt: Date.now(),
                keepForever: true,
              })
            } catch { /* ignore */ }
          }
        }
        recorder.start(500)
        mediaRecorderRef.current = recorder
      } catch { /* 마이크 권한 없음 */ }
    }
  }, [])

  const startSTT = useCallback(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRec) return

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { }
      recognitionRef.current = null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRec()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[]).map((r: any) => r[0].transcript).join(' ').toLowerCase()
      setIsSpeaking(true)
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
      speakTimerRef.current = setTimeout(() => setIsSpeaking(false), 800)

      if (affirmation) {
        const clean = (w: string) => w.replace(/[.,!?。、。·]/g, '').toLowerCase()
        const words = affirmation.text.split(' ')
        const transcriptWords = transcript.split(/\s+/).map(clean)
        words.forEach((word) => {
          const lw = clean(word)
          if (!lw) return
          if (transcriptWords.some((tw) => tw === lw || tw.startsWith(lw) || lw.startsWith(tw))) {
            cumulativeRecognizedRef.current.add(word)
          }
        })
        setRecognizedWords(new Set(cumulativeRecognizedRef.current))
      }
    }

    recognition.onerror = (event: { error: string }) => {
      if (!shouldListenRef.current) return
      if (event.error === 'not-allowed') { setIsListening(false); return }
      setTimeout(() => { if (shouldListenRef.current) startSTT() }, 200)
    }

    recognition.onend = () => {
      setTimeout(() => { if (shouldListenRef.current) startSTT() }, 100)
    }

    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setTimeout(() => { if (shouldListenRef.current) startSTT() }, 300)
    }
  }, [affirmation])

  useEffect(() => {
    if (screen === 'speak') {
      shouldListenRef.current = true
      startCamera()
      startSTT()
    }
    return () => {
      shouldListenRef.current = false
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
      if (recognitionRef.current) recognitionRef.current.stop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop())
        audioStreamRef.current = null
      }
      if (reRecordRecorderRef.current && reRecordRecorderRef.current.state !== 'inactive') {
        try { reRecordRecorderRef.current.stop() } catch { }
      }
      if (reRecordStreamRef.current) {
        reRecordStreamRef.current.getTracks().forEach((t) => t.stop())
        reRecordStreamRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, startCamera, startSTT])

  const stopReRecord = useCallback(() => {
    if (reRecordRecorderRef.current && reRecordRecorderRef.current.state !== 'inactive') {
      reRecordRecorderRef.current.stop()
    }
  }, [])

  const handleComplete = useCallback(() => {
    if (!affirmation) return
    if (reRecordState === 'recording') {
      stopReRecord()
      return
    }
    pendingAffirmationRef.current = affirmation
    shouldListenRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { }
      recognitionRef.current = null
    }
    stopMediaRecorder()

    const today = todayStr()
    if (!affirmation.completedDates.includes(today)) {
      const updated = { ...affirmation, completedDates: [...affirmation.completedDates, today] }
      updateAffirmation(updated)
      const existing = getDayRecord(today)
      const newCount = (existing?.completedCount ?? 0) + 1
      saveDayRecord({ date: today, completedCount: newCount, dominantCategory: affirmation.category })
      completedCountRef.current = newCount
      if (newCount >= 3) updateStreak(true)
    }

    // 큐에 다음 항목이 있으면 progress, 없으면 phase에 따라 variant 결정
    const nextIndex = currentIndexRef.current + 1
    if (queueRef.current[nextIndex]) {
      setCelebrationVariant('progress')
    } else {
      const phase = speakPhaseRef.current
      if (phase === 'repeat') {
        const remaining: string[] = JSON.parse(sessionStorage.getItem('mornim-repeat-remaining') ?? '[]')
        if (remaining.length > 0) {
          setCelebrationVariant('repeat_batch_done')
        } else {
          sessionStorage.removeItem('mornim-repeat-remaining')
          setTodayRepeatDone()
          setCelebrationVariant('repeat_done')
        }
      } else {
        setCelebrationVariant('batch_done')
      }
    }

    setScreen('celebration')
  }, [affirmation, stopMediaRecorder, reRecordState, stopReRecord])

  useEffect(() => {
    autoCompleteTriggeredRef.current = false
    if (autoCompleteTimerRef.current) clearTimeout(autoCompleteTimerRef.current)
    cumulativeRecognizedRef.current = new Set()
  }, [affirmation])

  useEffect(() => {
    if (screen !== 'speak' || !affirmation || autoCompleteTriggeredRef.current) return
    const words = affirmation.text.split(' ').filter(Boolean)
    const allRecognized = words.every((w) => recognizedWords.has(w))
    if (words.length > 0 && allRecognized) {
      autoCompleteTriggeredRef.current = true
      if (reRecordState === 'recording') {
        autoCompleteTimerRef.current = setTimeout(() => stopReRecord(), 600)
      } else if (reRecordState === 'idle') {
        autoCompleteTimerRef.current = setTimeout(() => handleComplete(), 600)
      }
    }
  }, [recognizedWords, screen, affirmation, handleComplete, reRecordState, stopReRecord])

  // ── 다시 녹음 ──────────────────────────────────────────────────────
  const startReRecord = useCallback(async () => {
    try {
      const stream = prewarmStreamRef.current
        ?? await navigator.mediaDevices.getUserMedia({ audio: true })
      prewarmStreamRef.current = null
      reRecordStreamRef.current = stream
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      reRecordChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) reRecordChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(reRecordChunksRef.current, { type: mimeType || 'audio/webm' })
        reRecordBlobRef.current = blob.size > 0 ? blob : null
        reRecordStreamRef.current?.getTracks().forEach((t) => t.stop())
        reRecordStreamRef.current = null
        setReRecordState('confirm')
      }
      recorder.start()
      reRecordRecorderRef.current = recorder
      setReRecordState('recording')
    } catch { /* mic denied */ }
  }, [])

  const saveReRecord = useCallback(async () => {
    const blob = reRecordBlobRef.current
    if (blob && affirmation) {
      try {
        await deleteAudioRecordsByAffirmationId(affirmation.id)
        await saveAudioRecord({
          id: `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          affirmationId: affirmation.id,
          affirmationText: affirmation.text,
          blob,
          createdAt: Date.now(),
          keepForever: false,
        })
      } catch { /* ignore */ }
    }
    reRecordBlobRef.current = null
    setReRecordState('idle')
    handleComplete()
  }, [affirmation, handleComplete])

  const discardReRecord = useCallback(() => {
    reRecordBlobRef.current = null
    setReRecordState('idle')
    handleComplete()
  }, [handleComplete])

  // ── 큐 전환 헬퍼 ───────────────────────────────────────────────────
  const startQueue = useCallback((ids: string[], phase: SpeakPhase) => {
    if (ids.length === 0) return
    speakPhaseRef.current = phase
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mornim-speak-queue', JSON.stringify(ids))
      sessionStorage.setItem('mornim-speak-index', '0')
      sessionStorage.setItem('mornim-speak-phase', phase)
    }
    const all = getAffirmations()
    const first = all.find((a) => a.id === ids[0])
    if (!first) return
    setQueue(ids)
    setCurrentIndex(0)
    setAffirmation(first)
    setRecognizedWords(new Set())
    setScreen('text')
  }, [])

  // ── progress 자동 진행 ─────────────────────────────────────────────
  const handleAutoAdvance = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1
    const nextId = queueRef.current[nextIndex]
    if (!nextId) return
    if (typeof window !== 'undefined') sessionStorage.setItem('mornim-speak-index', String(nextIndex))
    const all = getAffirmations()
    const next = all.find((a) => a.id === nextId)
    if (next) {
      setAffirmation(next)
      setCurrentIndex(nextIndex)
      setRecognizedWords(new Set())
      setScreen('text')
    }
  }, [])

  // ── 오늘은 여기까지 ────────────────────────────────────────────────
  const handleGoHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mornim-speak-queue')
      sessionStorage.removeItem('mornim-speak-index')
      sessionStorage.removeItem('mornim-speak-phase')
    }
    if (isTomorrowEnabled() && getNaegeSeenDate() !== todayStr()) {
      router.push('/tomorrow')
    } else {
      router.refresh()
      router.push('/home')
    }
  }, [router])

  // ── 오늘 더 말하고 싶어요 ──────────────────────────────────────────
  const handleWantMore = useCallback(() => {
    const today = todayStr()
    const all = getAffirmations()

    // 오늘 아직 하지 않은 성공의 말 중 랜덤 3개
    const unseen = all
      .filter((a) => !a.completedDates.includes(today))
      .sort(() => Math.random() - 0.5)

    if (unseen.length === 0) {
      // 모두 완료 → all_done 화면으로
      setCelebrationVariant('all_done')
      return
    }

    startQueue(unseen.slice(0, 3).map((a) => a.id), 'extra')
  }, [startQueue])

  // ── 반복하기 ──────────────────────────────────────────────────────
  const handleRepeat = useCallback(() => {
    const today = todayStr()
    const all = getAffirmations()
    if (all.length === 0) return
    // 오늘 아직 말하지 않은 것만 반복 대상; 모두 완료됐으면 전체 사용
    const notDoneToday = all.filter((a) => !a.completedDates.includes(today))
    const pool = notDoneToday.length > 0 ? notDoneToday : all
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const first3 = shuffled.slice(0, 3)
    const rest = shuffled.slice(3)
    sessionStorage.setItem('mornim-repeat-remaining', JSON.stringify(rest.map((a) => a.id)))
    startQueue(first3.map((a) => a.id), 'repeat')
  }, [startQueue])

  // ── 반복 계속하기 ─────────────────────────────────────────────────
  const handleRepeatMore = useCallback(() => {
    const remaining: string[] = JSON.parse(sessionStorage.getItem('mornim-repeat-remaining') ?? '[]')
    if (remaining.length === 0) {
      sessionStorage.removeItem('mornim-repeat-remaining')
      setTodayRepeatDone()
      setCelebrationVariant('repeat_done')
      return
    }
    const next3 = remaining.slice(0, 3)
    const rest = remaining.slice(3)
    sessionStorage.setItem('mornim-repeat-remaining', JSON.stringify(rest))
    startQueue(next3, 'repeat')
  }, [startQueue])

  // ── 성공의 말 추가하기 ────────────────────────────────────────────
  const handleAddAffirmation = useCallback(() => {
    router.push('/create')
  }, [router])

  // ── 진행 표시 레이블 ──────────────────────────────────────────────
  const progressLabel = (() => {
    const phase = speakPhaseRef.current
    const pos = `${currentIndex + 1} / ${queue.length}`
    if (phase === 'extra') return `추가 ${pos}`
    if (phase === 'repeat') return `반복 ${pos}`
    return pos
  })()

  const { handleTouchStart, handleTouchEnd } = useSwipeUp(() => {
    if (screen === 'text') setScreen('speak')
  })

  if (!affirmation) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
          {dataLoaded ? '확언을 찾을 수 없어요' : '로딩 중...'}
        </div>
        {dataLoaded && <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', opacity: 0.6 }}>잠시 후 홈으로 이동합니다</div>}
      </div>
    )
  }

  if (screen === 'celebration') {
    return (
      <CelebrationScreen
        completedCount={completedCountRef.current}
        totalCount={queue.length}
        variant={celebrationVariant}
        onNext={celebrationVariant === 'progress' ? handleAutoAdvance : handleGoHome}
        onMore={handleWantMore}
        onAddAffirmation={handleAddAffirmation}
        onRepeat={handleRepeat}
        onRepeatMore={handleRepeatMore}
      />
    )
  }

  if (screen === 'text') {
    return (
      <div
        className="flex flex-col items-center justify-center relative"
        style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', cursor: 'pointer' }}
        onClick={() => setScreen('speak')}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-8 w-full">
          <div style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4px 16px',
            fontSize: '13px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
          }}>
            {progressLabel}
          </div>
          <DynamicText text={affirmation.text} darkBackground />
        </div>
        <div className="absolute bottom-12" style={{ color: 'var(--color-text-muted)', fontSize: '14px', animation: 'bounce 1.5s ease-in-out infinite' }}>
          위로 스와이프 ↑
        </div>
      </div>
    )
  }

  // ── Speak screen ──────────────────────────────────────────────────
  const words = affirmation.text.split(' ')

  return (
    <div className="relative flex flex-col" style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', overflow: 'hidden' }}>
      {/* Camera */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.7 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none' }} />
      {isSpeaking && <div style={{ position: 'absolute', inset: 0, animation: 'speakGlow 0.6s ease-in-out', pointerEvents: 'none' }} />}

      {/* Progress + 녹음 표시 */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '4px 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {progressLabel}
        </div>
        {isRecording && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(194,60,40,0.85)', borderRadius: '20px', padding: '4px 10px',
            fontSize: '12px', fontWeight: 700, color: '#fff',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block',
              animation: 'onbRecBlink 1s steps(2,end) infinite',
            }} />
            녹음 중
          </div>
        )}
      </div>

      {/* Words overlay */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {words.map((word, i) => (
            <span key={i} style={{
              fontSize: '22px', fontWeight: 500, padding: '4px 10px', borderRadius: '8px',
              background: recognizedWords.has(word) ? 'var(--color-accent-highlight)' : 'rgba(255,255,255,0.1)',
              color: recognizedWords.has(word) ? 'white' : 'var(--color-text-onDark)',
              transition: 'all 0.3s ease',
            }}>
              {word}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {isListening && (
            <div className="flex items-end gap-0.5" style={{ height: '20px' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  width: '3px', borderRadius: '2px',
                  background: isSpeaking ? 'var(--color-accent-secondary)' : 'var(--color-text-muted)',
                  animation: isSpeaking ? `waveBar 0.4s ease-in-out ${i * 0.08}s infinite` : 'none',
                  height: isSpeaking ? undefined : '4px',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          )}
          {isSpeaking ? '인식 중...' : '듣고 있어요...'}
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{ position: 'relative', zIndex: 10, padding: '12px 32px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={handleComplete}
          style={{
            width: '100%', padding: '16px', background: 'var(--color-accent-primary)',
            border: 'none', borderRadius: '16px', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          완료 ✓
        </button>

        {hasExistingRecording && reRecordState === 'idle' && (
          <button
            onClick={startReRecord}
            style={{
              width: '100%', padding: '13px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: '16px',
              color: 'var(--color-text-muted)', fontSize: '14px', cursor: 'pointer',
            }}
          >
            🎙 다시 녹음
          </button>
        )}


        {reRecordState === 'confirm' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={saveReRecord}
              style={{
                flex: 1, padding: '13px', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '16px',
                color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              저장
            </button>
            <button
              onClick={discardReRecord}
              style={{
                flex: 1, padding: '13px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px',
                color: 'var(--color-text-muted)', fontSize: '14px', cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SpeakPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center" style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>로딩 중...</div>
      </div>
    }>
      <SpeakPageInner />
    </Suspense>
  )
}
