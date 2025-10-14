'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
  },
};

const cloneDefaultSettings = (): VisualizerSettings => JSON.parse(JSON.stringify(defaultSettings));

const mergeSections = (base: VisualizerSettings, overrides?: Partial<VisualizerSettings>): VisualizerSettings => ({
  torus: { ...base.torus, ...(overrides?.torus ?? {}) },
  sphere: { ...base.sphere, ...(overrides?.sphere ?? {}) },
  terrain: { ...base.terrain, ...(overrides?.terrain ?? {}) },
  particles: { ...base.particles, ...(overrides?.particles ?? {}) },
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
