'use client';

const DB_NAME = 'visualizer-audio-store';
const STORE_NAME = 'audio';
const KEY_LATEST = 'latest';
const PLAYBACK_STATE_KEY = 'visualizer-audio-playback';

export interface StoredAudio {
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

export const storeAudioFile = async (file: File): Promise<void> => {
  try {
    const db = await openDatabase();
    const buffer = await file.arrayBuffer();
    const record: StoredAudio = {
      name: file.name,
      type: file.type || 'audio/mpeg',
      data: buffer,
      lastModified: file.lastModified,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record, KEY_LATEST);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        const error = tx.error ?? new Error('Failed to store audio in IndexedDB');
        db.close();
        reject(error);
      };
      tx.onabort = () => {
        const error = tx.error ?? new Error('Audio store transaction aborted');
        db.close();
        reject(error);
      };
    });
  } catch (error) {
    console.warn('Unable to persist audio file', error);
  }
};

export const loadStoredAudio = async (): Promise<StoredAudio | null> => {
  try {
    const db = await openDatabase();
    return await new Promise<StoredAudio | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_LATEST);
      request.onsuccess = () => {
        const result = (request.result as StoredAudio | undefined) ?? null;
        resolve(result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('Unable to read stored audio'));
      };
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        const error = tx.error ?? new Error('Failed to read stored audio');
        db.close();
        reject(error);
      };
      tx.onabort = () => {
        const error = tx.error ?? new Error('Audio read transaction aborted');
        db.close();
        reject(error);
      };
    });
  } catch (error) {
    console.warn('Unable to load stored audio', error);
    return null;
  }
};

export const clearStoredAudio = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY_LATEST);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        const error = tx.error ?? new Error('Failed to clear stored audio');
        db.close();
        reject(error);
      };
      tx.onabort = () => {
        const error = tx.error ?? new Error('Audio clear transaction aborted');
        db.close();
        reject(error);
      };
    });
  } catch (error) {
    console.warn('Unable to clear stored audio', error);
  }
};

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
