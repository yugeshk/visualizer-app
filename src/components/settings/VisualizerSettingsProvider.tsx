'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FLUID_COLOR_PRESETS, PARTICLE_COLOR_PRESETS } from '@/lib/palettes';

const DEFAULT_PARTICLE_PRESET = PARTICLE_COLOR_PRESETS[0]?.id ?? 'sunrise';
const DEFAULT_FLUID_PRESET = FLUID_COLOR_PRESETS[0]?.id ?? 'aurora';

export type TorusSettings = {
  lowScaleMultiplier: number;
  highScaleMultiplier: number;
  depthScaleMultiplier: number;
  scaleSmoothing: number;
  baseRotation: number;
  rotationGain: number;
  emissiveBase: number;
  emissiveGain: number;
};

export type SphereSettings = {
  accentScale: number;
  baseScale: number;
  smoothing: number;
  rotationBase: number;
  rotationGain: number;
  emissiveMin: number;
  emissiveGain: number;
  fillLightBase: number;
  fillLightGain: number;
  backLightBase: number;
  backLightGain: number;
  backLightOrbitGain: number;
};

export type TerrainSettings = {
  waveWeight: number;
  radialWeight: number;
  waveformLowGain: number;
  waveformMidGain: number;
  heightMultiplier: number;
  smoothing: number;
  cameraOrbitSpeed: number;
  sunIntensityBase: number;
  sunIntensityGain: number;
  backlightBase: number;
  backlightGain: number;
};

export type ParticlesSettings = {
  spawnBase: number;
  spawnMultiplier: number;
  speedBase: number;
  speedGain: number;
  randomSpeedRange: number;
  sizeBase: number;
  sizeGain: number;
  lifetimeBase: number;
  lifetimeVariance: number;
  fadeDivider: number;
  sizeDecay: number;
  rotationSpeed: number;
  hueBase: number;
  hueRange: number;
  saturation: number;
  lightnessBase: number;
  lightnessGain: number;
  paletteMode: 'auto' | 'manual';
  manualPreset: string;
  manualLightBoost: number;
};

export type FluidSettings = {
  energyBoost: number;
  bassWeight: number;
  midWeight: number;
  highWeight: number;
  colorBase: number;
  colorGain: number;
  autoSplats: boolean;
  manualSplatCount: number;
  hueBase: number;
  hueRange: number;
  saturation: number;
  saturationGain: number;
  lightnessBase: number;
  lightnessGain: number;
  paletteMix: number;
  paletteMode: 'auto' | 'manual';
  manualPreset: string;
  manualLightBoost: number;
  energyFloor: number;
  splatForce: number;
  splatRadius: number;
  densityDissipation: number;
  velocityDissipation: number;
};

export interface VisualizerSettings {
  torus: TorusSettings;
  sphere: SphereSettings;
  terrain: TerrainSettings;
  particles: ParticlesSettings;
  fluid: FluidSettings;
}

const SETTINGS_KEY = 'visualizer-settings@v1';

const defaultSettings: VisualizerSettings = {
  torus: {
    lowScaleMultiplier: 2.8,
    highScaleMultiplier: 2.4,
    depthScaleMultiplier: 1.8,
    scaleSmoothing: 0.08,
    baseRotation: 0.01,
    rotationGain: 0.03,
    emissiveBase: 0.4,
    emissiveGain: 1.5,
  },
  sphere: {
    accentScale: 1,
    baseScale: 1,
    smoothing: 0.08,
    rotationBase: 0.005,
    rotationGain: 0.03,
    emissiveMin: 0.6,
    emissiveGain: 1.4,
    fillLightBase: 0.6,
    fillLightGain: 1.5,
    backLightBase: 0.5,
    backLightGain: 1.2,
    backLightOrbitGain: 1,
  },
  terrain: {
    waveWeight: 0.6,
    radialWeight: 1,
    waveformLowGain: 4,
    waveformMidGain: 2,
    heightMultiplier: 2.4,
    smoothing: 0.12,
    cameraOrbitSpeed: 0.2,
    sunIntensityBase: 0.8,
    sunIntensityGain: 1.5,
    backlightBase: 0.5,
    backlightGain: 1.8,
  },
  particles: {
    spawnBase: 4,
    spawnMultiplier: 40,
    speedBase: 6,
    speedGain: 30,
    randomSpeedRange: 4,
    sizeBase: 12,
    sizeGain: 28,
    lifetimeBase: 2,
    lifetimeVariance: 1.5,
    fadeDivider: 3,
    sizeDecay: 0.995,
    rotationSpeed: 0.1,
    hueBase: 0.55,
    hueRange: 0.35,
    saturation: 0.9,
    lightnessBase: 0.6,
    lightnessGain: 0.2,
    paletteMode: 'auto',
    manualPreset: DEFAULT_PARTICLE_PRESET,
    manualLightBoost: 0.35,
  },
  fluid: {
    energyBoost: 1,
    bassWeight: 0.6,
    midWeight: 0.3,
    highWeight: 0.2,
    colorBase: 0.25,
    colorGain: 0.9,
    autoSplats: true,
    manualSplatCount: 12,
    hueBase: 0.55,
    hueRange: 0.3,
    saturation: 0.85,
    saturationGain: 0.15,
    lightnessBase: 0.45,
    lightnessGain: 0.35,
    paletteMix: 0.4,
    paletteMode: 'auto',
    manualPreset: DEFAULT_FLUID_PRESET,
    manualLightBoost: 0.35,
    energyFloor: 0.02,
    splatForce: 6000,
    splatRadius: 0.25,
    densityDissipation: 1,
    velocityDissipation: 0.2,
  },
};

const cloneDefaultSettings = (): VisualizerSettings => JSON.parse(JSON.stringify(defaultSettings));

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const PARTICLE_PRESET_SET = new Set(PARTICLE_COLOR_PRESETS.map((preset) => preset.id));
const FLUID_PRESET_SET = new Set(FLUID_COLOR_PRESETS.map((preset) => preset.id));

const normalizePaletteMode = (value: unknown): 'auto' | 'manual' => (value === 'manual' ? 'manual' : 'auto');

const normalizePreset = (value: unknown, fallback: string, valid: Set<string>) =>
  typeof value === 'string' && valid.has(value) ? value : fallback;

const mergeSections = (base: VisualizerSettings, overrides?: Partial<VisualizerSettings>): VisualizerSettings => ({
  torus: { ...base.torus, ...(overrides?.torus ?? {}) },
  sphere: { ...base.sphere, ...(overrides?.sphere ?? {}) },
  terrain: { ...base.terrain, ...(overrides?.terrain ?? {}) },
  particles: {
    ...base.particles,
    ...(overrides?.particles ?? {}),
    hueBase: clampNumber(overrides?.particles?.hueBase ?? base.particles.hueBase, 0, 1),
    hueRange: clampNumber(overrides?.particles?.hueRange ?? base.particles.hueRange, 0, 1.5),
    saturation: clampNumber(overrides?.particles?.saturation ?? base.particles.saturation, 0, 1),
    lightnessBase: clampNumber(overrides?.particles?.lightnessBase ?? base.particles.lightnessBase, 0, 1),
    lightnessGain: clampNumber(overrides?.particles?.lightnessGain ?? base.particles.lightnessGain, 0, 1),
    paletteMode: normalizePaletteMode(overrides?.particles?.paletteMode),
    manualPreset: normalizePreset(overrides?.particles?.manualPreset, base.particles.manualPreset, PARTICLE_PRESET_SET),
    manualLightBoost: clampNumber(overrides?.particles?.manualLightBoost ?? base.particles.manualLightBoost, 0, 1),
  },
  fluid: {
    ...base.fluid,
    ...(overrides?.fluid ?? {}),
    autoSplats:
      overrides?.fluid?.autoSplats === undefined
        ? base.fluid.autoSplats
        : Boolean(overrides.fluid.autoSplats),
    manualSplatCount:
      overrides?.fluid?.manualSplatCount === undefined
        ? base.fluid.manualSplatCount
        : Math.max(1, Number(overrides.fluid.manualSplatCount) || base.fluid.manualSplatCount),
    hueBase: clampNumber(overrides?.fluid?.hueBase ?? base.fluid.hueBase, 0, 1),
    hueRange: clampNumber(overrides?.fluid?.hueRange ?? base.fluid.hueRange, 0, 1),
    saturation: clampNumber(overrides?.fluid?.saturation ?? base.fluid.saturation, 0, 1),
    saturationGain: clampNumber(overrides?.fluid?.saturationGain ?? base.fluid.saturationGain, 0, 1),
    lightnessBase: clampNumber(overrides?.fluid?.lightnessBase ?? base.fluid.lightnessBase, 0, 1),
    lightnessGain: clampNumber(overrides?.fluid?.lightnessGain ?? base.fluid.lightnessGain, 0, 1),
    paletteMix: clampNumber(overrides?.fluid?.paletteMix ?? base.fluid.paletteMix, 0, 1),
    paletteMode: normalizePaletteMode(overrides?.fluid?.paletteMode),
    manualPreset: normalizePreset(overrides?.fluid?.manualPreset, base.fluid.manualPreset, FLUID_PRESET_SET),
    manualLightBoost: clampNumber(overrides?.fluid?.manualLightBoost ?? base.fluid.manualLightBoost, 0, 1),
    energyFloor: clampNumber(overrides?.fluid?.energyFloor ?? base.fluid.energyFloor, 0, 0.2),
    splatForce: clampNumber(overrides?.fluid?.splatForce ?? base.fluid.splatForce, 500, 15000),
    splatRadius: clampNumber(overrides?.fluid?.splatRadius ?? base.fluid.splatRadius, 0.05, 1),
    densityDissipation: clampNumber(overrides?.fluid?.densityDissipation ?? base.fluid.densityDissipation, 0.1, 5),
    velocityDissipation: clampNumber(overrides?.fluid?.velocityDissipation ?? base.fluid.velocityDissipation, 0.05, 5),
  },
});

export type VisualizerSection = keyof VisualizerSettings;

interface VisualizerSettingsContextValue {
  settings: VisualizerSettings;
  updateSettings: <Section extends VisualizerSection>(section: Section, values: Partial<VisualizerSettings[Section]>) => void;
  resetSection: (section: VisualizerSection) => void;
  resetAll: () => void;
  replaceSettings: (next: Partial<VisualizerSettings>) => void;
}

const VisualizerSettingsContext = createContext<VisualizerSettingsContextValue | undefined>(undefined);

export const VisualizerSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<VisualizerSettings>(() => cloneDefaultSettings());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(stored) as Partial<VisualizerSettings>;
      setSettings((prev) => mergeSections(prev, parsed));
    } catch (error) {
      console.warn('Unable to load visualizer settings', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Unable to persist visualizer settings', error);
    }
  }, [hydrated, settings]);

  const updateSettings = useCallback<VisualizerSettingsContextValue['updateSettings']>((section, values) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
  }, []);

  const resetSection = useCallback((section: VisualizerSection) => {
    setSettings((prev) => ({
      ...prev,
      [section]: cloneDefaultSettings()[section],
    }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings(cloneDefaultSettings());
  }, []);

  const replaceSettings = useCallback((next: Partial<VisualizerSettings>) => {
    setSettings(mergeSections(cloneDefaultSettings(), next));
  }, []);

  const value = useMemo<VisualizerSettingsContextValue>(() => ({
    settings,
    updateSettings,
    resetSection,
    resetAll,
    replaceSettings,
  }), [replaceSettings, resetAll, resetSection, settings, updateSettings]);

  return (
    <VisualizerSettingsContext.Provider value={value}>
      {children}
    </VisualizerSettingsContext.Provider>
  );
};

export const useVisualizerSettings = (): VisualizerSettingsContextValue => {
  const context = useContext(VisualizerSettingsContext);
  if (!context) {
    throw new Error('useVisualizerSettings must be used within VisualizerSettingsProvider');
  }
  return context;
};

export const getDefaultSettings = cloneDefaultSettings;
