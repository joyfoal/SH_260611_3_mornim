const DB_NAME = 'mornim-success'
const STORE_NAME = 'images'
const DB_VERSION = 1

export interface SuccessImageRecord {
  id: 'latest'
  createdAt: number
  imageBlob: Blob
  inTrash?: boolean
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

export async function saveSuccessImage(blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id: 'latest', createdAt: Date.now(), imageBlob: blob })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getSuccessImage(): Promise<SuccessImageRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get('latest')
    req.onsuccess = () => {
      const r = req.result as SuccessImageRecord | undefined
      resolve((r && !r.inTrash) ? r : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getSuccessImageFromTrash(): Promise<SuccessImageRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get('latest')
    req.onsuccess = () => {
      const r = req.result as SuccessImageRecord | undefined
      resolve((r && r.inTrash) ? r : null)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function moveSuccessImageToTrash(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get('latest')
    req.onsuccess = () => {
      const r = req.result as SuccessImageRecord | undefined
      if (r) store.put({ ...r, inTrash: true })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function restoreSuccessImageFromTrash(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get('latest')
    req.onsuccess = () => {
      const r = req.result as SuccessImageRecord | undefined
      if (r) store.put({ ...r, inTrash: false })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearSuccessImages(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
