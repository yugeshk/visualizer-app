'use client';

const DB_NAME = 'visualizer-media-store';
const STORE_NAME = 'assets';
const KEY_AUDIO = 'latest-audio';
const KEY_BACKGROUND = 'background-image';
const PLAYBACK_STATE_KEY = 'visualizer-audio-playback';

export interface StoredBinary {
  name: string;
  type: string;
  data: ArrayBuffer;
  lastModified: number;
}

export interface PlaybackState {
  position: number;
  wasPlaying: boolean;
}

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
};

const persistRecord = async (key: string, file: File, fallbackType: string) => {
  const db = await openDatabase();
  const buffer = await file.arrayBuffer();
  const record: StoredBinary = {
    name: file.name,
    type: file.type || fallbackType,
    data: buffer,
    lastModified: file.lastModified,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      const error = tx.error ?? new Error('Failed to store media in IndexedDB');
      db.close();
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error ?? new Error('Media store transaction aborted');
      db.close();
      reject(error);
    };
  });
};

const loadRecord = async (key: string): Promise<StoredBinary | null> => {
  try {
    const db = await openDatabase();
    return await new Promise<StoredBinary | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = (request.result as StoredBinary | undefined) ?? null;
        resolve(result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('Unable to read stored media'));
      };
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        const error = tx.error ?? new Error('Failed to read stored media');
        db.close();
        reject(error);
      };
      tx.onabort = () => {
        const error = tx.error ?? new Error('Media read transaction aborted');
        db.close();
        reject(error);
      };
    });
  } catch (error) {
    console.warn('Unable to load stored media', error);
    return null;
  }
};

const clearRecord = async (key: string): Promise<void> => {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        const error = tx.error ?? new Error('Failed to clear stored media');
        db.close();
        reject(error);
      };
      tx.onabort = () => {
        const error = tx.error ?? new Error('Media clear transaction aborted');
        db.close();
        reject(error);
      };
    });
  } catch (error) {
    console.warn('Unable to clear stored media', error);
  }
};

export const storeAudioFile = async (file: File): Promise<void> => {
  try {
    await persistRecord(KEY_AUDIO, file, 'audio/mpeg');
  } catch (error) {
    console.warn('Unable to persist audio file', error);
  }
};

export const loadStoredAudio = async (): Promise<StoredBinary | null> => loadRecord(KEY_AUDIO);

export const clearStoredAudio = async (): Promise<void> => clearRecord(KEY_AUDIO);

export const storeBackgroundImage = async (file: File): Promise<void> => {
  try {
    await persistRecord(KEY_BACKGROUND, file, 'image/png');
  } catch (error) {
    console.warn('Unable to persist background image', error);
  }
};

export const loadStoredBackground = async (): Promise<StoredBinary | null> => loadRecord(KEY_BACKGROUND);

export const clearStoredBackground = async (): Promise<void> => clearRecord(KEY_BACKGROUND);

export const savePlaybackState = (state: PlaybackState) => {
  try {
    localStorage.setItem(PLAYBACK_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist playback state', error);
  }
};

export const loadPlaybackState = (): PlaybackState | null => {
  try {
    const raw = localStorage.getItem(PLAYBACK_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaybackState;
    if (typeof parsed.position !== 'number') return null;
    return {
      position: Math.max(0, parsed.position),
      wasPlaying: Boolean(parsed.wasPlaying),
    };
  } catch (error) {
    console.warn('Unable to access playback state', error);
    return null;
  }
};

export const clearPlaybackState = () => {
  try {
    localStorage.removeItem(PLAYBACK_STATE_KEY);
  } catch (error) {
    console.warn('Unable to clear playback state', error);
  }
};
