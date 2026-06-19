const DB_NAME = 'mornim-face'
const STORE_NAME = 'profiles'
const DB_VERSION = 1

export interface FaceData {
  gender: string              // "female" | "male" | "unknown"
  faceShape: string
  faceAngle: string           // "front" | "three-quarter" | "side" | "tilted"
  eyeShape: string
  eyeColor: string
  eyeSpacing: string
  noseShape: string
  lipShape: string
  jawlineType: string
  cheekbonePosition: string
  skinTone: string
  distinctiveFeatures: string
  eyewear: string             // "glasses" | "sunglasses" | "none"
  generationPrompt: string
  faceBoundingBox?: { x: number; y: number; w: number; h: number }
}

export interface FaceProfile {
  id: 'default'
  createdAt: number
  imageBlob?: Blob              // 원본 얼굴 사진 (선택)
  faceData?: FaceData           // 얼굴 분석 결과 (선택)
  profileImageBlob?: Blob       // AI가 생성한 스타일 캐릭터 이미지
  profileDescription?: string   // 캐릭터 생성 시 사용한 설명
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveFaceProfile(profile: FaceProfile): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(profile)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getFaceProfile(): Promise<FaceProfile | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get('default')
    req.onsuccess = () => resolve((req.result as FaceProfile) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteFaceProfile(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete('default')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
