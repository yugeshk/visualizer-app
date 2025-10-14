import TorusScene from '@/features/visualizers/TorusScene';

export default function TorusPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Torus Pulse</h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Classic torus scaling driven by low and high frequency buckets. The mesh eases between
          scales using running averages while rotating around all axes. Lighting reacts to the
          spectrum to keep highlights lively even with ambient audio.
        </p>
      </section>
      <TorusScene />
    </div>
  );
}
