'use client';

import { useAudio } from '@/components/audio/AudioProvider';
import { useVisualizerSettings } from '@/components/settings/VisualizerSettingsProvider';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 6000;

const createCircleTexture = () => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create 2d context for particle texture');
  }
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const ParticlesScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { analyser, getFrequencyData } = useAudio();
  const { settings } = useVisualizerSettings();
  const { particles: particleSettings } = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 40);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const lifetimes = new Float32Array(PARTICLE_COUNT);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        pointTexture: { value: createCircleTexture() },
      },
      vertexColors: true,
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 textureColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * textureColor;
        }
      `,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const spawnParticle = (index: number, energy: number) => {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();
      const speed = particleSettings.speedBase + energy * particleSettings.speedGain + Math.random() * particleSettings.randomSpeedRange;
      velocities[index * 3] = direction.x * speed;
      velocities[index * 3 + 1] = direction.y * speed;
      velocities[index * 3 + 2] = direction.z * speed;

      positions[index * 3] = 0;
      positions[index * 3 + 1] = 0;
      positions[index * 3 + 2] = 0;

      const hue = 0.55 - energy * 0.35 + Math.random() * 0.05;
      const color = new THREE.Color().setHSL(hue, 0.9, 0.6 + energy * 0.2);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;

      sizes[index] = particleSettings.sizeBase + energy * particleSettings.sizeGain;
      lifetimes[index] = particleSettings.lifetimeBase + Math.random() * particleSettings.lifetimeVariance;
    };

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      spawnParticle(i, 0.2);
      lifetimes[i] = Math.random() * (particleSettings.lifetimeBase + particleSettings.lifetimeVariance);
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }

    const analyserSize = analyser?.frequencyBinCount ?? 1024;
    const spectrum = new Uint8Array(analyserSize);

    const clock = new THREE.Clock();
    let animationFrame = 0;
    let cursor = 0;

    const texture = material.uniforms.pointTexture.value as THREE.Texture;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

    const renderFrame = () => {
      animationFrame = window.requestAnimationFrame(renderFrame);
      const delta = clock.getDelta();

      let energy = 0.1;
      if (analyser) {
        getFrequencyData(spectrum);
        let sum = 0;
        for (let i = 0; i < spectrum.length; i += 1) {
          sum += spectrum[i];
        }
        energy = Math.min(1, sum / (spectrum.length * 255));
      }

      const spawnCount = Math.min(
        PARTICLE_COUNT,
        Math.floor(particleSettings.spawnBase + energy * particleSettings.spawnMultiplier),
      );

      for (let i = 0; i < spawnCount; i += 1) {
        spawnParticle(cursor, energy);
        cursor = (cursor + 1) % PARTICLE_COUNT;
      }

      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        const life = (lifetimes[i] -= delta);
        if (life <= 0) {
          spawnParticle(i, energy);
          continue;
        }

        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

        const fade = Math.max(0, life / particleSettings.fadeDivider);
        colors[i * 3] *= fade;
        colors[i * 3 + 1] *= fade;
        colors[i * 3 + 2] *= fade;
        sizes[i] *= particleSettings.sizeDecay;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;

      particles.rotation.y += delta * particleSettings.rotationSpeed;

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
      texture.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [analyser, getFrequencyData, particleSettings]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/9] w-full min-h-[26rem] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
    />
  );
};

export default ParticlesScene;
