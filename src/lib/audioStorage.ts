const DB_NAME = 'mornim-audio'
const STORE_NAME = 'recordings'
const DB_VERSION = 1
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface AudioRecord {
  id: string
  affirmationId: string
  affirmationText: string
  blob: Blob
  createdAt: number
  keepForever: boolean
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

export async function saveAudioRecord(record: AudioRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAudioRecords(): Promise<AudioRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const now = Date.now()
      const records = (req.result as AudioRecord[]).filter(
        (r) => r.keepForever || now - r.createdAt < SEVEN_DAYS_MS
      )
      resolve(records.sort((a, b) => b.createdAt - a.createdAt))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getAudioRecord(id: string): Promise<AudioRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve((req.result as AudioRecord) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function setAudioKeepForever(id: string, keep: boolean): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const existing = getReq.result as AudioRecord | undefined
      if (!existing) { resolve(); return }
      store.put({ ...existing, keepForever: keep })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteExpiredAudioRecords(): Promise<void> {
  const db = await openDB()
  const now = Date.now()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => {
      ;(req.result as AudioRecord[]).forEach((r) => {
        if (!r.keepForever && now - r.createdAt >= SEVEN_DAYS_MS) {
          store.delete(r.id)
        }
      })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAudioRecordsByAffirmationId(affirmationId: string): Promise<AudioRecord[]> {
  const all = await getAudioRecords()
  return all.filter((r) => r.affirmationId === affirmationId)
}

export async function getRecentAudioRecord(): Promise<AudioRecord | null> {
  try {
    const records = await getAudioRecords()
    return records[0] ?? null
  } catch {
    return null
  }
}

export function createAudioObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export async function clearAllAudioRecords(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
