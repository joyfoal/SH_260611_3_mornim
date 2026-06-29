'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getAffirmations, type Affirmation } from '@/lib/storage'
import {
  getFaceProfile,
  saveFaceProfile,
  deleteFaceProfile,
  clearFaceStorage,
  type FaceProfile,
} from '@/lib/faceStorage'
import { saveSuccessImage, clearSuccessImages } from '@/lib/successImageStorage'
import { clearAllAudioRecords } from '@/lib/audioStorage'
import { clearAllData } from '@/lib/storage'

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
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 저장된 프로필
  const [savedProfile, setSavedProfile] = useState<FaceProfile | null>(null)
  const [savedProfileUrl, setSavedProfileUrl] = useState<string | null>(null)

  // 사진 업로드
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)

  // 성공 이미지 스타일
  const [imageStyle, setImageStyle] = useState<'cartoon' | 'realistic'>('cartoon')

  // 성공 이미지 생성
  const [successGenerating, setSuccessGenerating] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [successError, setSuccessError] = useState<string | null>(null)

  const IMAGE_GEN_KEY = 'ealo-image-gen-count'
  const MAX_DAILY = 3

  function getDailyCount(key: string): number {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return 0
      const data = JSON.parse(raw) as { date: string; count: number }
      const today = new Date().toISOString().split('T')[0]
      return data.date === today ? data.count : 0
    } catch { return 0 }
  }

  function incrementDailyCount(key: string): void {
    try {
      const today = new Date().toISOString().split('T')[0]
      const current = getDailyCount(key)
      localStorage.setItem(key, JSON.stringify({ date: today, count: current + 1 }))
    } catch {}
  }

  useEffect(() => {
    setAffirmations(getAffirmations())
    getFaceProfile().then((p) => {
      setSavedProfile(p)
    }).catch(() => {})
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
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl) }
  }, [photoPreviewUrl])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoFile(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    setSuccessUrl(null)
  }

  const handleSavePhoto = async () => {
    if (!photoFile) return
    setPhotoSaving(true)
    try {
      const resizedDataUrl = await resizeImage(photoFile, 800)
      const profileBlob = dataURLtoBlob(resizedDataUrl)
      const toSave: FaceProfile = {
        id: 'default',
        createdAt: Date.now(),
        profileImageBlob: profileBlob,
        imageBlob: photoFile,
      }
      await saveFaceProfile(toSave)
      setSavedProfile(toSave)
      setPhotoFile(null)
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl(null)
    } catch {}
    setPhotoSaving(false)
  }

  const handleResetPhoto = async () => {
    clearAllData()
    await Promise.all([
      deleteFaceProfile().catch(() => {}),
      clearFaceStorage().catch(() => {}),
      clearSuccessImages().catch(() => {}),
      clearAllAudioRecords().catch(() => {}),
    ])
    setSavedProfile(null)
    setSavedProfileUrl(null)
    setPhotoFile(null)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
    setSelectedIds([])
    setSuccessUrl(null)
    setSuccessError(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const hasProfile = !!savedProfile?.profileImageBlob

  const handleGenerateSuccess = async () => {
    if (!hasProfile || selectedIds.length === 0) return
    if (getDailyCount(IMAGE_GEN_KEY) >= MAX_DAILY) {
      setSuccessError('오늘은 성공 이미지 생성을 모두 사용했어요. 내일 다시 시도해보세요.')
      return
    }
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
          imageStyle,
        }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.error) {
        setSuccessError(data.error)
      } else if (data.url) {
        setSuccessUrl(data.url)
        incrementDailyCount(IMAGE_GEN_KEY)
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
    a.download = 'ealo-성공이미지.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

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

      {/* ───── Step 1: 내 사진 추가 ───── */}
      <div
        style={{
          padding: '18px 16px',
          background: 'var(--color-bg-card)',
          borderRadius: '20px',
          marginBottom: '20px',
        }}
      >
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
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            내 사진 추가
          </p>
        </div>

        {/* 저장된 프로필 표시 */}
        {hasProfile && savedProfileUrl && !photoPreviewUrl ? (
          <div>
            <img
              src={savedProfileUrl}
              alt="내 사진"
              style={{
                width: '100%',
                borderRadius: '16px',
                display: 'block',
                marginBottom: '12px',
                border: '2px solid var(--color-accent-secondary)',
                maxHeight: '260px',
                objectFit: 'cover',
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
              ✓ 사진이 준비됐어요 · 아래에서 성공의 말을 선택해요
            </div>
            <button
              onClick={handleResetPhoto}
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
              사진 변경하기
            </button>
          </div>
        ) : photoPreviewUrl ? (
          /* 새 사진 선택 후 미리보기 */
          <div>
            <img
              src={photoPreviewUrl}
              alt="선택한 사진"
              style={{
                width: '100%',
                borderRadius: '12px',
                marginBottom: '10px',
                display: 'block',
                maxHeight: '260px',
                objectFit: 'cover',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSavePhoto}
                disabled={photoSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--color-accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: photoSaving ? 'not-allowed' : 'pointer',
                  opacity: photoSaving ? 0.7 : 1,
                }}
              >
                {photoSaving ? '저장 중...' : '이 사진 사용하기'}
              </button>
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                변경
              </button>
            </div>
          </div>
        ) : (
          /* 사진 없음: 업로드 버튼 */
          <button
            onClick={() => photoInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '32px 16px',
              background: 'var(--color-bg-primary)',
              border: '1.5px dashed var(--color-border)',
              borderRadius: '14px',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '32px' }}>📷</span>
            <span>내 사진 추가하기</span>
          </button>
        )}
      </div>

      {/* ───── Step 2: 스타일 선택 & 성공의 말 ───── */}
      {hasProfile && (
        <>
          <div style={{ marginBottom: '20px' }}>
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
                2
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                  스타일 & 성공의 말 선택
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  성공의 말 1~3개 · {selectedIds.length}/3
                </p>
              </div>
            </div>

            {/* 스타일 선택 */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '16px',
                padding: '4px',
                background: 'var(--color-bg-card)',
                borderRadius: '14px',
              }}
            >
              {([
                { id: 'cartoon', label: '✨ 만화 느낌' },
                { id: 'realistic', label: '📸 사진 느낌' },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setImageStyle(s.id)}
                  style={{
                    flex: 1,
                    padding: '10px 6px',
                    borderRadius: '10px',
                    background: imageStyle === s.id ? 'var(--color-accent-primary)' : 'transparent',
                    color: imageStyle === s.id ? 'white' : 'var(--color-text-muted)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: imageStyle === s.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 성공의 말 목록 */}
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

          {/* 성공 이미지 생성 버튼 */}
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
                나의 성공한 미래예요 ✨
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
        ref={photoInputRef}
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
