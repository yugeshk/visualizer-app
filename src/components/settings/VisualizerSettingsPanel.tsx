'use client';

import { usePathname } from 'next/navigation';
import React, { useMemo, useRef, useState } from 'react';
import { useVisualizerSettings, VisualizerSection, VisualizerSettings } from './VisualizerSettingsProvider';

interface ControlDefinition<Section extends VisualizerSection> {
  key: keyof VisualizerSettings[Section];
  label: string;
  min: number;
  max: number;
  step?: number;
  kind?: 'slider' | 'toggle';
  description?: string;
  displayMultiplier?: number;
}

type ControlMap<Section extends VisualizerSection> = {
  section: Section;
  title: string;
  description: string;
  controls: ControlDefinition<Section>[];
};

const formatNumber = (value: number, step: number | undefined) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (step && step < 0.01) return value.toFixed(3);
  if (step && step < 0.1) return value.toFixed(2);
  if (step && step < 1) return value.toFixed(1);
  return value.toFixed(0);
};

const computePanelDefinition = (pathname: string): ControlMap<VisualizerSection> | null => {
  if (pathname === '/torus') {
    return {
      section: 'torus',
      title: 'Torus Response',
      description: 'Adjust how the torus scales, rotates, and glows with the spectrum.',
      controls: [
        { key: 'lowScaleMultiplier', label: 'Low Frequency Scale', min: 0, max: 6, step: 0.1 },
        { key: 'highScaleMultiplier', label: 'High Frequency Scale', min: 0, max: 6, step: 0.1 },
        { key: 'depthScaleMultiplier', label: 'Depth Scale', min: 0, max: 5, step: 0.1 },
        { key: 'scaleSmoothing', label: 'Scale Smoothing', min: 0.01, max: 0.3, step: 0.01 },
        { key: 'baseRotation', label: 'Base Rotation Speed', min: 0, max: 0.05, step: 0.001 },
        { key: 'rotationGain', label: 'Rotation Gain', min: 0, max: 0.1, step: 0.002 },
        { key: 'emissiveBase', label: 'Emissive Base', min: 0, max: 1.5, step: 0.05 },
        { key: 'emissiveGain', label: 'Emissive Gain', min: 0, max: 3, step: 0.1 },
      ],
    };
  }

  if (pathname.startsWith('/sphere')) {
    return {
      section: 'sphere',
      title: 'Sphere Variants',
      description: 'Control vertex displacement and lighting shared by Angel, Hedgehog, and Lotus modes.',
      controls: [
        { key: 'accentScale', label: 'Accent Vertex Strength', min: 0.5, max: 10, step: 0.1 },
        { key: 'baseScale', label: 'Base Vertex Strength', min: 0.5, max: 6, step: 0.1 },
        { key: 'smoothing', label: 'Vertex Smoothing', min: 0.02, max: 0.3, step: 0.01 },
        { key: 'rotationBase', label: 'Base Rotation Speed', min: 0, max: 0.05, step: 0.001 },
        { key: 'rotationGain', label: 'Rotation Gain', min: 0, max: 0.1, step: 0.002 },
        { key: 'emissiveMin', label: 'Emissive Base', min: 0, max: 1.5, step: 0.05 },
        { key: 'emissiveGain', label: 'Emissive Gain', min: 0, max: 3, step: 0.1 },
        { key: 'fillLightBase', label: 'Fill Light Base', min: 0, max: 2, step: 0.05 },
        { key: 'fillLightGain', label: 'Fill Light Gain', min: 0, max: 4, step: 0.1 },
        { key: 'backLightBase', label: 'Back Light Base', min: 0, max: 2, step: 0.05 },
        { key: 'backLightGain', label: 'Back Light Gain', min: 0, max: 4, step: 0.1 },
        { key: 'backLightOrbitGain', label: 'Back Light Orbit Gain', min: 0, max: 4, step: 0.1 },
      ],
    };
  }

  if (pathname === '/terrain') {
    return {
      section: 'terrain',
      title: 'Terrain Surface',
      description: 'Shape the fractal surface and lighting response to different frequency ranges.',
      controls: [
        { key: 'waveWeight', label: 'Wave Weight', min: 0, max: 3, step: 0.05 },
        { key: 'radialWeight', label: 'Radial Weight', min: 0, max: 3, step: 0.05 },
        { key: 'waveformLowGain', label: 'Bass Height Gain', min: 0, max: 8, step: 0.1 },
        { key: 'waveformMidGain', label: 'Mid Height Gain', min: 0, max: 6, step: 0.1 },
        { key: 'heightMultiplier', label: 'Height Multiplier', min: 0, max: 6, step: 0.1 },
        { key: 'smoothing', label: 'Height Smoothing', min: 0.02, max: 0.4, step: 0.01 },
        { key: 'cameraOrbitSpeed', label: 'Camera Orbit Speed', min: 0, max: 1, step: 0.01 },
        { key: 'sunIntensityBase', label: 'Sun Base Intensity', min: 0, max: 2, step: 0.05 },
        { key: 'sunIntensityGain', label: 'Sun Intensity Gain', min: 0, max: 3, step: 0.1 },
        { key: 'backlightBase', label: 'Backlight Base', min: 0, max: 2, step: 0.05 },
        { key: 'backlightGain', label: 'Backlight Gain', min: 0, max: 4, step: 0.1 },
      ],
    };
  }

  if (pathname === '/particles') {
    return {
      section: 'particles',
      title: 'Particle Field',
      description: 'Tweak emission rate, lifetime, and motion of the additive particle cloud.',
      controls: [
        { key: 'spawnBase', label: 'Spawn Base', min: 0, max: 30, step: 1 },
        { key: 'spawnMultiplier', label: 'Spawn Multiplier', min: 0, max: 120, step: 1 },
        { key: 'speedBase', label: 'Base Speed', min: 0, max: 20, step: 0.5 },
        { key: 'speedGain', label: 'Speed Gain', min: 0, max: 80, step: 1 },
        { key: 'randomSpeedRange', label: 'Random Speed Range', min: 0, max: 20, step: 0.5 },
        { key: 'sizeBase', label: 'Base Size', min: 1, max: 40, step: 1 },
        { key: 'sizeGain', label: 'Size Gain', min: 0, max: 60, step: 1 },
        { key: 'lifetimeBase', label: 'Lifetime Base', min: 0.5, max: 6, step: 0.1 },
        { key: 'lifetimeVariance', label: 'Lifetime Variance', min: 0, max: 6, step: 0.1 },
        { key: 'fadeDivider', label: 'Fade Divider', min: 0.5, max: 10, step: 0.1 },
        { key: 'sizeDecay', label: 'Size Decay', min: 0.9, max: 1, step: 0.001 },
        { key: 'rotationSpeed', label: 'Cloud Rotation Speed', min: -0.5, max: 0.5, step: 0.01 },
      ],
    };
  }

  if (pathname === '/fluid') {
    return {
      section: 'fluid',
      title: 'Fluid Injection',
      description: 'Dial how audio energy maps to splat intensity and hue in the fluid iframe.',
      controls: [
        { key: 'energyBoost', label: 'Energy Boost', min: 0.1, max: 4, step: 0.1 },
        { key: 'bassWeight', label: 'Bass Weight', min: 0, max: 1.5, step: 0.05 },
        { key: 'midWeight', label: 'Mid Weight', min: 0, max: 1.5, step: 0.05 },
        { key: 'highWeight', label: 'High Weight', min: 0, max: 1.5, step: 0.05 },
        { key: 'colorBase', label: 'Color Base', min: 0, max: 1, step: 0.02 },
        { key: 'colorGain', label: 'Color Gain', min: 0, max: 2, step: 0.05 },
        { key: 'autoSplats', label: 'Audio Reactive Mode', kind: 'toggle', description: 'Toggle between audio-driven splats and manual triggering.' },
        { key: 'manualSplatCount', label: 'Manual Splat Count', min: 1, max: 80, step: 1 },
      ],
    };
  }

  return null;
};

export const VisualizerSettingsPanel: React.FC = () => {
  const pathname = usePathname();
  const config = useMemo(() => computePanelDefinition(pathname), [pathname]);
  const { settings, updateSettings, resetSection, replaceSettings } = useVisualizerSettings();
  const [collapsed, setCollapsed] = useState(true);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const handleExport = () => {
    try {
      const data = JSON.stringify(settings, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'visualizer-settings.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Unable to export settings', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<VisualizerSettings>;
      replaceSettings(parsed);
    } catch (error) {
      console.warn('Unable to import settings', error);
    } finally {
      event.target.value = '';
    }
  };


  if (!config) return null;

  const sectionSettings = settings[config.section];

  const renderControl = (control: ControlDefinition<typeof config.section>) => {
    const rawValue = sectionSettings[control.key as keyof typeof sectionSettings] as unknown;

    if (control.kind === 'toggle') {
      const checked = Boolean(rawValue);
      return (
        <label key={String(control.key)} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{control.label}</span>
            <span className="font-mono text-slate-200">{checked ? 'On' : 'Off'}</span>
          </div>
          <input
            type="checkbox"
            className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-slate-600 transition checked:bg-emerald-500"
            checked={checked}
            onChange={() =>
              updateSettings(config.section, {
                [control.key]: !checked,
              } as Partial<VisualizerSettings[typeof config.section]>)
            }
          />
          {control.description ? (
            <p className="text-[11px] text-slate-500">{control.description}</p>
          ) : null}
        </label>
      );
    }

    const value = Number(rawValue) || 0;
    const displayValue = control.displayMultiplier ? value * control.displayMultiplier : value;
    return (
      <div key={String(control.key)} className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>{control.label}</span>
          <span className="font-mono text-slate-200">
            {formatNumber(displayValue, control.step)}
          </span>
        </div>
        <input
          className="w-full accent-blue-500"
          type="range"
          min={control.min}
          max={control.max}
          step={control.step ?? 0.1}
          value={value}
          onChange={(event) =>
            updateSettings(config.section, {
              [control.key]: Number.parseFloat(event.target.value),
            } as Partial<VisualizerSettings[typeof config.section]>)
          }
        />
        {control.description ? (
          <p className="text-[11px] text-slate-500">{control.description}</p>
        ) : null}
      </div>
    );
  };

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow lg:sticky lg:top-28 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Settings</p>
          <h3 className="text-sm font-semibold text-slate-100">{config.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-200 lg:hidden"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">{config.description}</p>
      <div className={`mt-4 space-y-4 ${collapsed ? 'hidden lg:block' : 'block'}`}>
        {config.controls.map(renderControl)}
      </div>
      <input
        ref={importInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={handleImport}
      />
      <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${collapsed ? 'hidden lg:flex' : 'flex'}`}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => resetSection(config.section)}
            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-red-500 hover:text-red-200"
          >
            Reset Section
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-200"
          >
            Download Config
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            Load Config
          </button>
        </div>
        <span className="text-[11px] text-slate-500">Stored locally</span>
      </div>
    </aside>
  );
};
