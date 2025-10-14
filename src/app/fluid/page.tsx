import FluidFrame from '@/features/visualizers/FluidFrame';

export default function FluidPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Fluid Simulation</h2>
        <p className="max-w-2xl text-sm text-slate-300">
          The original WebGL fluid simulation is embedded below. In audio-reactive mode the analyser
          feeds energy data straight into the shader so louder segments trigger bigger splats with
          hues guided by the spectral balance.
        </p>
        <p className="max-w-2xl text-sm text-slate-300">
          Switch the <span className="font-semibold text-emerald-200">Audio Reactive Mode</span> toggle in the settings panel to
          experiment manually; when disabled you can fire splats with the button under the canvas.
        </p>
      </section>
      <FluidFrame />
    </div>
  );
}
