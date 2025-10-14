'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import { useEffect, useRef, useState } from 'react';

const average = (buffer: Uint8Array, start: number, end: number) => {
  if (end <= start) return 0;
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += buffer[i];
  }
  return total / (end - start);
};

export const FluidFrame: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const { fluid: fluidSettings } = settings;
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    if (!frameReady || !analyser) return;
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    let animationFrame = 0;

    const sendEnergy = () => {
      animationFrame = window.requestAnimationFrame(sendEnergy);
      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow) return;

      getFrequencyData(spectrum);
      const lowEnd = Math.floor(spectrum.length * 0.18);
      const midEnd = Math.floor(spectrum.length * 0.7);
      const bass = average(spectrum, 0, lowEnd) / 255;
      const mids = average(spectrum, lowEnd, midEnd) / 255;
      const highs = average(spectrum, midEnd, spectrum.length) / 255;

      const weightSum = fluidSettings.bassWeight + fluidSettings.midWeight + fluidSettings.highWeight || 1;
      const weightedEnergy =
        (bass * fluidSettings.bassWeight + mids * fluidSettings.midWeight + highs * fluidSettings.highWeight) /
        weightSum;
      const energy = Math.min(1, weightedEnergy * fluidSettings.energyBoost);
      const color = [
        Math.min(1, fluidSettings.colorBase + highs * fluidSettings.colorGain),
        Math.min(1, fluidSettings.colorBase + mids * fluidSettings.colorGain),
        Math.min(1, fluidSettings.colorBase + bass * fluidSettings.colorGain),
      ];

      targetWindow.postMessage(
        {
          source: 'next-audio-bridge',
          type: 'audio-energy',
          energy,
          color,
        },
        '*',
      );
    };

    sendEnergy();

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [analyser, fluidSettings, frameReady, getFrequencyData]);

  return (
    <iframe
      ref={iframeRef}
      onLoad={() => setFrameReady(true)}
      src="/legacy/fluid/index.html"
      title="Fluid Simulation"
      className="h-[32rem] w-full overflow-hidden rounded-2xl border border-slate-800 shadow-lg"
      allow="fullscreen"
    />
  );
};

export default FluidFrame;
