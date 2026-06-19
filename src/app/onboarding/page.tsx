'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import { saveAffirmation, setOnboarded, saveTodayAffirmationIds, saveAlarmSettings } from '@/lib/storage'

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

const CAT_EMOJI: Record<string, string> = {
  '나 자신': '🌱', '일과 커리어': '🚩', '돈과 풍요': '🌿',
  '관계와 사랑': '💗', '건강과 몸': '🍃', '용기와 도전': '🔥',
  '마음과 평온': '🌙', '오늘 하루': '☀️',
}

const SUGGESTIONS: Record<string, string[]> = {
  '나 자신': ['나는 나를 있는 그대로 존중한다.', '나는 매일 조금씩 성장한다.'],
  '일과 커리어': ['나는 내 일에서 가치를 만든다.', '나는 기회를 끌어당긴다.'],
  '돈과 풍요': ['나는 풍요를 누릴 자격이 있다.', '돈은 나에게 편안하게 흐른다.'],
  '관계와 사랑': ['나는 따뜻한 관계를 만든다.', '나는 사랑을 주고받는다.'],
  '건강과 몸': ['나는 내 몸을 소중히 돌본다.', '나는 건강한 에너지로 가득하다.'],
  '용기와 도전': ['나는 두려움보다 크다.', '나는 모든 도전에 용기 있게 맞선다.'],
  '마음과 평온': ['나는 평온한 마음을 지킨다.', '나는 지금 이 순간에 머문다.'],
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

function StopIcon() {
  return <svg width={34} height={34} viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2.5" /></svg>
}

function MicIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

/* ── Selfie Camera ───────────────────────────────────────────── */
function SelfieCam({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camState, setCamState] = useState<'init' | 'live' | 'denied' | 'unsupported'>('init')

  useEffect(() => {
    let cancelled = false
    const stop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (!active) { stop(); return }
    if (!navigator.mediaDevices?.getUserMedia) { setCamState('unsupported'); return }
    setCamState('init')
    const failTimer = setTimeout(() => {
      if (!cancelled && !streamRef.current) setCamState('denied')
    }, 7000)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        clearTimeout(failTimer)
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setCamState('live')
      })
      .catch(() => { clearTimeout(failTimer); if (!cancelled) setCamState('denied') })
    return () => { cancelled = true; clearTimeout(failTimer); stop() }
  }, [active])

  return (
    <>
      <video
        ref={videoRef} muted playsInline autoPlay
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transform: 'scaleX(-1)',
          opacity: camState === 'live' ? 1 : 0, transition: 'opacity .4s',
        }}
      />
      {camState !== 'live' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center',
          padding: 30, background: 'radial-gradient(circle at 50% 38%, #3a2c14, #1a140a 72%)',
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', fontSize: 40,
            background: 'rgba(232,200,120,.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🎙️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.onDark }}>
            {camState === 'init' ? '카메라를 준비하고 있어요…' : '소리만으로도 충분해요'}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 230, color: T.onDark2 }}>
            {camState === 'init' && '잠시만 기다려 주세요.'}
            {camState === 'denied' && '카메라 없이도 괜찮아요. 편하게 소리 내어 말해보세요.'}
            {camState === 'unsupported' && '이 기기에서는 소리로만 진행해요.'}
          </div>
        </div>
      )}
    </>
  )
}

const ENCOURAGEMENTS = [
  '당신은 정말 해낼 수 있어요!',
  '시작이 반이에요! 오늘도 멋지게!',
  '매일 조금씩, 분명히 달라지고 있어요!',
  '이 한 문장이 당신의 하루를 바꿀 거예요!',
  '용기 있어요! 계속 나아가요!',
]

/* ── Main component ──────────────────────────────────────────── */
type RecState = 'idle' | 'recording' | 'done'
type Dir = 'next' | 'back' | 'fade'

export default function OnboardingPage() {
  const router = useRouter()

  // Screen transition state
  const [cur, setCur] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [dir, setDir] = useState<Dir>('fade')
  const transRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const curRef = useRef(0) // mirrors cur state for use inside callbacks

  // Form state
  const [cats, setCats] = useState<string[]>([])
  const catsRef = useRef<string[]>([]) // mirrors cats for use in setTimeout callbacks
  const [rec, setRec] = useState<RecState>('idle')
  const [transcript, setTranscript] = useState('')
  const [notifTime, setNotifTime] = useState(480)
  const [notifAllowed, setNotifAllowed] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const recRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recommended affirmations for screen 2
  const [recAffirmations, setRecAffirmations] = useState<string[]>([])
  const [encouragement] = useState(() => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])

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
  }, [])

  // Fetch recommended affirmations when entering screen 2
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

  const finishRec = useCallback(() => {
    if (recRef.current) clearTimeout(recRef.current)
    setTranscript(getPhrase(catsRef.current))
    setRec('done')
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#bd821f', '#e8c878', '#f3e6c8', '#ffffff'] })
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 50, origin: { x: 0, y: 0.6 }, colors: ['#bd821f', '#FFD700'] }), 300)
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 50, origin: { x: 1, y: 0.6 }, colors: ['#bd821f', '#FFD700'] }), 500)
    }).catch(() => {})
  }, [])

  const micTap = () => {
    if (rec === 'recording') { finishRec(); return }
    setTranscript('')
    setRec('recording')
    recRef.current = setTimeout(finishRec, 2600)
  }

  const handleFinish = async () => {
    if (isFinishing) return
    setIsFinishing(true)
    const affText = transcript || getPhrase(cats)
    const category = cats[0] ?? '나 자신'

    if (notifAllowed) {
      saveAlarmSettings({ audioId: '', hour: Math.floor(notifTime / 60), minute: notifTime % 60 })
    }

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '', category }),
      })
      const data = await res.json() as { affirmations: string[] }
      const now = Date.now()
      const ids: string[] = []
      const voiceId = `voice-${now}`
      saveAffirmation({ id: voiceId, text: affText, category, createdAt: new Date().toISOString(), completedDates: [] })
      ids.push(voiceId)
      data.affirmations.forEach((text, i) => {
        const id = `onboarding-${now}-${i}`
        saveAffirmation({ id, text, category, createdAt: new Date().toISOString(), completedDates: [] })
        ids.push(id)
      })
      saveTodayAffirmationIds(ids.slice(0, 3))
    } catch {
      const now = Date.now()
      const voiceId = `voice-${now}`
      saveAffirmation({ id: voiceId, text: affText, category, createdAt: new Date().toISOString(), completedDates: [] })
      saveTodayAffirmationIds([voiceId])
    }
    setOnboarded()
    router.push('/home')
  }

  const TIME_PRESETS = [360, 420, 480, 540]
  const phrase = transcript || getPhrase(cats)

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
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.6px', color: T.gold, lineHeight: 1.28 }}>저는 모님이에요.</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: T.ink2, lineHeight: 1.55, marginTop: 4 }}>
              성공의 말을 하면 이루어진다.
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', overflow: 'hidden' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.6px', color: T.ink, lineHeight: 1.28, marginBottom: 10 }}>
              어떤 성공을<br />이루고 싶으세요?
            </div>
            <div style={{ fontSize: 16, fontWeight: 500, color: T.ink2, marginBottom: 26 }}>끌리는 걸 모두 눌러주세요.</div>
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
                    <span style={{ marginRight: 5 }}>{CAT_EMOJI[cat]}</span>{cat}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ padding: '12px 26px 48px' }}>
            <button
              style={cats.length > 0 ? btnPrimary : btnDisabled}
              disabled={!cats.length}
              onClick={() => goTo(2)}
            >
              다음
            </button>
          </div>
        </div>
      )

      /* ── 2: Voice recording with selfie camera ────────────────── */
      case 2: return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 18px 0' }}>
            {/* Camera stage */}
            <div style={{
              position: 'relative', width: '100%', flex: 1, minHeight: 0,
              borderRadius: 30, overflow: 'hidden', background: '#1a140a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SelfieCam active={cur === 2} />
              {/* Top scrim */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 0, height: 168,
                background: 'linear-gradient(to bottom, rgba(20,12,2,.72), transparent)',
                pointerEvents: 'none', zIndex: 2,
              }} />
              {/* Bottom scrim */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 240,
                background: 'linear-gradient(to top, rgba(20,12,2,.82), transparent)',
                pointerEvents: 'none', zIndex: 2,
              }} />
              {/* Title overlay */}
              <div style={{ position: 'absolute', top: 22, left: 22, right: 22, zIndex: 3, textAlign: 'center' }}>
                {rec === 'recording' ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    background: 'rgba(194,85,46,.92)', color: '#fff',
                    fontSize: 13, fontWeight: 700, padding: '6px 13px', borderRadius: 999,
                  }}>
                    <i style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'block',
                      animation: 'onbRecBlink 1s steps(2,end) infinite',
                    }} />
                    녹음 중 · 듣고 있어요
                  </span>
                ) : (
                  <div style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px',
                    color: '#fff', lineHeight: 1.3, textShadow: '0 2px 12px rgba(0,0,0,.4)',
                  }}>
                    {rec === 'done' ? '잘 들었어요!' : '버튼을 누르고 소리내어 말해보세요.'}
                  </div>
                )}
              </div>
              {/* Bottom controls */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 24, zIndex: 4,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 22px',
              }}>
                {/* Phrase card (idle state) */}
                {rec === 'idle' && (
                  <div style={{
                    width: '100%',
                    background: 'rgba(28,20,8,.72)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(232,200,120,.3)', borderRadius: 18, padding: '16px 18px',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,200,120,.7)', marginBottom: 8, letterSpacing: '.4px' }}>
                      이 문장을 소리 내어 읽어보세요
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.45, color: '#fff' }}>
                      &ldquo;{getPhrase(cats)}&rdquo;
                    </div>
                  </div>
                )}
                {/* Waveform (recording state) */}
                {rec === 'recording' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 40 }}>
                    {Array.from({ length: 13 }).map((_, k) => (
                      <span key={k} style={{
                        display: 'block', width: 4, borderRadius: 2, background: '#e8c878', height: '20%',
                        animation: 'onbWaveJump .7s ease-in-out infinite',
                        animationDelay: `${(k % 3) * 0.2}s`,
                      }} />
                    ))}
                  </div>
                )}
                {/* Transcript quote card (done state) */}
                {rec === 'done' && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      width: '100%', background: 'rgba(28,20,8,.72)',
                      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(232,200,120,.3)', borderRadius: 18, padding: '16px 18px',
                    }}>
                      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.42, color: '#fff' }}>
                        &ldquo;{transcript}&rdquo;
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8c878', textAlign: 'center', padding: '4px 0' }}>
                      {encouragement}
                    </div>
                    {recAffirmations.length > 0 && (
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6, textAlign: 'center' }}>
                          이런 성공의 말도 소리 내어 말해보세요
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {recAffirmations.map((aff, i) => (
                            <div key={i} style={{
                              background: 'rgba(189,130,31,0.2)', border: '1px solid rgba(232,200,120,0.3)',
                              borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#f3e6c8', lineHeight: 1.4,
                            }}>
                              {aff}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Mic button with pulse rings */}
                <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rec === 'recording' && [0, 0.6, 1.2].map((delay) => (
                    <span key={delay} style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '2px solid #e8c878', opacity: 0,
                      animation: 'onbMicPulse 1.8s ease-out infinite',
                      animationDelay: `${delay}s`,
                    }} />
                  ))}
                  <button
                    onClick={micTap}
                    style={{
                      position: 'relative', zIndex: 2,
                      width: 76, height: 76, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: rec === 'recording' ? '#c2552e' : T.gold, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 0 6px rgba(255,255,255,.16), 0 14px 30px -10px rgba(0,0,0,.7)',
                      transition: 'transform .14s, background .2s',
                    }}
                  >
                    {rec === 'recording' ? <StopIcon /> : <MicIcon size={32} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 26px 48px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              style={rec === 'done' ? btnPrimary : btnDisabled}
              disabled={rec !== 'done'}
              onClick={() => goTo(3)}
            >
              다음
            </button>
            {rec === 'done'
              ? <button style={btnText} onClick={() => { setRec('idle'); setTranscript('') }}>다시 녹음하기</button>
              : <span style={{ height: 6 }} />}
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
                매일 아침,<br />당신의 말로 깨울게요
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: T.ink2, lineHeight: 1.55 }}>
                알림을 켜면 정한 시간에 오늘의 성공의 말을 보내드려요.
              </div>
            </div>
            {/* Time picker card */}
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
                if ('Notification' in window && Notification.permission !== 'granted') {
                  await Notification.requestPermission()
                }
                setNotifAllowed(true)
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
            {/* Affirmation card */}
            <div style={{ borderRadius: 22, padding: '26px 24px', background: T.goldTint }}>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.42, letterSpacing: '-0.4px', color: T.ink, marginBottom: 22 }}>
                {phrase}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 26 }}>
                  {Array.from({ length: 7 }).map((_, k) => (
                    <span key={k} style={{ display: 'block', width: 4, borderRadius: 2, background: T.gold, height: '30%' }} />
                  ))}
                </div>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', background: T.gold, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 22px -8px rgba(189,130,31,.8)',
                }}>
                  <PlayIcon />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.ink2 }}>
              분야 {cats.length || 1}개 · 매일 {fmtTime(notifTime)}
            </div>
          </div>
          <div style={{ padding: '12px 26px 48px' }}>
            <button
              style={isFinishing ? btnDisabled : btnPrimary}
              disabled={isFinishing}
              onClick={handleFinish}
            >
              {isFinishing ? '준비하는 중…' : '모님 시작하기'}
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
