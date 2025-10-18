export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds + 0.0001);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseTime = (input: string): number => {
  if (!input) return 0;
  const normalized = input.trim();
  if (normalized.includes(':')) {
    const [minPart, secPart] = normalized.split(':');
    const mins = Number(minPart) || 0;
    const secs = Number(secPart) || 0;
    return Math.max(mins * 60 + secs, 0);
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? Math.max(numeric, 0) : 0;
};
