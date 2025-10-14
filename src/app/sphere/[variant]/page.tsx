import { notFound } from 'next/navigation';
import SphereSpectrumScene, { SphereVariant } from '@/features/visualizers/SphereSpectrumScene';

const variantCopy: Record<SphereVariant, { title: string; description: string }> = {
  angels: {
    title: 'Angels',
    description:
      'Feathered spikes bloom from the sphere in repeating bands, evoking wings dancing to higher harmonics.',
  },
  hedgehog: {
    title: 'Hedgehog',
    description:
      'Sharper bursts lean on accent vertices to create a spiky silhouette that reacts strongly to percussive energy.',
  },
  lotus: {
    title: 'Lotus',
    description:
      'A smoother variant that scales every vertex to mimic unfolding petals, perfect for evolving pads.',
  },
};

export default async function SphereVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  const typedVariant = variant as SphereVariant;
  if (!variantCopy[typedVariant]) {
    notFound();
  }

  const { title, description } = variantCopy[typedVariant];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl font-semibold">Sphere Spectrum · {title}</h2>
        <p className="max-w-2xl text-sm text-slate-300">{description}</p>
      </section>
      <SphereSpectrumScene variant={typedVariant} />
    </div>
  );
}
