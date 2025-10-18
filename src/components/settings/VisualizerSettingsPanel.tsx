'use client';

import { usePathname } from 'next/navigation';
import React, { useMemo, useRef, useState } from 'react';
import { useVisualizerSettings, VisualizerSection, VisualizerSettings } from './VisualizerSettingsProvider';
import { fluidPresetOptions, paletteModeOptions, particlePresetOptions } from '@/lib/palettes';

interface ControlDefinition<Section extends VisualizerSection> {
  key: keyof VisualizerSettings[Section];
  label: string;
  min?: number;
  max?: number;
  step?: number;
  kind?: 'slider' | 'toggle' | 'select';
  description: string;
  displayMultiplier?: number;
  options?: { value: string; label: string }[];
  disabled?: (settings: VisualizerSettings[Section]) => boolean;
}

const formatNumber = (value: number, step: number | undefined) => {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (step && step < 0.01) return value.toFixed(3);
  if (step && step < 0.1) return value.toFixed(2);
  if (step && step < 1) return value.toFixed(1);
  return value.toFixed(0);
};

const clampNumber = (value: number, min: number | undefined, max: number | undefined) => {
  if (!Number.isFinite(value)) return min ?? 0;
  let next = value;
  if (max !== undefined) next = Math.min(next, max);
  if (min !== undefined) next = Math.max(next, min);
  return next;
};

type FocusSection = Extract<VisualizerSection, 'particles' | 'fluid'>;
type FocusControl = ControlDefinition<'particles'> | ControlDefinition<'fluid'>;

const computePanelDefinition = (
  pathname: string,
): FocusControl[] | null => {
  if (pathname === '/particles') {
    const particleControls: ControlDefinition<'particles'>[] = [
      { key: 'paletteMode', label: 'Colour Mode', kind: 'select', options: paletteModeOptions as unknown as { value: string; label: string }[], description: 'Switch between audio reactive colouring and manual presets.' },
      { key: 'manualPreset', label: 'Manual Palette', kind: 'select', options: particlePresetOptions, description: 'Pick a preset when manual mode is active.', disabled: (settings) => settings.paletteMode !== 'manual' },
      { key: 'manualLightBoost', label: 'Manual Light Boost', min: 0, max: 1, step: 0.01, description: 'How much the manual palette brightens when the music swells.', disabled: (settings) => settings.paletteMode !== 'manual' },
      { key: 'spawnBase', label: 'Spawn Base', min: 0, max: 30, step: 1, description: 'Particles emitted each frame before audio influence.' },
      { key: 'spawnMultiplier', label: 'Spawn Multiplier', min: 0, max: 120, step: 1, description: 'Extra particles fired as the track gets louder.' },
      { key: 'speedBase', label: 'Base Speed', min: 0, max: 20, step: 0.5, description: 'Starting velocity applied to every particle.' },
      { key: 'speedGain', label: 'Speed Gain', min: 0, max: 80, step: 1, description: 'Additional speed added from audio peaks.' },
      { key: 'randomSpeedRange', label: 'Random Speed Range', min: 0, max: 20, step: 0.5, description: 'Random variation injected into particle velocity.' },
      { key: 'sizeBase', label: 'Base Size', min: 1, max: 40, step: 1, description: 'Default particle size on spawn.' },
      { key: 'sizeGain', label: 'Size Gain', min: 0, max: 60, step: 1, description: 'Size boost taken from analyser energy.' },
      { key: 'lifetimeBase', label: 'Lifetime Base', min: 0.5, max: 6, step: 0.1, description: 'Average lifetime in seconds for each particle.' },
      { key: 'lifetimeVariance', label: 'Lifetime Variance', min: 0, max: 6, step: 0.1, description: 'Random lifetime variation per particle.' },
      { key: 'fadeDivider', label: 'Fade Divider', min: 0.5, max: 10, step: 0.1, description: 'Controls how quickly colours fade while particles age.' },
      { key: 'sizeDecay', label: 'Size Decay', min: 0.9, max: 1, step: 0.001, description: 'Multiplier applied each frame to shrink particles.' },
      { key: 'rotationSpeed', label: 'Cloud Rotation Speed', min: -0.5, max: 0.5, step: 0.01, description: 'Slow rotation rate for the entire particle system.' },
      { key: 'hueBase', label: 'Hue Base', min: 0, max: 1, step: 0.01, description: 'Central hue used for automatic colouring.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'hueRange', label: 'Hue Range', min: 0, max: 1, step: 0.01, description: 'How far hue can drift around the base value.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'saturation', label: 'Saturation', min: 0, max: 1, step: 0.01, description: 'Baseline saturation applied to particles.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'lightnessBase', label: 'Lightness Base', min: 0, max: 1, step: 0.01, description: 'Baseline lightness for automatic colouring.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'lightnessGain', label: 'Lightness Gain', min: 0, max: 1, step: 0.01, description: 'Extra lightness added while the song peaks.', disabled: (settings) => settings.paletteMode === 'manual' },
    ];
    return particleControls as FocusControl[];
  }

  if (pathname === '/fluid') {
    const fluidControls: ControlDefinition<'fluid'>[] = [
      { key: 'paletteMode', label: 'Colour Mode', kind: 'select', options: paletteModeOptions as unknown as { value: string; label: string }[], description: 'Choose between audio reactive colouring and manual presets.' },
      { key: 'manualPreset', label: 'Manual Palette', kind: 'select', options: fluidPresetOptions, description: 'Pick a palette when manual mode is active.', disabled: (settings) => settings.paletteMode !== 'manual' },
      { key: 'energyBoost', label: 'Energy Boost', min: 0.1, max: 4, step: 0.1, description: 'Amplifies analyser energy before it drives the fluid.' },
      { key: 'audioReactivity', label: 'Audio Reactivity', min: 0.05, max: 3, step: 0.05, description: 'Scales the amount, speed, and brightness of audio-driven splats.' },
      { key: 'bassWeight', label: 'Bass Weight', min: 0, max: 1.5, step: 0.05, description: 'Relative importance of bass frequencies.' },
      { key: 'midWeight', label: 'Mid Weight', min: 0, max: 1.5, step: 0.05, description: 'Relative importance of mid frequencies.' },
      { key: 'highWeight', label: 'High Weight', min: 0, max: 1.5, step: 0.05, description: 'Relative importance of high frequencies.' },
      { key: 'colorBase', label: 'RGB Base', min: 0, max: 1, step: 0.02, description: 'Baseline RGB value blended into the fluid.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'colorGain', label: 'RGB Gain', min: 0, max: 2, step: 0.05, description: 'RGB gain taken from analyser values.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'hueBase', label: 'Hue Base', min: 0, max: 1, step: 0.01, description: 'Primary hue for automatic colouring.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'hueRange', label: 'Hue Energy Range', min: 0, max: 1, step: 0.01, description: 'Amount of hue shift caused by higher frequencies.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'saturation', label: 'Saturation', min: 0, max: 1, step: 0.01, description: 'Baseline saturation for automatic mode.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'saturationGain', label: 'Saturation Gain', min: 0, max: 1, step: 0.01, description: 'Additional saturation applied from energy.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'lightnessBase', label: 'Lightness Base', min: 0, max: 1, step: 0.01, description: 'Baseline lightness value.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'lightnessGain', label: 'Lightness Gain', min: 0, max: 1, step: 0.01, description: 'Lightness boost supplied by the analyser.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'manualLightBoost', label: 'Manual Light Boost', min: 0, max: 1, step: 0.01, description: 'How much the manual palette brightens in response to energy.', disabled: (settings) => settings.paletteMode !== 'manual' },
      { key: 'paletteMix', label: 'Reactive Mix', min: 0, max: 1, step: 0.01, description: 'Blend between palette colour and analyser RGB.', disabled: (settings) => settings.paletteMode === 'manual' },
      { key: 'energyFloor', label: 'Audio Floor', min: 0, max: 0.2, step: 0.005, description: 'Ignore analyser energy below this threshold to keep the fluid calm during quiet sections.' },
      { key: 'splatForce', label: 'Splat Force', min: 500, max: 15000, step: 100, description: 'Velocity imparted to each splat. Raise for more explosive motion.' },
      { key: 'splatRadius', label: 'Splat Radius', min: 0.05, max: 1, step: 0.01, description: 'Size of the injected dye. Larger values create broader strokes.' },
      { key: 'densityDissipation', label: 'Density Dissipation', min: 0.1, max: 5, step: 0.05, description: 'How quickly colour fades from the fluid.' },
      { key: 'velocityDissipation', label: 'Velocity Dissipation', min: 0.05, max: 5, step: 0.05, description: 'How quickly motion energy decays.' },
      { key: 'autoSplats', label: 'Audio Reactive Splats', kind: 'toggle', description: 'Enable automatic splats driven by audio energy.' },
      { key: 'manualSplatCount', label: 'Manual Splat Count', min: 1, max: 80, step: 1, description: 'Number of splats fired when you press Trigger.' },
    ];
    return fluidControls as FocusControl[];
  }

  return null;
};

const resolveSectionKey = (path: string): FocusSection | null => {
  if (path === '/particles') return 'particles';
  if (path === '/fluid') return 'fluid';
  return null;
};

export const VisualizerSettingsPanel: React.FC = () => {
  const pathname = usePathname();
  const sectionKey = useMemo(() => resolveSectionKey(pathname), [pathname]);
  const controls = useMemo(() => (
    sectionKey ? computePanelDefinition(pathname) : null
  ), [pathname, sectionKey]);

  const { settings, updateSettings, resetSection, replaceSettings } = useVisualizerSettings();
  const [collapsed, setCollapsed] = useState(true);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  if (!sectionKey || !controls) return null;

  const sectionSettings = settings[sectionKey] as Record<string, unknown>;

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

  const handleInfoToggle = (key: string) => {
    setInfoKey((current) => (current === key ? null : key));
  };

  const renderSlider = (control: FocusControl) => {
    const controlKey = String(control.key);
    const rawValue = Number(sectionSettings[controlKey]) || 0;
    const value = clampNumber(rawValue, control.min, control.max);
    const displayValue = control.displayMultiplier ? value * control.displayMultiplier : value;
    const isDisabled = control.disabled ? control.disabled(settings[sectionKey] as never) : false;

    return (
      <div
        key={controlKey}
        className={`rounded-md border border-slate-800 bg-slate-900/60 p-3 shadow-sm ${isDisabled ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-2">
            {control.label}
            {control.description ? (
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] text-slate-300 hover:border-blue-400 hover:text-blue-200"
                onClick={() => handleInfoToggle(controlKey)}
                aria-label={`About ${control.label}`}
              >
                ?
              </button>
            ) : null}
          </span>
          <input
            type="number"
            className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right text-[11px] text-slate-100 focus:border-blue-500 focus:outline-none"
            step={control.step ?? 0.1}
            min={control.min}
            max={control.max}
            value={formatNumber(displayValue, control.step)}
            onChange={(event) => {
              if (isDisabled) return;
              const next = Number(event.target.value);
              if (Number.isNaN(next)) return;
              const normalized = control.displayMultiplier ? next / control.displayMultiplier : next;
              const clamped = clampNumber(normalized, control.min, control.max);
              updateSettings(sectionKey, {
                [control.key]: clamped,
              } as Partial<VisualizerSettings[typeof sectionKey]>);
            }}
            disabled={isDisabled}
          />
        </div>
        <input
          className="mt-2 w-full accent-blue-500"
          type="range"
          min={control.min}
          max={control.max}
          step={control.step ?? 0.1}
          value={value}
          onChange={(event) => {
            if (isDisabled) return;
            const next = Number.parseFloat(event.target.value);
            const clamped = clampNumber(next, control.min, control.max);
            updateSettings(sectionKey, {
              [control.key]: clamped,
            } as Partial<VisualizerSettings[typeof sectionKey]>);
          }}
          disabled={isDisabled}
        />
        {infoKey === controlKey && control.description ? (
          <p className="mt-2 text-[11px] text-slate-400">{control.description}</p>
        ) : null}
      </div>
    );
  };

  const renderToggle = (control: FocusControl) => {
    const controlKey = String(control.key);
    const checked = Boolean(sectionSettings[controlKey]);
    return (
      <div
        key={controlKey}
        className="rounded-md border border-slate-800 bg-slate-900/60 p-3 shadow-sm"
      >
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-2">
            {control.label}
            {control.description ? (
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] text-slate-300 hover:border-blue-400 hover:text-blue-200"
                onClick={() => handleInfoToggle(controlKey)}
                aria-label={`About ${control.label}`}
              >
                ?
              </button>
            ) : null}
          </span>
          <span className="font-mono text-slate-200">{checked ? 'On' : 'Off'}</span>
        </div>
        <label className="mt-3 inline-flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-9 cursor-pointer appearance-none rounded-full border border-slate-600 bg-slate-700 transition checked:border-emerald-500 checked:bg-emerald-500"
            checked={checked}
            onChange={() =>
              updateSettings(sectionKey, {
                [control.key]: !checked,
              } as Partial<VisualizerSettings[typeof sectionKey]>)
            }
          />
          <span className="text-xs text-slate-300">Toggle</span>
        </label>
        {infoKey === controlKey && control.description ? (
          <p className="mt-2 text-[11px] text-slate-400">{control.description}</p>
        ) : null}
      </div>
    );
  };

  const renderSelect = (control: FocusControl) => {
    const controlKey = String(control.key);
    const options = control.options ?? [];
    const value = String(sectionSettings[controlKey] ?? options[0]?.value ?? '');
    const isDisabled = control.disabled ? control.disabled(settings[sectionKey] as never) : false;
    return (
      <div
        key={controlKey}
        className={`rounded-md border border-slate-800 bg-slate-900/60 p-3 shadow-sm ${isDisabled ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-2">
            {control.label}
            {control.description ? (
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] text-slate-300 hover:border-blue-400 hover:text-blue-200"
                onClick={() => handleInfoToggle(controlKey)}
                aria-label={`About ${control.label}`}
              >
                ?
              </button>
            ) : null}
          </span>
        </div>
        <select
          className="mt-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          value={value}
          onChange={(event) => {
            if (isDisabled) return;
            updateSettings(sectionKey, {
              [control.key]: event.target.value,
            } as Partial<VisualizerSettings[typeof sectionKey]>);
          }}
          disabled={isDisabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {infoKey === controlKey && control.description ? (
          <p className="mt-2 text-[11px] text-slate-400">{control.description}</p>
        ) : null}
      </div>
    );
  };

  const renderControl = (control: FocusControl) => {
    if (control.kind === 'toggle') return renderToggle(control);
    if (control.kind === 'select') return renderSelect(control);
    return renderSlider(control);
  };

  const sliderControls = controls.filter((control) => (control.kind ?? 'slider') === 'slider');
  const otherControls = controls.filter((control) => control.kind && control.kind !== 'slider');

  const sectionTitle = pathname === '/particles'
    ? 'Particle Field'
    : pathname === '/fluid'
      ? 'Fluid Injection'
      : 'Settings';

  const sectionDescription = pathname === '/particles'
    ? 'Tweak emission, lifetime, palette, and motion of the particle cloud.'
    : pathname === '/fluid'
      ? 'Configure how audio energy maps to colour and motion in the fluid solver.'
      : 'Fine-tune the current visualizer.';

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow lg:sticky lg:top-28 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Settings</p>
          <h3 className="text-sm font-semibold text-slate-100">{sectionTitle}</h3>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-blue-500 hover:text-blue-200 lg:hidden"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">{sectionDescription}</p>
      <div className={`mt-4 flex flex-col gap-4 ${collapsed ? 'hidden lg:flex' : 'flex'}`}>
        {sliderControls.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sliderControls.map(renderControl)}
          </div>
        ) : null}
        {otherControls.length > 0 ? (
          <div className="grid gap-3">
            {otherControls.map(renderControl)}
          </div>
        ) : null}
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
            onClick={() => resetSection(sectionKey)}
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
