'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useBackground } from '@/components/background/BackgroundProvider';
import { formatTime, parseTime } from '@/lib/time';

interface VideoRecorderPanelProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

type RecorderStatus = 'idle' | 'preparing' | 'recording' | 'processing' | 'ready' | 'error';

const DEFAULT_CLIP_SECONDS = 12;

export const VideoRecorderPanel: React.FC<VideoRecorderPanelProps> = ({ canvasRef }) => {
  const { audioElement, currentTime, duration, isReady, getAudioStream } = useAudio();
  const { backgroundUrl } = useBackground();

  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(DEFAULT_CLIP_SECONDS);
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [qualityScale, setQualityScale] = useState(1.5);

  const baseCanvas = canvasRef.current;
  const baseWidth = baseCanvas?.clientWidth || baseCanvas?.width || 0;
  const baseHeight = baseCanvas?.clientHeight || baseCanvas?.height || 0;
  const deviceScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const safeScale = qualityScale > 0 ? qualityScale : 1;
  const renderWidth = baseWidth ? Math.round(baseWidth * deviceScale * safeScale) : 0;
  const renderHeight = baseHeight ? Math.round(baseHeight * deviceScale * safeScale) : 0;

  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const copyFrameRafRef = useRef<number | null>(null);
  const stopMonitorRafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const previousPlaybackRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);

  useEffect(() => () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }, [downloadUrl]);

  useEffect(() => {
    if (!backgroundUrl) {
      backgroundImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backgroundUrl;
    img.onload = () => {
      backgroundImageRef.current = img;
    };
    img.onerror = () => {
      backgroundImageRef.current = null;
    };
  }, [backgroundUrl]);

  useEffect(() => {
    if (!enabled || duration <= 0) return;
    setEndTime((prev) => {
      if (prev > 0) return prev;
      return Math.min(DEFAULT_CLIP_SECONDS, duration);
    });
  }, [enabled, duration]);

  const seekable = isReady && duration > 0;

  const safeStartTime = useMemo(() => clampRange(startTime, 0, duration || 0), [startTime, duration]);
  const safeEndTime = useMemo(() => clampRange(endTime, 0, duration || 0), [endTime, duration]);

  const ensureCompositeCanvas = useCallback(() => {
    const source = canvasRef.current;
    if (!source) return null;
    const scale = qualityScale > 0 ? qualityScale : 1;
    const width = Math.max(1, Math.floor(source.width * scale));
    const height = Math.max(1, Math.floor(source.height * scale));
    if (!width || !height) return null;
    let composite = compositeCanvasRef.current;
    if (!composite) {
      composite = document.createElement('canvas');
      compositeCanvasRef.current = composite;
    }
    if (composite.width !== width || composite.height !== height) {
      composite.width = width;
      composite.height = height;
    }
    const ctx = compositeContextRef.current ?? composite.getContext('2d');
    if (!ctx) return null;
    compositeContextRef.current = ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return composite;
  }, [canvasRef, qualityScale]);

  const drawFrame = useCallback(() => {
    const composite = compositeCanvasRef.current;
    const ctx = compositeContextRef.current;
    const source = canvasRef.current;
    if (!composite || !ctx || !source) return;

    if (backgroundImageRef.current) {
      drawCoverImage(ctx, backgroundImageRef.current, composite.width, composite.height);
    } else {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, composite.width, composite.height);
    }

    ctx.drawImage(source, 0, 0, composite.width, composite.height);
  }, [canvasRef]);

  const startCopyLoop = useCallback(() => {
    const step = () => {
      drawFrame();
      copyFrameRafRef.current = window.requestAnimationFrame(step);
    };
    copyFrameRafRef.current = window.requestAnimationFrame(step);
  }, [drawFrame]);

  const stopCopyLoop = useCallback(() => {
    if (copyFrameRafRef.current !== null) {
      window.cancelAnimationFrame(copyFrameRafRef.current);
      copyFrameRafRef.current = null;
    }
  }, []);

  const stopMonitor = useCallback(() => {
    if (stopMonitorRafRef.current !== null) {
      window.cancelAnimationFrame(stopMonitorRafRef.current);
      stopMonitorRafRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopCopyLoop();
    stopMonitor();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [stopCopyLoop, stopMonitor]);

  const finalizeRecording = useCallback(() => {
    stopMonitor();
    if (audioElement) {
      audioElement.pause();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setStatus('processing');
      mediaRecorderRef.current.stop();
    }

    const previous = previousPlaybackRef.current;
    if (previous && audioElement) {
      audioElement.currentTime = previous.time;
      if (previous.wasPlaying) {
        audioElement.play().catch(() => {
          /* ignore resume failures */
        });
      }
    }
  }, [audioElement, stopMonitor]);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!enabled) {
      setStatus('error');
      setError('Enable recording controls first.');
      return;
    }
    if (!seekable || !audioElement) {
      setStatus('error');
      setError('Load an audio track before recording.');
      return;
    }
    if (!canvasRef.current) {
      setStatus('error');
      setError('Visualizer is not ready.');
      return;
    }
    if (!(safeEndTime > safeStartTime)) {
      setStatus('error');
      setError('End time must be greater than start time.');
      return;
    }

    const composite = ensureCompositeCanvas();
    if (!composite || !compositeContextRef.current) {
      setStatus('error');
      setError('Unable to prepare recording surface.');
      return;
    }

    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const stream = composite.captureStream(60);
    const audioStream = getAudioStream?.();
    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
    } else {
      setError('Audio stream unavailable; recording muted video.');
    }

    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack?.applyConstraints) {
      videoTrack.applyConstraints({
        frameRate: 60,
        width: composite.width,
        height: composite.height,
      }).catch(() => {});
    }

    const mimeType = chooseMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: Math.round(Math.max(qualityScale, 1) * 8_000_000),
        audioBitsPerSecond: 256_000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MediaRecorder is not supported in this browser.';
      setStatus('error');
      setError(message);
      return;
    }

    mediaRecorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      stopCopyLoop();
      stopMonitor();
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
      setFileSize(blob.size);
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('ready');
    };

    recorder.onerror = (event) => {
      stopCopyLoop();
      stopMonitor();
      setStatus('error');
      setError(`Recording error: ${event.error?.message ?? event.error?.name ?? 'unknown error'}`);
    };

    previousPlaybackRef.current = {
      time: audioElement.currentTime,
      wasPlaying: !audioElement.paused,
    };

    audioElement.pause();
    audioElement.currentTime = safeStartTime;
    await waitForSeek(audioElement);

    drawFrame();
    startCopyLoop();

    recorder.start();
    setStatus('recording');

    try {
      await audioElement.play();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Browser blocked playback.';
      setStatus('error');
      setError(`${message} Interact with the page and try again.`);
      recorder.stop();
      return;
    }

    const monitor = () => {
      if (!audioElement) return;
      if (audioElement.currentTime >= safeEndTime) {
        finalizeRecording();
        return;
      }
      stopMonitorRafRef.current = window.requestAnimationFrame(monitor);
    };
    monitor();
  }, [audioElement, canvasRef, drawFrame, enabled, ensureCompositeCanvas, finalizeRecording, getAudioStream, downloadUrl, safeEndTime, safeStartTime, seekable, startCopyLoop, stopCopyLoop, stopMonitor, qualityScale]);

  const handleGenerate = useCallback(() => {
    if (status === 'recording' || status === 'processing') return;
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setStatus('preparing');
    requestAnimationFrame(() => {
      startRecording();
    });
  }, [downloadUrl, startRecording, status]);

  const handleCancel = useCallback(() => {
    stopMonitor();
    stopCopyLoop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioElement) {
      audioElement.pause();
    }
    setStatus('idle');
    setError(null);
  }, [audioElement, stopCopyLoop, stopMonitor]);

  const handleDisable = useCallback((checked: boolean) => {
    setEnabled(checked);
    setStatus('idle');
    setError(null);
    if (!checked) {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
      }
    }
  }, [downloadUrl]);

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900/60 p-4 text-slate-200 shadow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">Video Recorder</p>
          <p className="text-xs text-slate-400">Capture the fluid canvas with audio as a WebM clip.</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleDisable(event.target.checked)}
          />
          Enable
        </label>
      </div>

      {!enabled ? (
        <p className="mt-3 text-xs text-slate-400">Toggle on to set start/end points and render a clip.</p>
      ) : (
        <div className="mt-4 space-y-4 text-xs">
          <div className="grid gap-3 md:grid-cols-3">
            <TimeField
              label="Start"
              value={safeStartTime}
              max={duration}
              onChange={(secs) => {
                setStartTime(secs);
                if (secs >= safeEndTime) {
                  setEndTime(Math.min(secs + 1, duration));
                }
              }}
              currentTime={currentTime}
              onSetCurrent={() => setStartTime(currentTime)}
            />
            <TimeField
              label="End"
              value={safeEndTime}
              max={duration}
              onChange={(secs) => setEndTime(Math.max(secs, safeStartTime + 0.2))}
              currentTime={currentTime}
              onSetCurrent={() => setEndTime(Math.max(currentTime, safeStartTime + 0.2))}
            />
            <div className="flex flex-col gap-2">
              <label className="text-slate-300">Quality</label>
              <select
                value={qualityScale}
                onChange={(event) => setQualityScale(Number(event.target.value) || 1)}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value={1}>Standard (1×)</option>
                <option value={1.5}>High (1.5×)</option>
                <option value={2}>Ultra (2×)</option>
              </select>
              <p className="text-[10px] text-slate-400">Higher values increase resolution and file size.</p>
              <p className="text-[10px] text-slate-500">Estimated output: {(renderWidth || '—')}×{(renderHeight || '—')} @ 60&nbsp;fps</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              className="rounded bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleGenerate}
              disabled={!seekable || status === 'recording' || status === 'processing'}
            >
              {status === 'recording' ? 'Recording…' : status === 'processing' ? 'Processing…' : 'Render Clip'}
            </button>
            {status === 'recording' ? (
              <button
                type="button"
                className="rounded border border-rose-400 px-3 py-2 font-semibold text-rose-200 transition hover:bg-rose-500/20"
                onClick={finalizeRecording}
              >
                Stop
              </button>
            ) : null}
            {status !== 'idle' && status !== 'ready' && status !== 'recording' && status !== 'processing' ? (
              <button
                type="button"
                className="rounded border border-slate-600 px-3 py-2 text-slate-200 transition hover:border-slate-400"
                onClick={handleCancel}
              >
                Reset
              </button>
            ) : null}
            <span className="text-slate-400">
              {status === 'ready' && downloadUrl
                ? 'Complete – download below.'
                : status === 'recording'
                ? `Recording… ends at ${formatTime(safeEndTime)}`
                : status === 'processing'
                ? 'Encoding…'
                : status === 'preparing'
                ? 'Preparing…'
                : null}
            </span>
          </div>

          {error ? <p className="text-xs text-rose-300">{error}</p> : null}

          {downloadUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <span>Clip ready: {formatTime(safeEndTime - safeStartTime)} duration</span>
              {fileSize ? <span>• {(fileSize / (1024 * 1024)).toFixed(2)} MB</span> : null}
              <a
                href={downloadUrl}
                download={`fluid-${Math.round(safeStartTime)}-${Math.round(safeEndTime)}.webm`}
                className="rounded bg-emerald-500 px-3 py-1 font-semibold text-slate-900 transition hover:bg-emerald-400"
              >
                Download WebM
              </a>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
};

interface TimeFieldProps {
  label: string;
  value: number;
  max: number;
  onChange: (seconds: number) => void;
  currentTime: number;
  onSetCurrent: () => void;
}

const TimeField: React.FC<TimeFieldProps> = ({ label, value, max, onChange, currentTime, onSetCurrent }) => {
  const [display, setDisplay] = useState(formatTime(value));

  useEffect(() => {
    setDisplay(formatTime(value));
  }, [value]);

  const handleBlur = () => {
    const parsed = parseTime(display);
    const clamped = clampRange(parsed, 0, max || parsed);
    onChange(clamped);
    setDisplay(formatTime(clamped));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-slate-300">
        <span>{label}</span>
        <button
          type="button"
          className="text-xs text-blue-300 underline underline-offset-2 hover:text-blue-200"
          onClick={() => {
            onSetCurrent();
          }}
        >
          Set to {formatTime(currentTime)}
        </button>
      </div>
      <input
        type="text"
        value={display}
        onChange={(event) => setDisplay(event.target.value)}
        onBlur={handleBlur}
        className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
        placeholder="mm:ss"
      />
    </div>
  );
};

const clampRange = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  if (max > min) {
    return Math.min(Math.max(value, min), max);
  }
  return Math.max(value, min);
};

const waitForSeek = (audio: HTMLAudioElement): Promise<void> =>
  new Promise((resolve) => {
    const handleSeeked = () => {
      audio.removeEventListener('seeked', handleSeeked);
      resolve();
    };
    audio.addEventListener('seeked', handleSeeked, { once: true });
  });

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
) => {
  const imageAspect = img.width / img.height;
  const canvasAspect = canvasWidth / canvasHeight;

  let renderWidth = canvasWidth;
  let renderHeight = canvasHeight;

  if (imageAspect > canvasAspect) {
    renderHeight = canvasHeight;
    renderWidth = imageAspect * renderHeight;
  } else {
    renderWidth = canvasWidth;
    renderHeight = renderWidth / imageAspect;
  }

  const offsetX = (canvasWidth - renderWidth) / 2;
  const offsetY = (canvasHeight - renderHeight) / 2;

  ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
};

const chooseMimeType = (): string => {
  const preferred = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const type of preferred) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
};

export default VideoRecorderPanel;
