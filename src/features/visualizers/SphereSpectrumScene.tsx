'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';

export type SphereVariant = 'angels' | 'hedgehog' | 'lotus';

const variantConfig: Record<
  SphereVariant,
  {
    step: number;
    accentStrength: number;
    baseStrength: number;
    color: string;
    emissive: string;
  }
> = {
  angels: {
    step: 4,
    accentStrength: 6.5,
    baseStrength: 2.5,
    color: '#7dd3fc',
    emissive: '#0f172a',
  },
  hedgehog: {
    step: 6,
    accentStrength: 8.5,
    baseStrength: 3.2,
    color: '#fcd34d',
    emissive: '#78350f',
  },
  lotus: {
    step: 1,
    accentStrength: 4.2,
    baseStrength: 2.8,
    color: '#f0abfc',
    emissive: '#4c1d95',
  },
};

const sumRange = (buffer: Uint8Array, start: number, end: number) => {
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += buffer[i];
  }
  return total;
};

export const SphereSpectrumScene: React.FC<{ variant: SphereVariant }> = ({ variant }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const { sphere: sphereSettings } = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      100,
    );
    camera.position.set(0, 0.4, 4.2);

    const ambient = new THREE.AmbientLight(0x1f2937, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xa855f7, 1.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x38bdf8, sphereSettings.fillLightBase, 10);
    fillLight.position.set(-4, 2, -4);
    scene.add(fillLight);

    const backLight = new THREE.PointLight(0xf97316, sphereSettings.backLightBase, 10);
    backLight.position.set(0, -3, 4);
    scene.add(backLight);

    const geometry = new THREE.SphereGeometry(1, 128, 64);
    const material = new THREE.MeshStandardMaterial({
      color: variantConfig[variant].color,
      emissive: variantConfig[variant].emissive,
      roughness: 0.25,
      metalness: 0.5,
      emissiveIntensity: sphereSettings.emissiveMin,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array as Float32Array;
    const basePositions = positions.slice();

    const analyserSize = analyser?.frequencyBinCount ?? 1024;
    const spectrum = new Uint8Array(analyserSize);

    let animationFrame = 0;
    let rotationVelocity = sphereSettings.rotationBase;

    const renderFrame = () => {
      animationFrame = window.requestAnimationFrame(renderFrame);

      if (analyser) {
        getFrequencyData(spectrum);
        const config = variantConfig[variant];
        const totalBins = spectrum.length;
        const vertexCount = positionAttribute.count;
        const lowEnd = Math.floor(totalBins * 0.15);
        const midEnd = Math.floor(totalBins * 0.55);
        const highEnd = totalBins;

        const lowAvg = sumRange(spectrum, 0, lowEnd) / Math.max(1, lowEnd);
        const midAvg = sumRange(spectrum, lowEnd, midEnd) / Math.max(1, midEnd - lowEnd);
        const highAvg = sumRange(spectrum, midEnd, highEnd) / Math.max(1, highEnd - midEnd);

        rotationVelocity = sphereSettings.rotationBase + (midAvg / 255) * sphereSettings.rotationGain;

        const accentStrength = config.accentStrength * sphereSettings.accentScale;
        const baseStrength = config.baseStrength * sphereSettings.baseScale;

        for (let i = 0; i < vertexCount; i += 1) {
          const baseIndex = i * 3;
          const spectrumIndex = Math.floor((i / vertexCount) * totalBins);
          const magnitude = spectrum[spectrumIndex] / 255;

          const accent = 1 + magnitude * accentStrength;
          const subtle = 1 + magnitude * baseStrength;
          const displacement = i % config.step === 0 ? accent : subtle;

          const lerp = sphereSettings.smoothing;

          const targetX = basePositions[baseIndex] * displacement;
          const targetY = basePositions[baseIndex + 1] * displacement;
          const targetZ = basePositions[baseIndex + 2] * displacement;

          positions[baseIndex] += (targetX - positions[baseIndex]) * lerp;
          positions[baseIndex + 1] += (targetY - positions[baseIndex + 1]) * lerp;
          positions[baseIndex + 2] += (targetZ - positions[baseIndex + 2]) * lerp;
        }

        positionAttribute.needsUpdate = true;
        geometry.computeVertexNormals();

        const emissiveBoost = Math.min(1.2, (midAvg / 255) * sphereSettings.emissiveGain + (highAvg / 255) * 0.8);
        material.emissiveIntensity = sphereSettings.emissiveMin + emissiveBoost;
        material.color.setHSL(0.55 + (highAvg / 255) * 0.1, 0.8, 0.6);

        fillLight.intensity = sphereSettings.fillLightBase + (highAvg / 255) * sphereSettings.fillLightGain;
        backLight.intensity = sphereSettings.backLightBase + (lowAvg / 255) * sphereSettings.backLightGain;
        backLight.position.x = Math.sin(Date.now() * 0.001) * (1 + (lowAvg / 255) * sphereSettings.backLightOrbitGain);
      }

      sphere.rotation.y += rotationVelocity;
      sphere.rotation.x += rotationVelocity * 0.5;

      renderer.render(scene, camera);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    renderFrame();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [analyser, getFrequencyData, sphereSettings, variant]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/9] w-full min-h-[26rem] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
    />
  );
};

export default SphereSpectrumScene;
