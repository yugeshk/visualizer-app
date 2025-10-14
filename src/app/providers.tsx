'use client';

import React from 'react';
import { AudioProvider } from '@/components/audio/AudioProvider';
import { AppShell } from '@/components/layout/AppShell';
import { VisualizerSettingsProvider } from '@/components/settings/VisualizerSettingsProvider';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <VisualizerSettingsProvider>
      <AudioProvider>
        <AppShell>{children}</AppShell>
      </AudioProvider>
    </VisualizerSettingsProvider>
  );
};
