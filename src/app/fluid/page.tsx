import FluidFrame from '@/features/visualizers/FluidFrame';

export default function FluidPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Fluid Simulation</h2>
        <p className="max-w-2xl text-sm text-slate-300">
          The original WebGL fluid simulation is embedded below. We inject analyser energy into the
          shader so louder segments trigger bigger splats with hues adjusted by the spectral balance.
          Use the embedded control panel to tweak simulation parameters.
        </p>
      </section>
      <FluidFrame />
    </div>
  );
}
