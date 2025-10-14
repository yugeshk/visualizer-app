'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';

const GRID_SIZE = 150;
const GRID_DIMENSION = 120;

const average = (buffer: Uint8Array, start: number, end: number) => {
  if (end <= start) return 0;
  let total = 0;
  for (let i = start; i < end; i += 1) {
    total += buffer[i];
  }
  return total / (end - start);
};

export const TerrainScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const { terrain: terrainSettings } = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.012);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      600,
    );
    camera.position.set(0, 32, 68);

    const ambient = new THREE.AmbientLight(0x3b82f6, 0.25);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xf97316, terrainSettings.sunIntensityBase);
    sun.position.set(20, 40, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    const backLight = new THREE.PointLight(0x38bdf8, terrainSettings.backlightBase, 120);
    backLight.position.set(-30, 25, -20);
    scene.add(backLight);

    const geometry = new THREE.PlaneGeometry(GRID_DIMENSION, GRID_DIMENSION, GRID_SIZE, GRID_SIZE);
    geometry.rotateX(-Math.PI / 2);
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const basePositions = positions.slice();

    const material = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      wireframe: false,
      roughness: 0.65,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    scene.add(mesh);

    const analyserSize = analyser?.frequencyBinCount ?? 1024;
    const spectrum = new Uint8Array(analyserSize);

    const clock = new THREE.Clock();
    let animationFrame = 0;
    let timeOffset = 0;

    const renderFrame = () => {
      animationFrame = window.requestAnimationFrame(renderFrame);
      const delta = clock.getDelta();
      timeOffset += delta * 0.4;

      let lowEnergy = 0.1;
      let midEnergy = 0.1;
      let highEnergy = 0.1;
      if (analyser) {
        getFrequencyData(spectrum);
        const lowEnd = Math.floor(spectrum.length * 0.15);
        const midEnd = Math.floor(spectrum.length * 0.5);
        lowEnergy = average(spectrum, 0, lowEnd) / 255;
        midEnergy = average(spectrum, lowEnd, midEnd) / 255;
        highEnergy = average(spectrum, midEnd, spectrum.length) / 255;
      }

      const currentPositions = positionAttribute.array as Float32Array;
      const waveform = lowEnergy * terrainSettings.waveformLowGain + midEnergy * terrainSettings.waveformMidGain;

      for (let i = 0; i < currentPositions.length; i += 3) {
        const baseX = basePositions[i];
        const baseZ = basePositions[i + 2];
        const waveComponent = (Math.sin(baseX * 0.6 + timeOffset * 1.6) + Math.cos(baseZ * 0.8 + timeOffset)) * terrainSettings.waveWeight;
        const radialComponent = Math.sin(Math.sqrt(baseX * baseX + baseZ * baseZ) * 0.9 - timeOffset * 3) * terrainSettings.radialWeight * highEnergy;
        const target = (waveComponent + radialComponent + waveform) * terrainSettings.heightMultiplier;
        currentPositions[i + 1] += (target - currentPositions[i + 1]) * terrainSettings.smoothing;
      }

      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();

      sun.intensity = terrainSettings.sunIntensityBase + midEnergy * terrainSettings.sunIntensityGain;
      sun.position.x = 20 + Math.sin(timeOffset) * 15 * (0.3 + highEnergy);
      sun.position.z = 10 + Math.cos(timeOffset * 0.7) * 18;
      backLight.intensity = terrainSettings.backlightBase + highEnergy * terrainSettings.backlightGain;

      camera.position.x = Math.sin(timeOffset * terrainSettings.cameraOrbitSpeed) * 18;
      camera.lookAt(mesh.position);

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
  }, [analyser, getFrequencyData, terrainSettings]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/9] w-full min-h-[26rem] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
    />
  );
};

export default TerrainScene;
