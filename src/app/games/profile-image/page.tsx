'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getFaceProfile, saveFaceProfile, type FaceProfile } from '@/lib/faceStorage'

function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}

const CROP_PX = 280

export default function ProfileImagePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const [existingProfile, setExistingProfile] = useState<FaceProfile | null>(null)
  const [existingUrl, setExistingUrl] = useState<string | null>(null)

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [cropZoom, setCropZoom] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getFaceProfile().then((p) => {
      setExistingProfile(p)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!existingProfile?.profileImageBlob) { setExistingUrl(null); return }
    const url = URL.createObjectURL(existingProfile.profileImageBlob)
    setExistingUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [existingProfile])

  useEffect(() => {
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl) }
  }, [photoPreviewUrl])

  const clampOffset = (ox: number, oy: number, zoom: number, imgNW: number, imgNH: number) => {
    const minX = CROP_PX * (1 - zoom)
    const minY = CROP_PX * (1 - (imgNH / imgNW) * zoom)
    return { x: Math.max(minX, Math.min(0, ox)), y: Math.max(minY, Math.min(0, oy)) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    e.target.value = ''
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    setCropOffset({ x: 0, y: 0 })
    setCropZoom(1)
    setSaved(false)
    setError(null)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: cropOffset.x, oy: cropOffset.y }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !cropImgRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const img = cropImgRef.current
    const { x, y } = clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, cropZoom, img.naturalWidth, img.naturalHeight)
    setCropOffset({ x, y })
  }

  const handlePointerUp = () => { dragRef.current = null }

  const handleSave = async () => {
    if (!cropImgRef.current || !photoPreviewUrl) return
    setSaving(true)
    setError(null)
    try {
      const img = cropImgRef.current
      const displayToNatural = img.naturalWidth / CROP_PX
      const srcX = (-cropOffset.x / cropZoom) * displayToNatural
      const srcY = (-cropOffset.y / cropZoom) * displayToNatural
      const srcW = (CROP_PX / cropZoom) * displayToNatural
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcW, 0, 0, 1024, 1024)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      const blob = dataURLtoBlob(dataUrl)
      const profileToSave: FaceProfile = {
        id: 'default',
        createdAt: Date.now(),
        profileImageBlob: blob,
      }
      await saveFaceProfile(profileToSave)
      setExistingProfile(profileToSave)
      setPhotoPreviewUrl(null)
      setSaved(true)
    } catch {
      setError('저장 중 오류가 발생했어요.')
    }
    setSaving(false)
  }

  const minZoom = cropImgRef.current
    ? Math.max(1, (cropImgRef.current.naturalHeight / cropImgRef.current.naturalWidth))
    : 1

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-primary)', padding: '20px 16px 48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '22px', padding: '4px', lineHeight: 1 }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          프로필 사진 등록
        </h1>
      </div>

      {/* 등록된 사진 */}
      {existingUrl && !photoPreviewUrl && (
        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--color-bg-card)', borderRadius: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>현재 등록된 사진</p>
          <img
            src={existingUrl}
            alt="등록된 프로필"
            style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2.5px solid var(--color-accent-primary)' }}
          />
        </div>
      )}

      {/* 크롭 UI */}
      {photoPreviewUrl ? (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            위치와 크기를 조절해 주세요
          </p>
          <div
            style={{ width: `${CROP_PX}px`, height: `${CROP_PX}px`, overflow: 'hidden', borderRadius: '50%', border: '2.5px solid var(--color-accent-primary)', cursor: 'grab', margin: '0 auto 16px', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={cropImgRef}
              src={photoPreviewUrl}
              alt="크롭 미리보기"
              draggable={false}
              style={{
                width: `${CROP_PX * cropZoom}px`,
                transformOrigin: '0 0',
                transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                display: 'block',
                userSelect: 'none',
              }}
              onLoad={(e) => {
                const img = e.currentTarget
                const ratio = img.naturalHeight / img.naturalWidth
                const initZoom = Math.max(1, ratio)
                setCropZoom(initZoom)
                setCropOffset(clampOffset(0, (CROP_PX - CROP_PX * ratio * initZoom) / 2, initZoom, img.naturalWidth, img.naturalHeight))
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>축소</span>
            <input
              type="range"
              min={minZoom}
              max={4}
              step={0.01}
              value={cropZoom}
              onChange={(e) => {
                const z = parseFloat(e.target.value)
                if (!cropImgRef.current) return
                const img = cropImgRef.current
                setCropZoom(z)
                setCropOffset((prev) => clampOffset(prev.x, prev.y, z, img.naturalWidth, img.naturalHeight))
              }}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>확대</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', padding: '15px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '8px' }}
          >
            {saving ? '저장 중...' : '이 위치로 저장하기'}
          </button>
          <button
            onClick={() => { setPhotoPreviewUrl(null); setSaved(false) }}
            style={{ width: '100%', padding: '13px', background: 'transparent', border: '1.5px solid var(--color-border)', borderRadius: '14px', fontSize: '14px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setSaved(false); fileInputRef.current?.click() }}
          style={{ width: '100%', padding: '16px', background: 'var(--color-bg-card)', border: '1.5px dashed var(--color-border)', borderRadius: '16px', fontSize: '15px', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}
        >
          <span style={{ fontSize: '24px' }}>📷</span>
          {existingUrl ? '사진 변경하기' : '사진 선택하기'}
        </button>
      )}

      {/* 저장 완료 */}
      {saved && (
        <div>
          <div style={{ padding: '14px', background: 'var(--color-accent-light)', borderRadius: '12px', color: 'var(--color-accent-primary)', fontSize: '14px', fontWeight: 600, textAlign: 'center', marginBottom: '12px' }}>
            ✓ 프로필 사진이 저장됐어요!
          </div>
          <button
            onClick={() => router.push('/home/success-image')}
            style={{ width: '100%', padding: '14px', background: 'var(--color-accent-primary)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            🌟 성공 이미지 만들러 가기
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 14px', background: 'var(--color-warning-bg)', borderRadius: '12px', color: 'var(--color-warning)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  )
}
