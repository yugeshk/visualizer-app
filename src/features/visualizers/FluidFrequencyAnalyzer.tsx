'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';

const BUCKET_COUNT = 48;
const UPDATE_INTERVAL_MS = 50;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface EnergySnapshot {
  energy: number;
  triggered: boolean;
  bass: number;
  mids: number;
  highs: number;
}

export const FluidFrequencyAnalyzer: React.FC = () => {
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const fluidSettings = settings.fluid;
  const [buckets, setBuckets] = useState<number[]>(() => new Array(BUCKET_COUNT).fill(0));
  const [energySnapshot, setEnergySnapshot] = useState<EnergySnapshot>({
    energy: 0,
    triggered: false,
    bass: 0,
    mids: 0,
    highs: 0,
  });

  const spectrumRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!analyser) return;
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    spectrumRef.current = spectrum;
    let rafId: number;
    let lastUpdate = 0;

    const update = (timestamp: number) => {
      if (!analyser) return;
      rafId = window.requestAnimationFrame(update);
      if (timestamp - lastUpdate < UPDATE_INTERVAL_MS) {
        return;
      }
      lastUpdate = timestamp;

      getFrequencyData(spectrum);

      const nextBuckets: number[] = [];
      const slice = Math.max(1, Math.floor(spectrum.length / BUCKET_COUNT));
      for (let i = 0; i < BUCKET_COUNT; i += 1) {
        const start = i * slice;
        const end = i === BUCKET_COUNT - 1 ? spectrum.length : start + slice;
        let total = 0;
        for (let j = start; j < end; j += 1) {
          total += spectrum[j];
        }
        const bucketAverage = total / ((end - start) || 1);
        nextBuckets.push(clamp01(bucketAverage / 255));
      }
      setBuckets(nextBuckets);

      const lowEnd = Math.floor(spectrum.length * 0.18);
      const midEnd = Math.floor(spectrum.length * 0.7);

      const bass = averageRange(spectrum, 0, lowEnd);
      const mids = averageRange(spectrum, lowEnd, midEnd);
      const highs = averageRange(spectrum, midEnd, spectrum.length);

      const weightSum = fluidSettings.bassWeight + fluidSettings.midWeight + fluidSettings.highWeight || 1;
      const weightedEnergy =
        (bass * fluidSettings.bassWeight + mids * fluidSettings.midWeight + highs * fluidSettings.highWeight) /
        weightSum;
      const energy = clamp01(weightedEnergy * fluidSettings.energyBoost);
      const triggered = fluidSettings.autoSplats && energy > fluidSettings.energyFloor;

      setEnergySnapshot({
        energy,
        triggered,
        bass,
        mids,
        highs,
      });
    };

    rafId = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(rafId);
      spectrumRef.current = null;
    };
  }, [analyser, getFrequencyData, fluidSettings.autoSplats, fluidSettings.bassWeight, fluidSettings.energyBoost, fluidSettings.energyFloor, fluidSettings.highWeight, fluidSettings.midWeight]);

  const statusLabel = useMemo(() => {
    if (!fluidSettings.autoSplats) return 'Auto mode disabled';
    return energySnapshot.triggered ? 'Splats will fire' : 'Below threshold';
  }, [energySnapshot.triggered, fluidSettings.autoSplats]);

  if (!analyser) {
    return (
      <section className="rounded-md border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">Frequency Analyzer</p>
        <p className="mt-2 text-xs text-slate-400">Load an audio track to visualise the spectrum and energy threshold.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900/60 p-4 text-slate-200 shadow">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">Frequency Analyzer</p>
        <span className={`text-xs ${energySnapshot.triggered ? 'text-emerald-300' : 'text-slate-400'}`}>{statusLabel}</span>
      </div>
      <div className="mt-3">
        <div className="relative h-2 w-full rounded bg-slate-800">
          <div
            className={`absolute inset-y-0 rounded ${energySnapshot.triggered ? 'bg-emerald-500' : 'bg-blue-500/80'}`}
            style={{ width: `${(energySnapshot.energy * 100).toFixed(2)}%` }}
          />
          <div
            className="absolute inset-y-0 w-px bg-amber-400"
            style={{ left: `${(fluidSettings.energyFloor * 100).toFixed(2)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>Energy {energySnapshot.energy.toFixed(2)}</span>
          <span>Floor {fluidSettings.energyFloor.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-4 flex h-24 items-end gap-[1px] rounded bg-slate-950/40 p-2">
        {buckets.map((value, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-blue-500/70"
            style={{ height: `${Math.max(value * 100, 3)}%` }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
        <div>
          <span className="text-slate-400">Bass</span>
          <span className="ml-1 font-semibold text-slate-100">{Math.round(energySnapshot.bass * 100)}%</span>
        </div>
        <div>
          <span className="text-slate-400">Mids</span>
          <span className="ml-1 font-semibold text-slate-100">{Math.round(energySnapshot.mids * 100)}%</span>
        </div>
        <div>
          <span className="text-slate-400">Highs</span>
          <span className="ml-1 font-semibold text-slate-100">{Math.round(energySnapshot.highs * 100)}%</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Energy responds to analyser averages with your bass/mid/high weights and energy boost. Splats trigger when the
        bar crosses the floor.
      </p>
    </section>
  );
};

const averageRange = (buffer: Uint8Array, start: number, end: number): number => {
  if (end <= start) return 0;
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += buffer[i];
  }
  return clamp01(total / ((end - start) * 255));
};

export default FluidFrequencyAnalyzer;
