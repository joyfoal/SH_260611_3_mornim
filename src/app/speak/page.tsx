'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { DynamicText } from '@/components/ui/DynamicText'
import { CelebrationScreen } from '@/components/ui/CelebrationScreen'
import {
  getAffirmations,
  updateAffirmation,
  getDayRecord,
  saveDayRecord,
  isTomorrowEnabled,
  todayStr,
  getTodayExtraCount,
  incrementTodayExtraCount,
  type Affirmation,
} from '@/lib/storage'
import { updateStreak } from '@/lib/streak'
import { saveAudioRecord } from '@/lib/audioStorage'

const MAX_EXTRA = 4

function useSwipeUp(onSwipeUp: () => void) {
  const startY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = startY.current - e.changedTouches[0].clientY
    if (delta > 50) onSwipeUp()
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const shouldListenRef = useRef(false)
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedCountRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const pendingAffirmationRef = useRef<Affirmation | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isExtraMode = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedQueue = sessionStorage.getItem('mornim-speak-queue')
    const storedIndex = sessionStorage.getItem('mornim-speak-index')
    const q = storedQueue ? (JSON.parse(storedQueue) as string[]) : []
    const idx = storedIndex ? parseInt(storedIndex) : 0
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

  // 확언 없으면 3초 후 홈으로
  useEffect(() => {
    if (!dataLoaded || affirmation !== null) return
    const timer = setTimeout(() => router.replace('/home'), 3000)
    return () => clearTimeout(timer)
  }, [dataLoaded, affirmation, router])

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Start MediaRecorder for audio
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        const aff = pendingAffirmationRef.current
        if (aff && blob.size > 0) {
          try {
            await saveAudioRecord({
              id: `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              affirmationId: aff.id,
              affirmationText: aff.text,
              blob,
              createdAt: Date.now(),
              keepForever: false,
            })
          } catch {
            // ignore storage errors
          }
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
    } catch {
      // Try without audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        // camera denied — continue without
      }
    }
  }, [])

  const startSTT = useCallback(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRec) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRec()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    shouldListenRef.current = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(' ')
        .toLowerCase()

      setIsSpeaking(true)
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
      speakTimerRef.current = setTimeout(() => setIsSpeaking(false), 800)

      if (affirmation) {
        const clean = (w: string) => w.replace(/[.,!?。、。·]/g, '').toLowerCase()
        const words = affirmation.text.split(' ')
        const transcriptWords = transcript.split(/\s+/).map(clean)
        const newRecognized = new Set<string>()
        words.forEach((word) => {
          const lw = clean(word)
          if (!lw) return
          if (transcriptWords.some((tw) => tw === lw || tw.startsWith(lw) || lw.startsWith(tw))) {
            newRecognized.add(word)
          }
        })
        setRecognizedWords(newRecognized)
      }
    }

    recognition.onerror = (event: { error: string }) => {
      if (!shouldListenRef.current) return
      if (event.error === 'not-allowed') {
        setIsListening(false)
        return
      }
      try { recognition.start() } catch { /* already started */ }
    }

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start() } catch { /* already started */ }
      }
    }

    recognition.start()
    setIsListening(true)
  }, [affirmation])

  useEffect(() => {
    if (screen === 'speak') {
      startCamera()
      startSTT()
    }
    return () => {
      shouldListenRef.current = false
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [screen, startCamera, startSTT])

  const handleComplete = useCallback(() => {
    if (!affirmation) return

    // Set pending affirmation for audio recording
    pendingAffirmationRef.current = affirmation

    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Stop MediaRecorder (triggers onstop which saves audio)
    stopMediaRecorder()

    // Mark completion
    const today = todayStr()
    if (!affirmation.completedDates.includes(today)) {
      const updated = {
        ...affirmation,
        completedDates: [...affirmation.completedDates, today],
      }
      updateAffirmation(updated)

      const existing = getDayRecord(today)
      const newCount = (existing?.completedCount ?? 0) + 1
      saveDayRecord({
        date: today,
        completedCount: newCount,
        dominantCategory: affirmation.category,
      })

      completedCountRef.current = newCount

      if (newCount >= 3) {
        updateStreak(true)
      }
    }

    setScreen('celebration')
  }, [affirmation, stopMediaRecorder])

  const handleCelebrationNext = useCallback(() => {
    const nextIndex = currentIndex + 1
    const nextId = queue[nextIndex]

    if (nextId) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mornim-speak-index', String(nextIndex))
      }
      const all = getAffirmations()
      const next = all.find((a) => a.id === nextId)
      if (next) {
        setAffirmation(next)
        setCurrentIndex(nextIndex)
        setRecognizedWords(new Set())
        setScreen('text')
        return
      }
    }

    // All base done
    if (isTomorrowEnabled()) {
      router.push('/tomorrow')
    } else {
      router.push('/home')
    }
  }, [currentIndex, queue, router])

  const handleMoreAffirmation = useCallback(() => {
    incrementTodayExtraCount()
    const all = getAffirmations()
    if (all.length === 0) {
      router.push('/tomorrow')
      return
    }
    const pick = all[Math.floor(Math.random() * all.length)]
    isExtraMode.current = true
    setAffirmation(pick)
    setRecognizedWords(new Set())
    setScreen('text')
  }, [router])

  const isAllDone = completedCountRef.current >= queue.length && queue.length > 0
  const extraCount = isAllDone ? getTodayExtraCount() : 0
  const allowMore = isAllDone && extraCount < MAX_EXTRA

  const { handleTouchStart, handleTouchEnd } = useSwipeUp(() => {
    if (screen === 'text') setScreen('speak')
  })

  if (!affirmation) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
      >
        <div style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
          {dataLoaded ? '확언을 찾을 수 없어요' : '로딩 중...'}
        </div>
        {dataLoaded && (
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', opacity: 0.6 }}>
            잠시 후 홈으로 이동합니다
          </div>
        )}
      </div>
    )
  }

  if (screen === 'celebration') {
    return (
      <CelebrationScreen
        completedCount={completedCountRef.current}
        totalCount={queue.length}
        onNext={handleCelebrationNext}
        allowMore={allowMore}
        onMore={handleMoreAffirmation}
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
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '4px 16px',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            {isExtraMode.current ? `보너스 +${extraCount + 1}` : `${currentIndex + 1} / ${queue.length}`}
          </div>
          <DynamicText text={affirmation.text} darkBackground />
        </div>
        <div
          className="absolute bottom-12"
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '14px',
            animation: 'bounce 1.5s ease-in-out infinite',
          }}
        >
          위로 스와이프 ↑
        </div>
      </div>
    )
  }

  // Speak screen
  const words = affirmation.text.split(' ')

  return (
    <div
      className="relative flex flex-col"
      style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)', overflow: 'hidden' }}
    >
      {/* Camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          opacity: 0.7,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {isSpeaking && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'speakGlow 0.6s ease-in-out',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Progress */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '20px 16px 0',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '20px',
            padding: '4px 16px',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          {isExtraMode.current ? `보너스 +${extraCount + 1}` : `${currentIndex + 1} / ${queue.length}`}
        </div>
      </div>

      {/* Words overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          {words.map((word, i) => (
            <span
              key={i}
              style={{
                fontSize: '22px',
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: '8px',
                background: recognizedWords.has(word)
                  ? 'var(--color-accent-highlight)'
                  : 'rgba(255,255,255,0.1)',
                color: recognizedWords.has(word) ? 'white' : 'var(--color-text-onDark)',
                transition: 'all 0.3s ease',
              }}
            >
              {word}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2" style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {isListening && (
            <div className="flex items-end gap-0.5" style={{ height: '20px' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    borderRadius: '2px',
                    background: isSpeaking ? 'var(--color-accent-secondary)' : 'var(--color-text-muted)',
                    animation: isSpeaking ? `waveBar 0.4s ease-in-out ${i * 0.08}s infinite` : 'none',
                    height: isSpeaking ? undefined : '4px',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          )}
          {isSpeaking ? '인식 중...' : '듣고 있어요...'}
        </div>
      </div>

      {/* Complete button */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '16px 32px 40px',
        }}
      >
        <button
          onClick={handleComplete}
          style={{
            width: '100%',
            padding: '16px',
            background: 'var(--color-accent-primary)',
            border: 'none',
            borderRadius: '16px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          완료 ✓
        </button>
      </div>
    </div>
  )
}

export default function SpeakPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center"
          style={{ minHeight: '100dvh', background: 'var(--color-bg-dark)' }}
        >
          <div style={{ color: 'var(--color-text-muted)' }}>로딩 중...</div>
        </div>
      }
    >
      <SpeakPageInner />
    </Suspense>
  )
}
