import { validateProgress, type StitchProgress } from '../progress/progress';

const DB = 'stitchpad',
  VERSION = 2,
  PROGRESS_STORE = 'progress',
  PATTERN_STORE = 'pattern-files',
  LAST_PATTERN = 'last';

interface StoredPatternFile {
  slot: typeof LAST_PATTERN;
  name: string;
  type: string;
  lastModified: number;
  bytes: ArrayBuffer;
  savedAt: string;
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PROGRESS_STORE))
        request.result.createObjectStore(PROGRESS_STORE, { keyPath: 'canonicalPatternHash' });
      if (!request.result.objectStoreNames.contains(PATTERN_STORE))
        request.result.createObjectStore(PATTERN_STORE, { keyPath: 'slot' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveProgress(progress: StitchProgress) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    tx.objectStore(PROGRESS_STORE).put({ ...progress, modifiedAt: new Date().toISOString() });
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
    const request = db
      .transaction(PROGRESS_STORE)
      .objectStore(PROGRESS_STORE)
      .get(canonicalPatternHash);
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
    const request = db.transaction(PROGRESS_STORE).objectStore(PROGRESS_STORE).getAll();
    request.onsuccess = () => resolve(request.result as StitchProgress[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return values.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, 8);
}

export async function saveLastPattern(file: File) {
  const value: StoredPatternFile = {
    slot: LAST_PATTERN,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    bytes: await file.arrayBuffer(),
    savedAt: new Date().toISOString(),
  };
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PATTERN_STORE, 'readwrite');
    tx.objectStore(PATTERN_STORE).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadLastPattern(): Promise<File | undefined> {
  const db = await database();
  const value = await new Promise<StoredPatternFile | undefined>((resolve, reject) => {
    const request = db.transaction(PATTERN_STORE).objectStore(PATTERN_STORE).get(LAST_PATTERN);
    request.onsuccess = () => resolve(request.result as StoredPatternFile | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value
    ? new File([value.bytes], value.name, {
        type: value.type,
        lastModified: value.lastModified,
      })
    : undefined;
}
