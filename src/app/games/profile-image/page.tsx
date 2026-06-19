'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  getFaceProfile,
  saveFaceProfile,
  type FaceProfile,
  type FaceData,
} from '@/lib/faceStorage'

type Mode = 'face+text' | 'face' | 'text'

function resizeImage(file: File | Blob, maxPx = 800): Promise<string> {
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
      resolve(canvas.toDataURL('image/jpeg', 0.85))
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

const MODES: { id: Mode; label: string; desc: string; btnLabel: string }[] = [
  {
    id: 'face+text',
    label: '얼굴+글',
    desc: '얼굴 사진과 원하는 느낌으로 나만의 긍정 이미지를 만들어요',
    btnLabel: '✨ 내 얼굴로 긍정 이미지 만들기',
  },
  {
    id: 'face',
    label: '얼굴만',
    desc: '얼굴 사진으로 지브리 스타일 캐릭터를 만들어요',
    btnLabel: '✨ 지브리 스타일 캐릭터 만들기',
  },
  {
    id: 'text',
    label: '글만',
    desc: '원하는 느낌이나 긍정의 말로 이미지를 만들어요',
    btnLabel: '✨ 긍정 이미지 만들기',
  },
]

export default function ProfileImagePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>('face+text')
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [faceThumbnail, setFaceThumbnail] = useState<string | null>(null)
  const [faceData, setFaceData] = useState<FaceData | null>(null)
  const [faceAnalyzing, setFaceAnalyzing] = useState(false)
  const [faceError, setFaceError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingProfile, setExistingProfile] = useState<FaceProfile | null>(null)

  useEffect(() => {
    getFaceProfile().then(setExistingProfile).catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (faceThumbnail) URL.revokeObjectURL(faceThumbnail)
    }
  }, [faceThumbnail])

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setGeneratedUrl(null)
    setSaved(false)
    setError(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (faceThumbnail) URL.revokeObjectURL(faceThumbnail)
    setFaceThumbnail(URL.createObjectURL(file))
    setFaceFile(file)
    setFaceData(null)
    setFaceError(null)
    setGeneratedUrl(null)
    setSaved(false)

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
        setFaceError(data.error ?? '얼굴 분석에 실패했어요. 얼굴이 잘 보이는 사진을 사용해 주세요.')
      } else {
        setFaceData(data.faceData)
      }
    } catch {
      setFaceError('얼굴 분석 중 오류가 발생했어요.')
    }
    setFaceAnalyzing(false)
  }

  const canGenerate = () => {
    if (generating || faceAnalyzing) return false
    if (mode === 'text') return text.trim().length > 0
    if (mode === 'face') return faceFile !== null && faceData !== null
    // face+text
    return faceFile !== null && faceData !== null && text.trim().length > 0
  }

  const handleGenerate = async () => {
    if (!canGenerate()) return
    setGenerating(true)
    setError(null)
    setGeneratedUrl(null)
    setSaved(false)

    try {
      let faceImageBase64: string | undefined
      if (faceFile) faceImageBase64 = await resizeImage(faceFile)

      const res = await fetch('/api/generate-profile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          faceImageBase64,
          faceData: faceData ?? undefined,
          text: text.trim() || undefined,
        }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.error) {
        setError(data.error)
      } else if (data.url) {
        setGeneratedUrl(data.url)
      }
    } catch {
      setError('이미지 생성 중 오류가 발생했어요.')
    }
    setGenerating(false)
  }

  const handleSaveAsProfile = async () => {
    if (!generatedUrl) return
    setSaving(true)
    setError(null)
    try {
      const profileBlob = dataURLtoBlob(generatedUrl)

      const profileToSave: FaceProfile = {
        id: 'default',
        createdAt: Date.now(),
        profileImageBlob: profileBlob,
        profileDescription: text.trim() || undefined,
      }

      // 얼굴 데이터 보존
      if (faceData) {
        profileToSave.faceData = faceData
      } else if (existingProfile?.faceData) {
        profileToSave.faceData = existingProfile.faceData
      }

      if (faceFile) {
        profileToSave.imageBlob = faceFile
      } else if (existingProfile?.imageBlob) {
        profileToSave.imageBlob = existingProfile.imageBlob
      }

      await saveFaceProfile(profileToSave)
      setExistingProfile(profileToSave)
      setSaved(true)
    } catch {
      setError('저장 중 오류가 발생했어요.')
    }
    setSaving(false)
  }

  const needsFace = mode === 'face' || mode === 'face+text'
  const needsText = mode === 'text' || mode === 'face+text'
  const currentMode = MODES.find((m) => m.id === mode)!

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
          프로필 이미지 만들기
        </h1>
      </div>

      {/* 모드 탭 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'var(--color-bg-card)', borderRadius: '14px', padding: '4px' }}>
        {MODES.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleModeChange(tab.id)}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: '10px',
              background: mode === tab.id ? 'var(--color-accent-primary)' : 'transparent',
              color: mode === tab.id ? 'white' : 'var(--color-text-muted)',
              border: 'none',
              fontSize: '13px',
              fontWeight: mode === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 모드 설명 */}
      <div
        style={{
          padding: '12px 14px',
          background: 'var(--color-accent-light)',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--color-accent-primary)',
          lineHeight: 1.5,
        }}
      >
        {currentMode.desc}
      </div>

      {/* 얼굴 사진 섹션 */}
      {needsFace && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            background: 'var(--color-bg-card)',
            borderRadius: '16px',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            얼굴 사진
          </p>

          {faceAnalyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '18px' }}>✨</span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>AI가 얼굴을 분석하는 중...</span>
            </div>
          ) : faceThumbnail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src={faceThumbnail}
                alt="얼굴 사진"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: faceData ? '2.5px solid var(--color-accent-primary)' : '2px solid var(--color-border)',
                }}
              />
              <div>
                <p style={{ fontSize: '13px', color: faceData ? 'var(--color-accent-primary)' : 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>
                  {faceData ? '✓ 얼굴 분석 완료' : '분석 중 오류 발생'}
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
                padding: '16px',
                background: 'var(--color-bg-surface)',
                border: '1.5px dashed var(--color-border)',
                borderRadius: '12px',
                fontSize: '14px',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '22px' }}>📷</span>
              얼굴 사진 선택하기
            </button>
          )}

          {faceError && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#FFF3CD', borderRadius: '10px', color: '#795548', fontSize: '13px' }}>
              {faceError}
            </div>
          )}
        </div>
      )}

      {/* 글 입력 섹션 */}
      {needsText && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '10px' }}>
            {mode === 'face+text' ? '원하는 분위기나 느낌' : '원하는 느낌이나 긍정의 말'}
          </p>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setGeneratedUrl(null); setSaved(false) }}
            placeholder={
              mode === 'face+text'
                ? '예: 따뜻한 햇살 아래 자유롭고 행복한 느낌'
                : '예: 자유롭고 행복하게, 꿈을 이루는 나'
            }
            rows={3}
            style={{
              width: '100%',
              padding: '13px 14px',
              background: 'var(--color-bg-card)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '12px',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.6,
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate()}
        style={{
          width: '100%',
          padding: '16px',
          background: canGenerate() ? 'var(--color-accent-primary)' : 'var(--color-border)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: canGenerate() ? 'pointer' : 'not-allowed',
          marginBottom: '24px',
          opacity: canGenerate() ? 1 : 0.6,
          transition: 'opacity 0.2s ease',
        }}
      >
        {generating ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
            AI가 이미지를 그리는 중...
          </span>
        ) : currentMode.btnLabel}
      </button>

      {error && (
        <div style={{ padding: '14px', background: '#FFF3CD', borderRadius: '12px', color: '#795548', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* 생성 결과 */}
      {generatedUrl && (
        <div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px', textAlign: 'center' }}>
            생성된 프로필 이미지예요 ✨
          </p>
          <img
            src={generatedUrl}
            alt="생성된 프로필 이미지"
            style={{ width: '100%', borderRadius: '20px', marginBottom: '16px', display: 'block' }}
          />

          {saved ? (
            <div
              style={{
                padding: '16px',
                background: 'var(--color-accent-light)',
                borderRadius: '14px',
                color: 'var(--color-accent-primary)',
                fontSize: '15px',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              ✓ 프로필로 저장됐어요!
            </div>
          ) : (
            <button
              onClick={handleSaveAsProfile}
              disabled={saving}
              style={{
                width: '100%',
                padding: '15px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
              }}
            >
              {saving ? '저장 중...' : '🌟 프로필로 저장하기'}
            </button>
          )}

          {saved && (
            <button
              onClick={() => router.push('/games/success-image')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--color-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              🌟 성공 이미지 만들러 가기
            </button>
          )}

          <button
            onClick={handleGenerate}
            style={{
              width: '100%',
              padding: '13px',
              background: 'transparent',
              border: '1.5px solid var(--color-border)',
              borderRadius: '14px',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            다시 만들기
          </button>
        </div>
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
