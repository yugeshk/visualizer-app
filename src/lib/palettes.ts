export type FluidPreset = {
  id: string;
  label: string;
  rgb: [number, number, number];
};

export type ParticlePreset = {
  id: string;
  label: string;
  hex: number;
};

export const FLUID_COLOR_PRESETS: FluidPreset[] = [
  { id: 'aurora', label: 'Aurora Teal', rgb: [0.18, 0.78, 0.82] },
  { id: 'ember', label: 'Molten Ember', rgb: [0.92, 0.42, 0.19] },
  { id: 'violet-dream', label: 'Violet Dream', rgb: [0.62, 0.34, 0.92] },
  { id: 'ocean-mist', label: 'Ocean Mist', rgb: [0.12, 0.58, 0.86] },
  { id: 'citrus-punch', label: 'Citrus Punch', rgb: [0.98, 0.76, 0.18] },
  { id: 'crimson-wave', label: 'Crimson Wave', rgb: [0.86, 0.18, 0.3] },
  { id: 'forest-glow', label: 'Forest Glow', rgb: [0.08, 0.52, 0.32] },
  { id: 'midnight', label: 'Midnight Blue', rgb: [0.08, 0.22, 0.5] },
];

export const PARTICLE_COLOR_PRESETS: ParticlePreset[] = [
  { id: 'sunrise', label: 'Sunrise Amber', hex: 0xff9a3c },
  { id: 'neon', label: 'Neon Magenta', hex: 0xff2bd6 },
  { id: 'lagoon', label: 'Lagoon Cyan', hex: 0x2bf5ff },
  { id: 'aurora', label: 'Aurora Green', hex: 0x3bff7f },
  { id: 'ember', label: 'Ember Red', hex: 0xff4f58 },
  { id: 'violet', label: 'Violet Mist', hex: 0x9c6bff },
  { id: 'gold', label: 'Golden Glow', hex: 0xffe066 },
  { id: 'ice', label: 'Icy Blue', hex: 0x8ee7ff },
  { id: 'forest', label: 'Forest Fern', hex: 0x4ad66d },
  { id: 'night', label: 'Night Sky', hex: 0x3559ff },
];

export const paletteModeOptions = [
  { value: 'auto', label: 'Automatic (Audio Reactive)' },
  { value: 'manual', label: 'Manual Preset' },
] as const;

export const fluidPresetOptions = FLUID_COLOR_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

export const particlePresetOptions = PARTICLE_COLOR_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

export const FLUID_PRESET_MAP = Object.fromEntries(
  FLUID_COLOR_PRESETS.map((preset) => [preset.id, preset.rgb] as const),
);

export const PARTICLE_PRESET_MAP = Object.fromEntries(
  PARTICLE_COLOR_PRESETS.map((preset) => [preset.id, preset.hex] as const),
);
