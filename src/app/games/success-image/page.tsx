'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAffirmations, type Affirmation } from '@/lib/storage'
import {
  getFaceProfile,
  saveFaceProfile,
  deleteFaceProfile,
  type FaceProfile,
  type FaceData,
} from '@/lib/faceStorage'

// analyze-face API 전송용 (JPEG 경량화)
function resizeImage(file: File | Blob, maxPx = 800, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
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

// 성공 이미지 생성용 — 얼굴 이미지 + 마스크 동시 생성
// 마스크: 얼굴 타원 = 불투명(보존), 나머지 = 투명(편집 허용)
// bbox 있으면 실제 얼굴 위치 기반, 없으면 고정 타원 폴백
function resizeWithMask(
  file: File | Blob,
  maxPx = 768,
  bbox?: { x: number; y: number; w: number; h: number }
): Promise<{ imageBase64: string; maskBase64: string }> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(maxPx / img.naturalWidth, maxPx / img.naturalHeight, 1)
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)

      const imgCanvas = document.createElement('canvas')
      imgCanvas.width = w; imgCanvas.height = h
      imgCanvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      const imageBase64 = imgCanvas.toDataURL('image/png')

      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = w; maskCanvas.height = h
      const ctx = maskCanvas.getContext('2d')!
      ctx.clearRect(0, 0, w, h)   // 전체 투명 = 편집 허용
      ctx.fillStyle = 'white'
      ctx.beginPath()
      // bbox 있으면 실제 얼굴 위치·크기 기반, 없으면 고정 중심 폴백
      const cx = bbox ? w * (bbox.x + bbox.w / 2) : w * 0.50
      const cy = bbox ? h * (bbox.y + bbox.h / 2) : h * 0.40
      const rx = bbox ? w * bbox.w * 0.54 : w * 0.38   // 약간 여유
      const ry = bbox ? h * bbox.h * 0.54 : h * 0.42
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()                   // 얼굴 타원 = 불투명 = 원본 픽셀 보존
      const maskBase64 = maskCanvas.toDataURL('image/png')

      resolve({ imageBase64, maskBase64 })
    }
    img.src = objectUrl
  })
}

const FACE_TRAIT_LABELS: Record<string, string> = {
  oval: '계란형', round: '둥근형', square: '각진형', heart: '하트형',
  diamond: '다이아몬드형', oblong: '긴형',
}

export default function SuccessImagePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [faceProfile, setFaceProfile] = useState<FaceProfile | null>(null)
  const [faceAnalyzing, setFaceAnalyzing] = useState(false)
  const [faceError, setFaceError] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [usedFace, setUsedFace] = useState(false)

  useEffect(() => {
    setAffirmations(getAffirmations())
    getFaceProfile().then(setFaceProfile).catch(() => {})
  }, [])

  useEffect(() => {
    if (!faceProfile?.imageBlob) {
      setThumbnailUrl(null)
      return
    }
    const url = URL.createObjectURL(faceProfile.imageBlob)
    setThumbnailUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [faceProfile])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // 새 얼굴 등록 시 이전 데이터 전부 초기화
    setFaceAnalyzing(true)
    setFaceError(null)
    setImageUrl(null)
    setError(null)
    setUsedFace(false)
    await deleteFaceProfile().catch(() => {})

    try {
      const imageBase64 = await resizeImage(file)
      const res = await fetch('/api/analyze-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      const data = await res.json() as { faceData?: FaceData; error?: string }
      if (!res.ok || !data.faceData) {
        setFaceError(data.error ?? '얼굴 분석에 실패했어요. 얼굴이 잘 보이는 정면 사진을 사용해 주세요.')
        setFaceAnalyzing(false)
        return
      }
      await saveFaceProfile({
        id: 'default',
        createdAt: Date.now(),
        imageBlob: file,
        faceData: data.faceData,
      })
      const updated = await getFaceProfile()
      setFaceProfile(updated)
    } catch {
      setFaceError('얼굴 분석 중 오류가 발생했어요.')
    }
    setFaceAnalyzing(false)
  }

  const handleDeleteFace = async () => {
    await deleteFaceProfile().catch(() => {})
    setFaceProfile(null)
    setFaceError(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return

    // 기존 결과 즉시 초기화
    setImageUrl(null)
    setError(null)
    setUsedFace(false)
    setGenerating(true)

    const selected = affirmations.filter((a) => selectedIds.includes(a.id))
    const affirmationTexts = selected.map((a) => a.text)

    try {
      // 매번 IndexedDB에서 최신 얼굴 데이터 새로 불러오기
      const latestProfile = await getFaceProfile().catch(() => null)

      const body: { affirmations: string[]; faceData?: FaceData; faceImageBase64?: string; faceMaskBase64?: string } = {
        affirmations: affirmationTexts,
      }
      if (latestProfile?.imageBlob) {
        const { imageBase64, maskBase64 } = await resizeWithMask(
          latestProfile.imageBlob,
          768,
          latestProfile.faceData.faceBoundingBox
        )
        body.faceImageBase64 = imageBase64
        body.faceMaskBase64 = maskBase64
        body.faceData = latestProfile.faceData
        setUsedFace(true)
      } else if (latestProfile?.faceData.generationPrompt) {
        body.faceData = latestProfile.faceData
        setUsedFace(true)
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.error) {
        setError(data.error)
        setUsedFace(false)
      } else if (data.url) {
        setImageUrl(data.url)
      }
    } catch {
      setError('이미지 생성 중 오류가 발생했어요.')
      setUsedFace(false)
    }
    setGenerating(false)
  }

  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = 'mornim-success-image.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg-primary)',
        padding: '20px 16px 40px',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '20px', padding: '4px' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          성공 이미지 만들기
        </h1>
      </div>

      {/* 설명 */}
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--color-accent-light)',
          borderRadius: '14px',
          marginBottom: '24px',
          fontSize: '13px',
          color: 'var(--color-accent-primary)',
          lineHeight: 1.6,
        }}
      >
        <strong>AI가 당신의 얼굴과 성공의 말로 미래 모습을 그려드려요 🌟</strong><br />
        얼굴 사진을 등록하면 더 실제 같은 성공 이미지를 만들 수 있어요.
      </div>

      {/* 섹션 1: 얼굴 등록 */}
      <div
        style={{
          padding: '16px',
          background: 'var(--color-bg-card)',
          borderRadius: '16px',
          marginBottom: '24px',
        }}
      >
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
          얼굴 등록 <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-text-muted)' }}>(선택)</span>
        </p>

        {faceAnalyzing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '18px' }}>✨</span>
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>AI가 얼굴을 분석하는 중...</span>
          </div>
        ) : faceProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="얼굴 사진"
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--color-accent-primary)' }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {[
                  FACE_TRAIT_LABELS[faceProfile.faceData.faceShape] ?? faceProfile.faceData.faceShape,
                  faceProfile.faceData.eyeShape,
                  faceProfile.faceData.skinTone,
                  faceProfile.faceData.eyewear && faceProfile.faceData.eyewear !== 'none'
                    ? faceProfile.faceData.eyewear === 'glasses' ? '안경' : '선글라스'
                    : null,
                ].filter(Boolean).map((trait) => (
                  <span
                    key={trait}
                    style={{
                      padding: '2px 8px',
                      background: 'var(--color-accent-light)',
                      color: 'var(--color-accent-primary)',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '12px', color: 'var(--color-accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  변경
                </button>
                <button
                  onClick={handleDeleteFace}
                  style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '14px',
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
            <span style={{ fontSize: '20px' }}>📷</span>
            얼굴 사진 등록하기
          </button>
        )}

        {faceError && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: '#FFF3CD',
              borderRadius: '10px',
              color: '#795548',
              fontSize: '13px',
            }}
          >
            {faceError}
          </div>
        )}
      </div>

      {/* 섹션 2: 성공의 말 선택 */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          성공의 말 선택 (1~3개)
        </p>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          {selectedIds.length}/3 선택됨
        </p>
        {affirmations.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
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

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={selectedIds.length === 0 || generating}
        style={{
          width: '100%',
          padding: '16px',
          background: selectedIds.length > 0 ? 'var(--color-accent-primary)' : 'var(--color-border)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
          marginBottom: '24px',
          opacity: selectedIds.length === 0 ? 0.6 : 1,
        }}
      >
        {generating ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
            AI가 이미지를 그리는 중...
          </span>
        ) : faceProfile
          ? '🌟 내 얼굴로 성공 이미지 만들기'
          : '🌟 성공 이미지 만들기'
        }
      </button>

      {error && (
        <div
          style={{
            padding: '14px',
            background: '#FFF3CD',
            borderRadius: '12px',
            color: '#795548',
            fontSize: '14px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* 섹션 3: 생성 결과 */}
      {imageUrl && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            {usedFace ? '당신의 얼굴 특징을 반영한 성공 이미지예요 ✨' : '당신의 성공한 미래예요 ✨'}
          </div>
          <img
            src={imageUrl}
            alt="성공 이미지"
            style={{ width: '100%', borderRadius: '20px', marginBottom: '16px' }}
          />
          <button
            onClick={handleDownload}
            style={{
              padding: '14px 32px',
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
        </div>
      )}

      {/* hidden file input */}
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
      `}</style>
    </div>
  )
}
