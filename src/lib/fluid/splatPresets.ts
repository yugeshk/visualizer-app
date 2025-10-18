export const FLUID_SPLAT_PRESETS = [
  {
    id: 'random' as const,
    label: 'Random Scatter',
    description: 'Sprays audio splats across the canvas with varied angles and energy.',
  },
  {
    id: 'bottomLeftSpiral' as const,
    label: 'Bottom-Left Spiral',
    description: 'Launches streaks from the bottom-left corner that curl upward in a spiral.',
  },
  {
    id: 'centerPulse' as const,
    label: 'Center Pulse',
    description: 'Pulses from the centre with cross-shaped bursts and gentle ripples.',
  },
  {
    id: 'ringBurst' as const,
    label: 'Ring Burst',
    description: 'Fires a circular burst around the centre, pushing dye outward in all directions.',
  },
  {
    id: 'verticalCascade' as const,
    label: 'Vertical Cascade',
    description: 'Creates a falling waterfall column that shears dye downward.',
  },
  {
    id: 'twinJets' as const,
    label: 'Twin Jets',
    description: 'Shoots opposing jets from the left and right edges toward the centre.',
  },
  {
    id: 'orbitSweep' as const,
    label: 'Orbit Sweep',
    description: 'Spins an orbital wave around the centre with tangential motion.',
  },
  {
    id: 'diagonalDrift' as const,
    label: 'Diagonal Drift',
    description: 'Glides streaks along the top-left to bottom-right diagonal path.',
  },
];

export type FluidSplatPresetId = (typeof FLUID_SPLAT_PRESETS)[number]['id'];

export const FLUID_SPLAT_PRESET_SET = new Set<FluidSplatPresetId>(FLUID_SPLAT_PRESETS.map((preset) => preset.id));

export const fluidSplatPresetOptions = FLUID_SPLAT_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

export const getFluidSplatPresetDescription = (id: FluidSplatPresetId): string => {
  const preset = FLUID_SPLAT_PRESETS.find((entry) => entry.id === id);
  return preset?.description ?? '';
};
