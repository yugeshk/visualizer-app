'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { AudioControls } from '../audio/AudioControls';
import { VisualizerSettingsPanel } from '../settings/VisualizerSettingsPanel';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/torus', label: 'Torus' },
  { href: '/sphere/angels', label: 'Angels' },
  { href: '/sphere/hedgehog', label: 'Hedgehog' },
  { href: '/sphere/lotus', label: 'Lotus' },
  { href: '/terrain', label: 'Terrain' },
  { href: '/particles', label: 'Particles' },
  { href: '/fluid', label: 'Fluid' },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Audio Visual Toolkit</p>
              <h1 className="text-2xl font-semibold">WebGL Visual Playground</h1>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>Load an audio file, pick a visualization, and tweak ideas.</p>
            </div>
          </div>
          <AudioControls />
          <nav className="flex flex-wrap gap-2 text-sm">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full border px-3 py-1 transition ${
                    isActive
                      ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                      : 'border-slate-700 hover:border-blue-500 hover:text-blue-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),22rem]">
          <div className="min-w-0 space-y-6">{children}</div>
          <VisualizerSettingsPanel />
        </div>
      </main>
      <footer className="border-t border-slate-800 bg-slate-900/80 py-4 text-center text-xs text-slate-500">
        Built on Next.js · Visual experiments by repurposing existing WebGL demos.
      </footer>
    </div>
  );
};
