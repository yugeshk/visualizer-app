'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import { useEffect, useMemo, useRef, useState } from 'react';

const average = (buffer: Uint8Array, start: number, end: number) => {
  if (end <= start) return 0;
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += buffer[i];
  }
  return total / (end - start);
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const FluidFrame: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastColorRef = useRef<[number, number, number]>([0.4, 0.4, 0.5]);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const fluidSettings = settings.fluid;
  const [frameReady, setFrameReady] = useState(false);

  const baseColor = useMemo<[number, number, number]>(() => {
    const base = clamp01(fluidSettings.colorBase);
    const gain = clamp01(fluidSettings.colorGain);
    return [base + gain * 0.3, base + gain * 0.2, base + gain * 0.1].map(clamp01) as [number, number, number];
  }, [fluidSettings.colorBase, fluidSettings.colorGain]);

  useEffect(() => {
    lastColorRef.current = baseColor;
  }, [baseColor]);

  useEffect(() => {
    if (!frameReady) return;
    const targetWindow = iframeRef.current?.contentWindow;
    if (!targetWindow) return;
    targetWindow.postMessage(
      {
        source: 'next-audio-bridge',
        type: 'mode-change',
        auto: fluidSettings.autoSplats,
      },
      '*',
    );
  }, [frameReady, fluidSettings.autoSplats]);

  useEffect(() => {
    if (!frameReady || !analyser || !fluidSettings.autoSplats) return;
    const spectrum = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow) return;

      getFrequencyData(spectrum);
      const lowEnd = Math.floor(spectrum.length * 0.18);
      const midEnd = Math.floor(spectrum.length * 0.7);
      const bass = average(spectrum, 0, lowEnd) / 255;
      const mids = average(spectrum, lowEnd, midEnd) / 255;
      const highs = average(spectrum, midEnd, spectrum.length) / 255;

      const weightSum = fluidSettings.bassWeight + fluidSettings.midWeight + fluidSettings.highWeight || 1;
      const weightedEnergy =
        (bass * fluidSettings.bassWeight + mids * fluidSettings.midWeight + highs * fluidSettings.highWeight) /
        weightSum;
      const energy = clamp01(weightedEnergy * fluidSettings.energyBoost);

      const color: [number, number, number] = [
        clamp01(fluidSettings.colorBase + highs * fluidSettings.colorGain),
        clamp01(fluidSettings.colorBase + mids * fluidSettings.colorGain),
        clamp01(fluidSettings.colorBase + bass * fluidSettings.colorGain),
      ];
      lastColorRef.current = color;

      targetWindow.postMessage(
        {
          source: 'next-audio-bridge',
          type: 'audio-energy',
          energy,
          color,
        },
        '*',
      );

      animationRef.current = window.requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [analyser, fluidSettings.autoSplats, fluidSettings.bassWeight, fluidSettings.energyBoost, fluidSettings.highWeight, fluidSettings.midWeight, fluidSettings.colorBase, fluidSettings.colorGain, frameReady, getFrequencyData]);

  const handleManualSplat = () => {
    try {
      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow) return;
      targetWindow.postMessage(
        {
          source: 'next-audio-bridge',
          type: 'manual-splat',
          count: fluidSettings.manualSplatCount,
          color: lastColorRef.current ?? baseColor,
        },
        '*',
      );
    } catch (error) {
      console.warn('Unable to trigger manual splat', error);
    }
  };

  return (
    <div className="space-y-3">
      <iframe
        ref={iframeRef}
        onLoad={() => setFrameReady(true)}
        src="/legacy/fluid/index.html"
        title="Fluid Simulation"
        className="h-[32rem] w-full overflow-hidden rounded-2xl border border-slate-800 shadow-lg"
        allow="fullscreen"
      />
      {!fluidSettings.autoSplats && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <button
            type="button"
            onClick={handleManualSplat}
            className="rounded border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-emerald-400 hover:text-emerald-200"
          >
            Trigger Splats
          </button>
          <span className="opacity-75">
            Sends {fluidSettings.manualSplatCount} splats using the current color mix.
          </span>
        </div>
      )}
    </div>
  );
};

export default FluidFrame;
