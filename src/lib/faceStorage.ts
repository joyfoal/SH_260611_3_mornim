const DB_NAME = 'mornim-face'
const STORE_NAME = 'profiles'
const DB_VERSION = 1

export interface FaceData {
  faceShape: string
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
}

export interface FaceProfile {
  id: 'default'
  createdAt: number
  imageBlob: Blob
  faceData: FaceData
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
