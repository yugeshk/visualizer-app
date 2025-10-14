'use client';

import React, { ChangeEvent, useRef } from 'react';
import { useAudio } from './AudioProvider';

export const AudioControls: React.FC = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { currentFileName, isPlaying, isReady, loadFile, togglePlayback, stop, clearPersistedAudio } = useAudio();

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-slate-100 shadow">
      <input
        ref={fileRef}
        className="hidden"
        type="file"
        accept="audio/*"
        onChange={onFileChange}
      />
      <button
        type="button"
        className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        onClick={() => fileRef.current?.click()}
        disabled={!isReady}
      >
        Select Audio
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
      <p className="truncate text-sm opacity-80">
        {currentFileName ? `Loaded: ${currentFileName}` : 'No audio selected'}
      </p>
    </section>
  );
};
