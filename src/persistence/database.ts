import { validateProgress, type StitchProgress } from '../progress/progress';

const DB = 'stitchpad',
  VERSION = 1,
  STORE = 'progress';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: 'canonicalPatternHash' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveProgress(progress: StitchProgress) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...progress, modifiedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function loadProgress(
  canonicalPatternHash: string,
): Promise<StitchProgress | undefined> {
  const db = await database();
  const value = await new Promise<StitchProgress | undefined>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(canonicalPatternHash);
    request.onsuccess = () =>
      resolve(request.result === undefined ? undefined : validateProgress(request.result));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}
export async function listRecent(): Promise<StitchProgress[]> {
  const db = await database();
  const values = await new Promise<StitchProgress[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as StitchProgress[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return values.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, 8);
}
