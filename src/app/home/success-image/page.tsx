'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/ui/AppLayout'
import { Camera, ImageIcon, Loader2, Download, Sparkles, ZoomIn, Film } from 'lucide-react'
import { getAffirmations, type Affirmation } from '@/lib/storage'
import {
  getFaceProfile,
  saveFaceProfile,
  clearFaceStorage,
  type FaceProfile,
} from '@/lib/faceStorage'
import { saveSuccessImage } from '@/lib/successImageStorage'

function resizeImage(file: File | Blob, maxPx = 900, format: 'jpeg' | 'png' = 'jpeg'): Promise<string> {
  return new Promise((resolve, reject) => {
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
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지를 불러올 수 없어요.'))
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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [photoSaved, setPhotoSaved] = useState(false)
  const [photoRegistered, setPhotoRegistered] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // 크롭
  const CROP_PX = 280
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  // 성공 이미지 스타일
  const [imageStyle, setImageStyle] = useState<'cartoon' | 'realistic'>('cartoon')

  // 성공 이미지 생성
  const [successGenerating, setSuccessGenerating] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [successError, setSuccessError] = useState<string | null>(null)
  const [dailyCount, setDailyCount] = useState(0)

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
    setDailyCount(getDailyCount(IMAGE_GEN_KEY))
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

  const clampOffset = (ox: number, oy: number, zoom: number, imgNW: number, imgNH: number) => {
    const minX = CROP_PX * (1 - zoom)
    const minY = CROP_PX * (1 - (imgNH / imgNW) * zoom)
    return {
      x: Math.max(minX, Math.min(0, ox)),
      y: Math.max(minY, Math.min(0, oy)),
    }
  }

  const applyPhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    setPhotoError(null)
    setSuccessUrl(null)
    setCropOffset({ x: 0, y: 0 })
    setCropZoom(1)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    applyPhotoFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) applyPhotoFile(file)
  }

  const handleSavePhoto = async () => {
    if (!cropImgRef.current) return
    setPhotoSaving(true)
    setPhotoError(null)
    try {
      const img = cropImgRef.current
      const displayToNatural = img.naturalWidth / CROP_PX
      const srcX = (-cropOffset.x / cropZoom) * displayToNatural
      const srcY = (-cropOffset.y / cropZoom) * displayToNatural
      const srcW = (CROP_PX / cropZoom) * displayToNatural
      const OUTPUT = 1024
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT
      canvas.height = OUTPUT
      canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcW, 0, 0, OUTPUT, OUTPUT)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      const profileBlob = dataURLtoBlob(dataUrl)
      const toSave: FaceProfile = { id: 'default', createdAt: Date.now(), profileImageBlob: profileBlob }
      await saveFaceProfile(toSave)
      setSavedProfile(toSave)
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl(null)
      setPhotoSaved(true)
      setTimeout(() => setPhotoSaved(false), 2500)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '사진 저장에 실패했어요.')
    }
    setPhotoSaving(false)
  }

  const handleResetPhoto = async () => {
    await clearFaceStorage().catch(() => {})
    setSavedProfile(null)
    setSavedProfileUrl(null)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
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

  const handleRegisterPhotoAsSuccess = async () => {
    if (!savedProfile?.profileImageBlob) return
    try {
      const resized = await resizeImage(savedProfile.profileImageBlob, 1024, 'png')
      const blob = dataURLtoBlob(resized)
      await saveSuccessImage(blob)
      setSuccessUrl(resized)
      setPhotoRegistered(true)
      setTimeout(() => setPhotoRegistered(false), 2500)
    } catch {}
  }

  const handleGenerateSuccess = async () => {
    if (!hasProfile || selectedIds.length === 0) return
    if (dailyCount >= MAX_DAILY) return
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
        setDailyCount((c) => c + 1)
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

  const isLimitReached = dailyCount >= MAX_DAILY
  const canGenerateSuccess = hasProfile && selectedIds.length > 0 && !successGenerating && !isLimitReached

  return (
    <>
    {photoSaved && (
      <div style={{
        position: 'fixed', top: '60px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-accent-primary)',
        color: 'white', padding: '10px 20px', borderRadius: '20px',
        fontSize: '14px', fontWeight: 600, zIndex: 100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
      }}>
        ✓ 사진이 등록되었어요
      </div>
    )}
    {photoRegistered && (
      <div style={{
        position: 'fixed', top: '60px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--color-accent-primary)',
        color: 'white', padding: '10px 20px', borderRadius: '20px',
        fontSize: '14px', fontWeight: 600, zIndex: 100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
      }}>
        ✓ 성공 이미지로 등록됐어요
      </div>
    )}
    <AppLayout activeTab="홈">
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-bg-primary)', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
      <div style={{ padding: '0 16px 48px' }}>

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
              onClick={handleRegisterPhotoAsSuccess}
              style={{
                width: '100%',
                padding: '11px',
                background: 'transparent',
                border: '1.5px solid var(--color-accent-primary)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-accent-primary)',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              이 사진을 성공 이미지로 등록
            </button>
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
          /* 새 사진 선택 후 크롭 조정 */
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px', textAlign: 'center' }}>
              드래그로 위치 조정 · 슬라이더로 확대/축소
            </p>
            {/* 크롭 뷰파인더 */}
            <div
              style={{
                width: `${CROP_PX}px`,
                height: `${CROP_PX}px`,
                overflow: 'hidden',
                borderRadius: '14px',
                marginBottom: '10px',
                position: 'relative',
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
                border: '2px solid var(--color-accent-primary)',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                dragRef.current = { startX: e.clientX, startY: e.clientY, ox: cropOffset.x, oy: cropOffset.y }
              }}
              onPointerMove={(e) => {
                if (!dragRef.current || !cropImgRef.current) return
                const dx = e.clientX - dragRef.current.startX
                const dy = e.clientY - dragRef.current.startY
                const img = cropImgRef.current
                const clamped = clampOffset(
                  dragRef.current.ox + dx,
                  dragRef.current.oy + dy,
                  cropZoom,
                  img.naturalWidth,
                  img.naturalHeight,
                )
                setCropOffset(clamped)
              }}
              onPointerUp={() => { dragRef.current = null }}
              onPointerCancel={() => { dragRef.current = null }}
            >
              <img
                ref={cropImgRef}
                src={photoPreviewUrl}
                alt="크롭 미리보기"
                draggable={false}
                onLoad={() => {
                  const img = cropImgRef.current
                  if (!img) return
                  const ratio = img.naturalHeight / img.naturalWidth
                  const minZ = ratio < 1 ? 1 / ratio : 1
                  const dispH = CROP_PX * ratio * minZ
                  const initY = dispH > CROP_PX ? -(dispH - CROP_PX) / 2 : 0
                  setCropZoom(minZ)
                  setCropOffset(clampOffset(0, initY, minZ, img.naturalWidth, img.naturalHeight))
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${CROP_PX}px`,
                  height: 'auto',
                  transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                  transformOrigin: '0 0',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            </div>
            {/* 줌 슬라이더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ZoomIn size={16} color="var(--color-text-muted)" />
              <input
                type="range"
                min={cropImgRef.current
                  ? Math.max(1, cropImgRef.current.naturalWidth / cropImgRef.current.naturalHeight)
                  : 1}
                max={4}
                step={0.01}
                value={cropZoom}
                onChange={(e) => {
                  const zoom = Number(e.target.value)
                  const img = cropImgRef.current
                  if (!img) return
                  const clamped = clampOffset(cropOffset.x, cropOffset.y, zoom, img.naturalWidth, img.naturalHeight)
                  setCropZoom(zoom)
                  setCropOffset(clamped)
                }}
                style={{ flex: 1, accentColor: 'var(--color-accent-primary)' }}
              />
            </div>
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
                {photoSaving ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    저장 중...
                  </span>
                ) : '이 위치로 사용하기'}
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
            {photoError && (
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-danger)', textAlign: 'center' }}>
                {photoError}
              </p>
            )}
          </div>
        ) : (
          /* 사진 없음: 드래그 or 클릭 업로드 */
          <div
            onClick={() => photoInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              width: '100%',
              padding: '36px 16px',
              background: isDragOver ? 'var(--color-accent-light)' : 'var(--color-bg-primary)',
              border: isDragOver ? '2px dashed var(--color-accent-primary)' : '1.5px dashed var(--color-border)',
              borderRadius: '14px',
              fontSize: '14px',
              color: isDragOver ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            {isDragOver ? <ImageIcon size={36} color="var(--color-accent-primary)" /> : <Camera size={36} color="var(--color-text-muted)" />}
            <span style={{ fontWeight: isDragOver ? 600 : 400 }}>
              {isDragOver ? '여기에 놓으세요' : '사진을 드래그하거나 탭해서 추가'}
            </span>
          </div>
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
                  성공의 말 3개를 선택하여 이미지에 반영할 수 있어요 · {selectedIds.length}/3
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
                { id: 'cartoon', label: '만화 느낌', Icon: Sparkles },
                { id: 'realistic', label: '사진 느낌', Icon: Film },
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
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <s.Icon size={14} /> {s.label}
                  </span>
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

          {/* 오늘 남은 횟수 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: isLimitReached ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
              오늘 {dailyCount}/{MAX_DAILY}회 사용
            </span>
          </div>

          {/* 한도 초과 배너 */}
          {isLimitReached && (
            <div style={{ padding: '16px', background: 'var(--color-danger-bg)', borderRadius: '14px', textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '4px' }}>오늘 기회를 모두 사용했어요</p>
              <p style={{ fontSize: '13px', color: 'var(--color-danger)', opacity: 0.8 }}>내일 다시 3번 도전할 수 있어요</p>
            </div>
          )}

          {/* 성공 이미지 생성 버튼 */}
          {!isLimitReached && (
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
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  AI가 성공 이미지를 그리는 중...
                </span>
              ) : <span style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'center' }}><Sparkles size={18} /> 성공 이미지 만들기</span>}
            </button>
          )}

          {successError && (
            <div style={{ padding: '14px', background: 'var(--color-warning-bg)', borderRadius: '12px', color: 'var(--color-warning)', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              {successError}
            </div>
          )}

          {successUrl && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                나의 성공한 미래예요
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Download size={16} /> 이미지 저장</span>
                </button>
                {!isLimitReached && <button
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
                </button>}
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
    </AppLayout>
    </>
  )
}
