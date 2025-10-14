import ParticlesScene from '@/features/visualizers/ParticlesScene';

export default function ParticlesPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Particle Bursts</h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Audio energy spawns new particles from the origin, boosting emission and particle size as
          the spectrum heats up. The cloud slowly rotates to show depth while additive blending keeps
          brighter results on busy passages.
        </p>
      </section>
      <ParticlesScene />
    </div>
  );
}
