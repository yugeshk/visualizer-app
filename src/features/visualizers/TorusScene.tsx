'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';

const averageRange = (buffer: Uint8Array, start: number, end: number) => {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i += 1) {
    sum += buffer[i];
  }
  return sum / (end - start);
};

const maxRange = (buffer: Uint8Array, start: number, end: number) => {
  let max = 0;
  for (let i = start; i < end; i += 1) {
    if (buffer[i] > max) max = buffer[i];
  }
  return max;
};

export const TorusScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const { torus: torusSettings } = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0.6, 4.2);

    const ambient = new THREE.AmbientLight(0x1c2541, 0.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x4f46e5, 1.4);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x22d3ee, 1.2, 10);
    fillLight.position.set(-3, -2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xf97316, 0.9, 10);
    rimLight.position.set(3, -2, 2);
    scene.add(rimLight);

    const geometry = new THREE.TorusGeometry(1, 0.38, 48, 128);
    const material = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.45,
      roughness: 0.3,
      emissive: new THREE.Color('#0f172a'),
      emissiveIntensity: torusSettings.emissiveBase,
    });

    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);

    const analyserSize = analyser?.frequencyBinCount ?? 1024;
    const spectrum = new Uint8Array(analyserSize);

    let animationFrame = 0;

    const renderFrame = () => {
      animationFrame = window.requestAnimationFrame(renderFrame);

      if (analyser) {
        getFrequencyData(spectrum);
        const segment = Math.floor(spectrum.length / 3);
        const lowAvg = averageRange(spectrum, 0, segment);
        const midAvg = averageRange(spectrum, segment, segment * 2);
        const highAvg = averageRange(spectrum, segment * 2, spectrum.length);
        const lowMax = maxRange(spectrum, 0, segment) || 1;
        const highMax = maxRange(spectrum, segment * 2, spectrum.length) || 1;

        const lowNorm = lowAvg / lowMax;
        const highNorm = highAvg / highMax;
        const midNorm = midAvg / 255;

        const smoothing = torusSettings.scaleSmoothing;
        const scaleX = 1 + lowNorm * torusSettings.lowScaleMultiplier;
        const scaleY = 1 + highNorm * torusSettings.highScaleMultiplier;
        const scaleZ = 1 + Math.max(lowNorm, highNorm) * torusSettings.depthScaleMultiplier;
        torus.scale.x += (scaleX - torus.scale.x) * smoothing;
        torus.scale.y += (scaleY - torus.scale.y) * smoothing;
        torus.scale.z += (scaleZ - torus.scale.z) * smoothing;

        torus.rotation.x += torusSettings.baseRotation + midNorm * torusSettings.rotationGain;
        torus.rotation.y += torusSettings.baseRotation + lowNorm * torusSettings.rotationGain * 1.2;
        torus.rotation.z += torusSettings.baseRotation + highNorm * torusSettings.rotationGain * 0.6;

        const emissiveBoost = Math.min(0.9, midNorm * 1.5 + highNorm * 1.2);
        material.emissiveIntensity = torusSettings.emissiveBase + emissiveBoost * torusSettings.emissiveGain;
        material.color.setHSL(0.56 + highNorm * 0.1, 0.85, 0.45 + midNorm * 0.25);

        fillLight.intensity = 1 + highNorm * 1.5;
        rimLight.intensity = 0.7 + midNorm * 1.2;
        rimLight.position.y = Math.sin(Date.now() * 0.001) * (0.5 + lowNorm);
      } else {
        torus.rotation.x += torusSettings.baseRotation;
        torus.rotation.y += torusSettings.baseRotation * 1.3;
      }

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
  }, [analyser, getFrequencyData, torusSettings]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/9] w-full min-h-[26rem] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80"
    />
  );
};

export default TorusScene;
