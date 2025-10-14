import TerrainScene from '@/features/visualizers/TerrainScene';

export default function TerrainPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Audio Terrain</h2>
        <p className="max-w-2xl text-sm text-slate-300">
          Height maps ebb and flow with low and mid frequency energy. Lighting shifts position and
          intensity so kicks punch ridges into the landscape while highs shimmer across the surface.
        </p>
      </section>
      <TerrainScene />
    </div>
  );
}
