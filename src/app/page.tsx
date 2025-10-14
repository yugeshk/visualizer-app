export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Getting Started</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Load an audio file with the controls above, then pick any visualization from the
          navigation bar. Each scene consumes live data from the shared audio analyser so you can
          compare how different shaders respond. Most demos come from the original WebGL experiments
          in this repository, rebuilt for React and Next.js.
        </p>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow">
          <h3 className="text-lg font-semibold text-blue-200">Audio Workflow</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Choose any local audio file (most formats supported by browsers).</li>
            <li>Use play, pause, and stop controls to drive all visualisers in sync.</li>
            <li>Scenes use a shared analyser node (FFT size 2048, smoothing 0.8) for spectrum + waveform data.</li>
          </ul>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow">
          <h3 className="text-lg font-semibold text-emerald-200">What&apos;s Here</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>Classic three.js torus morph driven by low/high spectrum buckets.</li>
            <li>Sphere variants (Angels, Hedgehog, Lotus) using vertex displacement.</li>
            <li>Terrain and particle demos reworked to stream analyser data.</li>
            <li>Fluid simulator with experimental audio splats for amplitude spikes.</li>
          </ul>
        </article>
      </section>
      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Notes</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>All rendering runs on the client; keep an eye on performance when stacking browser tabs.</li>
          <li>Most shaders rely on frequency magnitudes between 0 and 255. Normalisation happens per frame.</li>
          <li>Feel free to remix components or add new WebGL scenes under the <code>src/features</code> directory.</li>
        </ul>
      </section>
    </div>
  );
}
