'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useBackground } from '@/components/background/BackgroundProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import { createFluidSimulation } from '@/lib/fluid/createFluidSimulation';
import { FLUID_PRESET_MAP } from '@/lib/palettes';
import { FluidFrequencyAnalyzer } from './FluidFrequencyAnalyzer';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef } from 'react';

const average = (buffer: Uint8Array, start: number, end: number) => {
  if (end <= start) return 0;
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += buffer[i];
  }
  return total / (end - start);
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const hue = (h % 1 + 1) % 1;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = hue * 6;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = chroma;
    g = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r = x;
    g = chroma;
  } else if (hPrime >= 2 && hPrime < 3) {
    g = chroma;
    b = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g = x;
    b = chroma;
  } else if (hPrime >= 4 && hPrime < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const m = l - chroma / 2;
  return [r + m, g + m, b + m].map(clamp01) as [number, number, number];
};

const DEFAULT_MANUAL_COLOR: [number, number, number] = [0.6, 0.6, 0.6];

export const FluidFrame: React.FC = () => {
  const { backgroundUrl, backgroundSize } = useBackground();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<ReturnType<typeof createFluidSimulation> | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastColorRef = useRef<[number, number, number]>([0.4, 0.4, 0.5]);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const fluidSettings = settings.fluid;

  const manualColor = useMemo<[number, number, number] | null>(() => {
    if (fluidSettings.paletteMode !== 'manual') return null;
    return FLUID_PRESET_MAP[fluidSettings.manualPreset] ?? DEFAULT_MANUAL_COLOR;
  }, [fluidSettings.manualPreset, fluidSettings.paletteMode]);

  const computeColor = useCallback(
    (bass: number, mids: number, highs: number, energy: number): [number, number, number] => {
      if (fluidSettings.paletteMode === 'manual') {
        const preset = manualColor ?? DEFAULT_MANUAL_COLOR;
        const lightBoost = energy * fluidSettings.manualLightBoost;
        return [
          clamp01(preset[0] + lightBoost),
          clamp01(preset[1] + lightBoost * 0.6),
          clamp01(preset[2] + lightBoost * 0.4),
        ];
      }

      const hue = (fluidSettings.hueBase + highs * fluidSettings.hueRange) % 1;
      const saturation = clamp01(fluidSettings.saturation + energy * fluidSettings.saturationGain);
      const lightness = clamp01(fluidSettings.lightnessBase + energy * fluidSettings.lightnessGain);
      const palette = hslToRgb(hue, saturation, lightness);

      const reactive: [number, number, number] = [
        clamp01(fluidSettings.colorBase + highs * fluidSettings.colorGain),
        clamp01(fluidSettings.colorBase + mids * fluidSettings.colorGain),
        clamp01(fluidSettings.colorBase + bass * fluidSettings.colorGain),
      ];

      const mix = clamp01(fluidSettings.paletteMix);
      return [
        clamp01(palette[0] * (1 - mix) + reactive[0] * mix),
        clamp01(palette[1] * (1 - mix) + reactive[1] * mix),
        clamp01(palette[2] * (1 - mix) + reactive[2] * mix),
      ];
    },
    [fluidSettings, manualColor],
  );

  const baseColor = useMemo<[number, number, number]>(() => computeColor(0.2, 0.2, 0.2, 0), [computeColor]);

  const aspectRatioStyle = useMemo<CSSProperties>(() => {
    if (!backgroundSize || backgroundSize.height === 0) {
      return { aspectRatio: '16 / 9' };
    }
    return {
      aspectRatio: `${backgroundSize.width} / ${backgroundSize.height}`,
    };
  }, [backgroundSize]);

  useEffect(() => {
    lastColorRef.current = baseColor;
  }, [baseColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.backgroundColor = 'transparent';
    canvas.style.display = 'block';

    try {
      const simulation = createFluidSimulation(canvas, {
        TRANSPARENT: true,
        BACK_COLOR: { r: 0, g: 0, b: 0 },
        BLOOM: false,
        SUNRAYS: false,
        SHADING: false,
      });
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
    const simulation = simulationRef.current;
    if (!simulation) return;

    if (fluidSettings.paletteMode === 'manual') {
      simulation.setPaletteOverride('manual', manualColor ?? DEFAULT_MANUAL_COLOR);
    } else {
      simulation.setPaletteOverride('auto');
    }
  }, [fluidSettings.paletteMode, manualColor]);

  useEffect(() => {
    const simulation = simulationRef.current;
    if (!simulation) return;

    simulation.updateConfig({
      SPLAT_FORCE: fluidSettings.splatForce,
      SPLAT_RADIUS: fluidSettings.splatRadius,
      DENSITY_DISSIPATION: fluidSettings.densityDissipation,
      VELOCITY_DISSIPATION: fluidSettings.velocityDissipation,
      AUDIO_ENERGY_FLOOR: fluidSettings.energyFloor,
      AUDIO_REACTIVITY: fluidSettings.audioReactivity,
      SPLAT_PRESET: fluidSettings.splatPreset,
    });
  }, [
    fluidSettings.splatPreset,
    fluidSettings.audioReactivity,
    fluidSettings.splatForce,
    fluidSettings.splatRadius,
    fluidSettings.densityDissipation,
    fluidSettings.velocityDissipation,
    fluidSettings.energyFloor,
  ]);

  useEffect(() => {
    if (!analyser || !fluidSettings.autoSplats) {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const spectrum = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      const simulation = simulationRef.current;
      if (!simulation) return;

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

      const color = computeColor(bass, mids, highs, energy);
      lastColorRef.current = color;

      simulation.injectAudioEnergy(energy, color);

      animationRef.current = window.requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [analyser, computeColor, fluidSettings.autoSplats, fluidSettings.bassWeight, fluidSettings.energyBoost, fluidSettings.highWeight, fluidSettings.midWeight, getFrequencyData]);

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

  const surfaceStyle = useMemo<CSSProperties>(() => {
    const base: CSSProperties = backgroundUrl
      ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {
          backgroundColor: '#020617',
        };
    return {
      ...base,
      ...aspectRatioStyle,
      minHeight: '26rem',
    };
  }, [aspectRatioStyle, backgroundUrl]);

  return (
    <div className="space-y-4">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 shadow-lg" style={surfaceStyle}>
        <canvas ref={canvasRef} className="relative z-10 block h-full w-full" />
      </div>
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
            Sends {fluidSettings.manualSplatCount} splats using the current colour mix.
          </span>
        </div>
      )}
      <FluidFrequencyAnalyzer />
    </div>
  );
};

export default FluidFrame;
