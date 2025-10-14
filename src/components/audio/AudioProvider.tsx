'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearPlaybackState,
  clearStoredAudio,
  loadPlaybackState,
  loadStoredAudio,
  savePlaybackState,
  storeAudioFile,
} from '@/lib/storage/audioStore';

interface AudioContextValue {
  analyser: AnalyserNode | null;
  audioElement: HTMLAudioElement | null;
  currentFileName: string | null;
  isReady: boolean;
  isPlaying: boolean;
  loadFile: (file: File) => Promise<void>;
  togglePlayback: () => Promise<void>;
  stop: () => void;
  clearPersistedAudio: () => Promise<void>;
  getFrequencyData: (target: Uint8Array) => void;
  getWaveformData: (target: Float32Array) => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

const FFT_SIZE = 2048;
const PLAYBACK_THROTTLE_MS = 500;

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const queuedUrlRef = useRef<string | null>(null);
  const lastPersistRef = useRef<number>(0);
  const restoringRef = useRef<boolean>(false);

  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      console.error('Web Audio API is not supported in this browser.');
      return;
    }

    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.controls = false;

    const context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.8;

    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);

    const handlePlay = () => {
      setIsPlaying(true);
      if (!restoringRef.current) {
        savePlaybackState({ position: audio.currentTime, wasPlaying: true });
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (!restoringRef.current) {
        savePlaybackState({ position: audio.currentTime, wasPlaying: false });
      }
    };

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastPersistRef.current < PLAYBACK_THROTTLE_MS) return;
      lastPersistRef.current = now;
      if (!restoringRef.current) {
        savePlaybackState({ position: audio.currentTime, wasPlaying: !audio.paused });
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    audioElementRef.current = audio;
    audioContextRef.current = context;
    analyserRef.current = analyser;
    sourceNodeRef.current = source;
    setIsReady(true);

    const restoreStoredAudio = async () => {
      try {
        restoringRef.current = true;
        const stored = await loadStoredAudio();
        if (!stored) {
          restoringRef.current = false;
          return;
        }

        const blob = new Blob([stored.data], { type: stored.type || 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        if (queuedUrlRef.current) {
          URL.revokeObjectURL(queuedUrlRef.current);
        }

        queuedUrlRef.current = url;
        setCurrentFileName(stored.name);
        audio.src = url;

        const playbackState = loadPlaybackState();
        const applyPlaybackState = () => {
          if (playbackState) {
            audio.currentTime = Math.max(0, playbackState.position || 0);
            savePlaybackState({ position: audio.currentTime, wasPlaying: false });
          }
          audio.removeEventListener('loadedmetadata', applyPlaybackState);
          restoringRef.current = false;
        };

        audio.addEventListener('loadedmetadata', applyPlaybackState);
        audio.load();
      } catch (error) {
        console.warn('Unable to restore persisted audio', error);
        restoringRef.current = false;
      }
    };

    restoreStoredAudio();

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);

      if (queuedUrlRef.current) {
        URL.revokeObjectURL(queuedUrlRef.current);
        queuedUrlRef.current = null;
      }

      source.disconnect();
      analyser.disconnect();
      context.close();
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioElementRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    savePlaybackState({ position: 0, wasPlaying: false });
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const audio = audioElementRef.current;
    const context = audioContextRef.current;
    if (!audio || !context) return;

    if (queuedUrlRef.current) {
      URL.revokeObjectURL(queuedUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    queuedUrlRef.current = objectUrl;

    stop();
    setCurrentFileName(file.name);
    audio.src = objectUrl;
    audio.load();
    await storeAudioFile(file);
    await context.resume();
    try {
      await audio.play();
      savePlaybackState({ position: audio.currentTime, wasPlaying: true });
    } catch (error) {
      console.warn('Unable to autoplay selected audio file until user interaction.', error);
      savePlaybackState({ position: audio.currentTime, wasPlaying: false });
    }
  }, [stop]);

  const togglePlayback = useCallback(async () => {
    const audio = audioElementRef.current;
    const context = audioContextRef.current;
    if (!audio || !context) return;

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (audio.paused) {
      try {
        await audio.play();
        savePlaybackState({ position: audio.currentTime, wasPlaying: true });
      } catch (error) {
        console.warn('Playback failed to start.', error);
      }
    } else {
      audio.pause();
      savePlaybackState({ position: audio.currentTime, wasPlaying: false });
    }
  }, []);

  const clearPersistedAudio = useCallback(async () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    stop();
    setIsPlaying(false);
    if (queuedUrlRef.current) {
      URL.revokeObjectURL(queuedUrlRef.current);
      queuedUrlRef.current = null;
    }
    audio.removeAttribute('src');
    audio.load();
    setCurrentFileName(null);
    await clearStoredAudio();
    clearPlaybackState();
  }, [stop]);

  const getFrequencyData = useCallback((target: Uint8Array) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    analyser.getByteFrequencyData(target);
  }, []);

  const getWaveformData = useCallback((target: Float32Array) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    analyser.getFloatTimeDomainData(target);
  }, []);

  const value = useMemo<AudioContextValue>(() => ({
    analyser: analyserRef.current,
    audioElement: audioElementRef.current,
    currentFileName,
    isReady,
    isPlaying,
    loadFile,
    togglePlayback,
    stop,
    clearPersistedAudio,
    getFrequencyData,
    getWaveformData,
  }), [clearPersistedAudio, currentFileName, getFrequencyData, getWaveformData, isPlaying, isReady, loadFile, stop, togglePlayback]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = (): AudioContextValue => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
