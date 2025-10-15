'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import { createFluidSimulation } from '@/lib/fluid/createFluidSimulation';
import { useEffect, useMemo, useRef } from 'react';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<ReturnType<typeof createFluidSimulation> | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastColorRef = useRef<[number, number, number]>([0.4, 0.4, 0.5]);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const fluidSettings = settings.fluid;

  const baseColor = useMemo<[number, number, number]>(() => {
    const base = clamp01(fluidSettings.colorBase);
    const gain = clamp01(fluidSettings.colorGain);
    return [base + gain * 0.3, base + gain * 0.2, base + gain * 0.1].map(clamp01) as [number, number, number];
  }, [fluidSettings.colorBase, fluidSettings.colorGain]);

  useEffect(() => {
    lastColorRef.current = baseColor;
  }, [baseColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const simulation = createFluidSimulation(canvas);
      simulationRef.current = simulation;
      simulation.setPaused(false);
    } catch (error) {
      console.error('Unable to initialize fluid simulation', error);
    }

    return () => {
      const simulation = simulationRef.current;
      if (simulation) {
        simulation.destroy();
        simulationRef.current = null;
      }
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!analyser || !fluidSettings.autoSplats) {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const simulation = simulationRef.current;
    if (!simulation) return;

    const spectrum = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const activeSimulation = simulationRef.current;
      if (!activeSimulation) return;

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

      activeSimulation.injectAudioEnergy(energy, color);

      animationRef.current = window.requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [analyser, fluidSettings.autoSplats, fluidSettings.bassWeight, fluidSettings.energyBoost, fluidSettings.highWeight, fluidSettings.midWeight, fluidSettings.colorBase, fluidSettings.colorGain, getFrequencyData]);

  const handleManualSplat = () => {
    try {
      simulationRef.current?.triggerManualSplats(
        fluidSettings.manualSplatCount,
        lastColorRef.current ?? baseColor,
      );
    } catch (error) {
      console.warn('Unable to trigger manual splat', error);
    }
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="h-[32rem] w-full overflow-hidden rounded-2xl border border-slate-800 shadow-lg"
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
