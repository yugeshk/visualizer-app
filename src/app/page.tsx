export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-100">Audio Visualizer Playground</h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-300">
          Pair your audio with custom backgrounds and explore the fluid and particle visualizers. Each scene shares the
          same analyser and settings panel, so you can dial in a look you love and re-use it later.
        </p>
      </section>
      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow">
          <h2 className="text-base font-semibold text-blue-200">1. Load Media</h2>
          <p className="mt-2 text-sm text-slate-300">Upload an audio track and an optional background image using the controls in the header.</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow">
          <h2 className="text-base font-semibold text-emerald-200">2. Choose a Visualizer</h2>
          <p className="mt-2 text-sm text-slate-300">Jump into the Fluid or Particle views to see the analyser drive colour, motion, and splats in real time.</p>
        </article>
        <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-5 shadow">
          <h2 className="text-base font-semibold text-amber-200">3. Tweak &amp; Save</h2>
          <p className="mt-2 text-sm text-slate-300">Open the settings drawer to adjust colour modes, intensity, and audio response. Export or import presets to share a look.</p>
        </article>
      </section>
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
        <h2 className="text-base font-semibold text-slate-100">Tips</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Need calmer fluid motion? Lower Audio Reactivity or Splat Force in the settings panel.</li>
          <li>Switch Colour Mode to Manual to pick from curated palettes for both visualizers.</li>
          <li>Configs persist locally, so your favourite combinations are waiting on reload.</li>
        </ul>
      </section>
    </div>
  );
}
