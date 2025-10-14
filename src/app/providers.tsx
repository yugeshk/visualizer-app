'use client';

import React from 'react';
import { AudioProvider } from '@/components/audio/AudioProvider';
import { BackgroundProvider } from '@/components/background/BackgroundProvider';
import { AppShell } from '@/components/layout/AppShell';
import { VisualizerSettingsProvider } from '@/components/settings/VisualizerSettingsProvider';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <VisualizerSettingsProvider>
      <BackgroundProvider>
        <AudioProvider>
          <AppShell>{children}</AppShell>
        </AudioProvider>
      </BackgroundProvider>
    </VisualizerSettingsProvider>
  );
};
