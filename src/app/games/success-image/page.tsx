'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAffirmations, clearAllData, type Affirmation } from '@/lib/storage'
import {
  getFaceProfile,
  saveFaceProfile,
  deleteFaceProfile,
  clearFaceStorage,
  type FaceProfile,
  type FaceData,
} from '@/lib/faceStorage'
import { saveSuccessImage, clearSuccessImages } from '@/lib/successImageStorage'
import { clearAllAudioRecords } from '@/lib/audioStorage'

function resizeImage(file: File | Blob, maxPx = 900, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(maxPx / img.naturalWidth, maxPx / img.naturalHeight, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(format === 'png'
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', 0.85)
      )
    }
    img.src = objectUrl
  })
}

function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}

export default function SuccessImagePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 얼굴
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [faceThumbnail, setFaceThumbnail] = useState<string | null>(null)
  const [faceData, setFaceData] = useState<FaceData | null>(null)
  const [faceAnalyzing, setFaceAnalyzing] = useState(false)
  const [faceError, setFaceError] = useState<string | null>(null)

  // 글 + 스타일
  const [text, setText] = useState('')
  const [imageStyle, setImageStyle] = useState<'ghibli' | 'realistic'>('ghibli')

  // 저장된 프로필
  const [savedProfile, setSavedProfile] = useState<FaceProfile | null>(null)
  const [savedProfileUrl, setSavedProfileUrl] = useState<string | null>(null)

  // Step 1 — 프로필 이미지 생성
  const [showCreationUI, setShowCreationUI] = useState(false) // 생성 폼 표시 여부
  const [isRegenerating, setIsRegenerating] = useState(false) // 기존 프로필이 있을 때 다시 만들기 중
  const [profileGenerating, setProfileGenerating] = useState(false)
  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // 부정어 감지
  const [positiveSuggestion, setPositiveSuggestion] = useState<string | null>(null)
  const negativeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step 2 — 성공 이미지 생성
  const [successGenerating, setSuccessGenerating] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [successError, setSuccessError] = useState<string | null>(null)

  useEffect(() => {
    setAffirmations(getAffirmations())
    getFaceProfile().then((p) => {
      setSavedProfile(p)
      // 저장된 프로필이 없으면 바로 생성 UI 표시
      if (!p?.profileImageBlob) setShowCreationUI(true)
    }).catch(() => { setShowCreationUI(true) })
  }, [])

  useEffect(() => {
    if (!savedProfile?.profileImageBlob) {
      setSavedProfileUrl(null)
      return
    }
    const url = URL.createObjectURL(savedProfile.profileImageBlob)
    setSavedProfileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [savedProfile])

  useEffect(() => {
    return () => { if (faceThumbnail) URL.revokeObjectURL(faceThumbnail) }
  }, [faceThumbnail])

  const checkNegative = useCallback((val: string) => {
    if (negativeTimerRef.current) clearTimeout(negativeTimerRef.current)
    if (!val.trim()) { setPositiveSuggestion(null); return }
    negativeTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/detect-negative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: val }),
        })
        const data = await res.json() as { isNegative: boolean; alternative: string | null }
        setPositiveSuggestion(data.isNegative && data.alternative ? data.alternative : null)
      } catch { setPositiveSuggestion(null) }
    }, 800)
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (faceThumbnail) URL.revokeObjectURL(faceThumbnail)
    setFaceThumbnail(URL.createObjectURL(file))
    setFaceFile(file)
    setFaceData(null)
    setFaceError(null)
    setProfileUrl(null)
    setProfileSaved(false)
    setSuccessUrl(null)

    setFaceAnalyzing(true)
    try {
      const imageBase64 = await resizeImage(file)
      const res = await fetch('/api/analyze-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      const data = await res.json() as { faceData?: FaceData; error?: string }
      if (!res.ok || !data.faceData) {
        setFaceError(data.error ?? '얼굴이 잘 보이는 사진을 사용해 주세요.')
      } else {
        setFaceData(data.faceData)
      }
    } catch {
      setFaceError('얼굴 분석 중 오류가 발생했어요.')
    }
    setFaceAnalyzing(false)
  }

  // 입력 조합에 따라 모드 자동 결정
  const getProfileMode = () => {
    const hasFace = faceFile !== null && faceData !== null
    const hasText = text.trim().length > 0
    if (hasFace && hasText) return 'face+text' as const
    if (hasFace) return 'face' as const
    return 'text' as const
  }


  const handleGenerateProfile = async () => {
    setProfileGenerating(true)
    setProfileError(null)
    setProfileUrl(null)
    setProfileSaved(false)
    setSuccessUrl(null)

    try {
      let faceImageBase64: string | undefined
      if (faceFile && faceData) faceImageBase64 = await resizeImage(faceFile)

      const mode = getProfileMode()
      // 글도 얼굴도 없으면 현재 확언 텍스트로 생성
      const textToSend = text.trim() || affirmations.slice(0, 3).map((a) => a.text).join(', ')

      const res = await fetch('/api/generate-profile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          imageStyle,
          faceImageBase64,
          faceData: faceData ?? undefined,
          text: textToSend || undefined,
        }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.error) {
        setProfileError(data.error)
      } else if (data.url) {
        setProfileUrl(data.url)
      }
    } catch {
      setProfileError('프로필 이미지 생성 중 오류가 발생했어요.')
    }
    setProfileGenerating(false)
  }

  const handleSaveProfile = async () => {
    if (!profileUrl) return
    try {
      const blob = dataURLtoBlob(profileUrl)
      const toSave: FaceProfile = {
        id: 'default',
        createdAt: Date.now(),
        profileImageBlob: blob,
        profileDescription: text.trim() || undefined,
      }
      if (faceData) toSave.faceData = faceData
      else if (savedProfile?.faceData) toSave.faceData = savedProfile.faceData
      if (faceFile) toSave.imageBlob = faceFile
      else if (savedProfile?.imageBlob) toSave.imageBlob = savedProfile.imageBlob

      await saveFaceProfile(toSave)
      setSavedProfile(toSave)
      setProfileSaved(true)
      setIsRegenerating(false)
      setShowCreationUI(false)
    } catch {
      setProfileError('저장 중 오류가 발생했어요.')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  // Step 2 진입 조건: 새로 저장했거나 기존 프로필 있음
  const hasProfile = profileSaved || !!savedProfile?.profileImageBlob

  const handleGenerateSuccess = async () => {
    if (!hasProfile || selectedIds.length === 0) return
    setSuccessGenerating(true)
    setSuccessError(null)
    setSuccessUrl(null)

    try {
      const latest = await getFaceProfile().catch(() => null)
      const profileBase64 = latest?.profileImageBlob
        ? await resizeImage(latest.profileImageBlob, 1024, 'png')
        : undefined

      const selected = affirmations.filter((a) => selectedIds.includes(a.id))
      const affirmationTexts = selected.map((a) => a.text)

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affirmations: affirmationTexts,
          profileImageBase64: profileBase64,
        }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.error) {
        setSuccessError(data.error)
      } else if (data.url) {
        setSuccessUrl(data.url)
        saveSuccessImage(dataURLtoBlob(data.url)).catch(() => {})
      }
    } catch {
      setSuccessError('성공 이미지 생성 중 오류가 발생했어요.')
    }
    setSuccessGenerating(false)
  }

  const handleDownload = () => {
    if (!successUrl) return
    const a = document.createElement('a')
    a.href = successUrl
    a.download = 'mornim-success-image.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 화면에 표시할 프로필 이미지 (새로 생성한 것 > 저장된 것)
  const displayProfileUrl = profileUrl ?? savedProfileUrl

  const canGenerateSuccess = hasProfile && selectedIds.length > 0 && !successGenerating

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-primary)', padding: '20px 16px 48px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '22px', padding: '4px', lineHeight: 1 }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          성공 이미지 만들기
        </h1>
      </div>

      {/* ───── Step 1: 프로필 이미지 ───── */}
      <div
        style={{
          padding: '18px 16px',
          background: 'var(--color-bg-card)',
          borderRadius: '20px',
          marginBottom: '20px',
        }}
      >
        {/* 스텝 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--color-accent-primary)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            1
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
              내 캐릭터 만들기
            </p>
          </div>
        </div>

        {/* ── 저장된 프로필 크게 표시 (생성 UI가 꺼져 있을 때) ── */}
        {!showCreationUI && savedProfileUrl && (
          <div>
            <img
              src={savedProfileUrl}
              alt="저장된 프로필"
              style={{
                width: '100%',
                borderRadius: '16px',
                display: 'block',
                marginBottom: '12px',
                border: '2px solid var(--color-accent-secondary)',
              }}
            />
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--color-accent-light)',
                borderRadius: '10px',
                color: 'var(--color-accent-primary)',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              ✓ 저장된 프로필 사용 중 · 아래에서 성공의 말을 선택해요
            </div>
            <button
              onClick={async () => {
                clearAllData()
                await Promise.all([
                  deleteFaceProfile().catch(() => {}),
                  clearFaceStorage().catch(() => {}),
                  clearSuccessImages().catch(() => {}),
                  clearAllAudioRecords().catch(() => {}),
                ])
                // 프로필 관련
                setSavedProfile(null)
                setSavedProfileUrl(null)
                setProfileUrl(null)
                setProfileSaved(false)
                setProfileError(null)
                setIsRegenerating(false)
                // 얼굴
                if (faceThumbnail) URL.revokeObjectURL(faceThumbnail)
                setFaceThumbnail(null)
                setFaceFile(null)
                setFaceData(null)
                setFaceError(null)
                // 글 + 스타일
                setText('')
                setImageStyle('ghibli')
                setPositiveSuggestion(null)
                // 확언 선택
                setSelectedIds([])
                // 성공 이미지
                setSuccessUrl(null)
                setSuccessError(null)
                // UI
                setShowCreationUI(true)
              }}
              style={{
                width: '100%',
                padding: '11px',
                background: 'transparent',
                border: '1.5px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              프로필 다시 만들기
            </button>
          </div>
        )}

        {/* ── 생성 UI (처음 만들기 or 다시 만들기) ── */}
        {showCreationUI && (
          <>
            {/* 얼굴 사진 업로드 */}
            <div style={{ marginBottom: '12px' }}>
              {faceAnalyzing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '16px' }}>✨</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>AI가 얼굴을 분석하는 중...</span>
                </div>
              ) : faceThumbnail ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={faceThumbnail}
                    alt="얼굴"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: faceData ? '2px solid var(--color-accent-primary)' : '2px solid var(--color-border)',
                    }}
                  />
                  <div>
                    <p style={{ fontSize: '12px', color: faceData ? 'var(--color-accent-primary)' : '#E53935', marginBottom: '3px', fontWeight: 500 }}>
                      {faceData ? '✓ 얼굴 분석 완료' : '얼굴 분석 실패'}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: '12px', color: 'var(--color-accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      사진 변경
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '11px',
                    background: 'var(--color-bg-primary)',
                    border: '1.5px dashed var(--color-border)',
                    borderRadius: '11px',
                    fontSize: '13px',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>📷</span>
                  얼굴 사진 추가 (선택)
                </button>
              )}
              {faceError && (
                <p style={{ marginTop: '5px', fontSize: '11px', color: '#E53935' }}>{faceError}</p>
              )}
            </div>

            {/* 글 입력 */}
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setPositiveSuggestion(null)
                setProfileUrl(null)
                setProfileSaved(false)
                setSuccessUrl(null)
                checkNegative(e.target.value)
              }}
              placeholder="원하는 느낌이나 긍정의 말을 입력해요 (선택)"
              rows={2}
              style={{
                width: '100%',
                padding: '11px 13px',
                background: 'var(--color-bg-primary)',
                border: positiveSuggestion ? '1.5px solid #F59E0B' : '1.5px solid var(--color-border)',
                borderRadius: '11px',
                fontSize: '13px',
                color: 'var(--color-text-primary)',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.6,
                boxSizing: 'border-box',
                marginBottom: positiveSuggestion ? '8px' : '12px',
              }}
            />
            {/* 부정어 감지 시 긍정 제안 */}
            {positiveSuggestion && (
              <div style={{
                marginBottom: '12px',
                padding: '10px 12px',
                background: '#FFFBEB',
                border: '1px solid #F59E0B',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '13px', color: '#92400E', flex: 1 }}>
                  💡 긍정의 말로 바꿔볼까요?<br />
                  <span style={{ fontWeight: 600 }}>"{positiveSuggestion}"</span>
                </span>
                <button
                  onClick={() => {
                    setText(positiveSuggestion)
                    setPositiveSuggestion(null)
                    setProfileUrl(null)
                    setProfileSaved(false)
                    setSuccessUrl(null)
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  바꾸기
                </button>
              </div>
            )}

            {/* 스타일 선택 */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '14px',
                padding: '4px',
                background: 'var(--color-bg-primary)',
                borderRadius: '12px',
              }}
            >
              {([
                { id: 'ghibli', label: '✨ 만화 느낌' },
                { id: 'realistic', label: '📸 사진 느낌' },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setImageStyle(s.id)}
                  style={{
                    flex: 1,
                    padding: '9px 6px',
                    borderRadius: '9px',
                    background: imageStyle === s.id ? 'var(--color-accent-primary)' : 'transparent',
                    color: imageStyle === s.id ? 'white' : 'var(--color-text-muted)',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: imageStyle === s.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 프로필 생성 버튼 */}
            <button
              onClick={handleGenerateProfile}
              disabled={profileGenerating || faceAnalyzing}
              style={{
                width: '100%',
                padding: '13px',
                background: profileGenerating || faceAnalyzing ? 'var(--color-border)' : 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '13px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: profileGenerating || faceAnalyzing ? 'not-allowed' : 'pointer',
                opacity: profileGenerating || faceAnalyzing ? 0.7 : 1,
              }}
            >
              {profileGenerating ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
                  프로필 이미지 만드는 중...
                </span>
              ) : '✨ 프로필 만들기'}
            </button>

            {profileError && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#E53935', textAlign: 'center' }}>{profileError}</p>
            )}

            {/* 생성된 프로필 이미지 결과 */}
            {profileUrl && (
              <div style={{ marginTop: '16px' }}>
                <img
                  src={profileUrl}
                  alt="생성된 프로필"
                  style={{ width: '100%', borderRadius: '16px', display: 'block', marginBottom: '12px' }}
                />
                {profileSaved ? (
                  <div
                    style={{
                      padding: '12px',
                      background: 'var(--color-accent-light)',
                      borderRadius: '12px',
                      color: 'var(--color-accent-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    ✓ 프로필로 저장됐어요! 아래에서 성공의 말을 선택해요
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveProfile}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'var(--color-accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      🌟 프로필로 저장
                    </button>
                    {isRegenerating ? (
                      /* 기존 프로필이 있었을 때 → 취소 */
                      <button
                        onClick={() => {
                          setShowCreationUI(false)
                          setIsRegenerating(false)
                          setProfileUrl(null)
                          setProfileSaved(false)
                        }}
                        style={{
                          padding: '12px 16px',
                          background: 'transparent',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: '12px',
                          fontSize: '13px',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        취소
                      </button>
                    ) : (
                      /* 처음 만들 때 → 다시 */
                      <button
                        onClick={handleGenerateProfile}
                        style={{
                          padding: '12px 16px',
                          background: 'transparent',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: '12px',
                          fontSize: '13px',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        다시
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ───── Step 2 + 3: 성공의 말 선택 & 이미지 생성 ───── */}
      {hasProfile && (
        <>
          {/* Step 2: 성공의 말 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--color-accent-primary)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                  성공의 말 선택
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  1~3개 선택 · {selectedIds.length}/3
                </p>
              </div>
            </div>

            {affirmations.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', background: 'var(--color-bg-card)', borderRadius: '16px' }}>
                저장된 성공의 말이 없어요.{' '}
                <button
                  onClick={() => router.push('/create')}
                  style={{ color: 'var(--color-accent-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                >
                  만들러 가기
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {affirmations.map((aff) => {
                  const isSelected = selectedIds.includes(aff.id)
                  return (
                    <button
                      key={aff.id}
                      onClick={() => toggleSelect(aff.id)}
                      style={{
                        padding: '12px 16px',
                        background: isSelected ? 'var(--color-accent-primary)' : 'var(--color-bg-card)',
                        border: isSelected ? '2px solid var(--color-accent-secondary)' : '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: isSelected ? 'white' : 'var(--color-text-primary)',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        lineHeight: 1.5,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <span style={{ marginRight: '8px' }}>✓</span>}
                      {aff.text}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Step 3: 성공 이미지 생성 */}
          <button
            onClick={handleGenerateSuccess}
            disabled={!canGenerateSuccess}
            style={{
              width: '100%',
              padding: '16px',
              background: canGenerateSuccess ? 'var(--color-accent-primary)' : 'var(--color-border)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: canGenerateSuccess ? 'pointer' : 'not-allowed',
              marginBottom: '24px',
              opacity: canGenerateSuccess ? 1 : 0.6,
            }}
          >
            {successGenerating ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
                AI가 성공 이미지를 그리는 중...
              </span>
            ) : '🌟 성공 이미지 만들기'}
          </button>

          {successError && (
            <div style={{ padding: '14px', background: '#FFF3CD', borderRadius: '12px', color: '#795548', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              {successError}
            </div>
          )}

          {successUrl && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                내 캐릭터의 성공한 미래예요 ✨
              </p>
              <img
                src={successUrl}
                alt="성공 이미지"
                style={{ width: '100%', borderRadius: '20px', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDownload}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'var(--color-accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📥 이미지 저장
                </button>
                <button
                  onClick={handleGenerateSuccess}
                  style={{
                    padding: '14px 18px',
                    background: 'transparent',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '14px',
                    fontSize: '14px',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  다시
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <input
        type="file"
        accept="image/*"
        capture="user"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        textarea:focus { border-color: var(--color-accent-primary) !important; }
      `}</style>
    </div>
  )
}
