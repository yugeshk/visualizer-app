'use client';

import React, { ChangeEvent, useMemo, useRef } from 'react';
import { useAudio } from './AudioProvider';
import { useBackground } from '../background/BackgroundProvider';
import { formatTime } from '@/lib/time';

export const AudioControls: React.FC = () => {
  const audioFileRef = useRef<HTMLInputElement | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement | null>(null);
  const {
    currentFileName,
    currentTime,
    duration,
    isPlaying,
    isReady,
    loadFile,
    togglePlayback,
    stop,
    clearPersistedAudio,
    seekTo,
  } = useAudio();
  const { backgroundName, loadBackground, clearBackground, isReady: isBackgroundReady } = useBackground();

  const onAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    if (audioFileRef.current) {
      audioFileRef.current.value = '';
    }
  };

  const onBackgroundChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadBackground(file);
    if (backgroundFileRef.current) {
      backgroundFileRef.current.value = '';
    }
  };

  const seekable = isReady && duration > 0;
  const safeDuration = duration > 0 ? duration : 1;
  const progressValue = seekable ? Math.min(Math.max(currentTime, 0), duration) : 0;

  const formattedCurrentTime = useMemo(() => formatTime(currentTime), [currentTime]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isNaN(next)) return;
    seekTo(next);
  };

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-slate-100 shadow">
      <input
        ref={audioFileRef}
        className="hidden"
        type="file"
        accept="audio/*"
        onChange={onAudioChange}
      />
      <input
        ref={backgroundFileRef}
        className="hidden"
        type="file"
        accept="image/*"
        onChange={onBackgroundChange}
      />
      <button
        type="button"
        className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        onClick={() => audioFileRef.current?.click()}
        disabled={!isReady}
      >
        Select Audio
      </button>
      <button
        type="button"
        className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-800"
        onClick={() => backgroundFileRef.current?.click()}
        disabled={!isBackgroundReady}
      >
        Select Background
      </button>
      <button
        type="button"
        className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800"
        onClick={() => togglePlayback()}
        disabled={!isReady}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        className="rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-800"
        onClick={stop}
        disabled={!isReady}
      >
        Stop
      </button>
      <button
        type="button"
        className="rounded border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={clearPersistedAudio}
        disabled={!currentFileName}
      >
        Clear Memory
      </button>
      <button
        type="button"
        className="rounded border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-rose-500 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={clearBackground}
        disabled={!backgroundName}
      >
        Clear Background
      </button>
      <div className="flex min-w-full flex-col gap-2 md:flex-1">
        <input
          type="range"
          className="h-2 w-full cursor-pointer appearance-none rounded bg-slate-800 accent-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          min={0}
          max={safeDuration}
          step={0.01}
          value={seekable ? progressValue : 0}
          onChange={handleSeek}
          disabled={!seekable}
          aria-label="Seek audio"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{formattedCurrentTime}</span>
          <span>{formattedDuration}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm opacity-80">
        <p className="truncate">{currentFileName ? `Audio: ${currentFileName}` : 'No audio selected'}</p>
        <p className="truncate">{backgroundName ? `Background: ${backgroundName}` : 'No background selected'}</p>
      </div>
    </section>
  );
};
