'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearStoredBackground,
  loadStoredBackground,
  storeBackgroundImage,
  StoredBinary,
} from '@/lib/storage/mediaStore';

interface BackgroundContextValue {
  backgroundUrl: string | null;
  backgroundName: string | null;
  isReady: boolean;
  loadBackground: (file: File) => Promise<void>;
  clearBackground: () => Promise<void>;
}

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

const createObjectUrl = (record: StoredBinary): string => {
  const blob = new Blob([record.data], { type: record.type || 'image/png' });
  return URL.createObjectURL(blob);
};

export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundName, setBackgroundName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await loadStoredBackground();
        if (!stored) {
          setIsReady(true);
          return;
        }
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        const url = createObjectUrl(stored);
        objectUrlRef.current = url;
        setBackgroundUrl(url);
        setBackgroundName(stored.name);
      } catch (error) {
        console.warn('Unable to restore background image', error);
      } finally {
        setIsReady(true);
      }
    };

    restore();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const loadBackground = useCallback(async (file: File) => {
    try {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setBackgroundUrl(url);
      setBackgroundName(file.name);
      await storeBackgroundImage(file);
    } catch (error) {
      console.warn('Unable to load background image', error);
    }
  }, []);

  const clearBackground = useCallback(async () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setBackgroundUrl(null);
    setBackgroundName(null);
    await clearStoredBackground();
  }, []);

  const value = useMemo<BackgroundContextValue>(
    () => ({ backgroundUrl, backgroundName, isReady, loadBackground, clearBackground }),
    [backgroundUrl, backgroundName, clearBackground, isReady, loadBackground],
  );

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
};

export const useBackground = (): BackgroundContextValue => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};
