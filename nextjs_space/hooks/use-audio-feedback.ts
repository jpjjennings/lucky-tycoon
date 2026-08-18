'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SoundName = 'dice' | 'coin' | 'charm' | 'event' | 'victory' | 'warning';

const STORAGE_KEY = 'lucky-tycoon-audio';

const SOUND_NOTES: Record<SoundName, number[]> = {
  dice: [220, 277],
  coin: [523, 659, 784],
  charm: [392, 523, 659, 784],
  event: [330, 262],
  victory: [523, 659, 784, 1047],
  warning: [180, 140],
};

interface AudioSettings {
  muted: boolean;
  volume: number;
  musicEnabled: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = { muted: false, volume: 0.35, musicEnabled: false };

function readSettings(): AudioSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      muted: stored.muted === true,
      volume: typeof stored.volume === 'number' ? Math.min(1, Math.max(0, stored.volume)) : DEFAULT_SETTINGS.volume,
      musicEnabled: stored.musicEnabled === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useAudioFeedback() {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);
  const musicContext = useRef<AudioContext | null>(null);
  const musicTimer = useRef<number | null>(null);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const play = useCallback((name: SoundName) => {
    if (settings.muted || settings.volume <= 0 || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const now = context.currentTime;
    SOUND_NOTES[name].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.07;
      oscillator.type = name === 'warning' ? 'sawtooth' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(settings.volume * 0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
    window.setTimeout(() => void context.close(), 500);
  }, [settings.muted, settings.volume]);

  const setVolume = useCallback((volume: number) => {
    setSettings((current) => ({ ...current, volume: Math.min(1, Math.max(0, volume)) }));
  }, []);

  const toggleMuted = useCallback(() => {
    setSettings((current) => ({ ...current, muted: !current.muted }));
  }, []);

  const stopMusic = useCallback(() => {
    if (musicTimer.current !== null) {
      window.clearInterval(musicTimer.current);
      musicTimer.current = null;
    }
    if (musicContext.current) {
      void musicContext.current.close();
      musicContext.current = null;
    }
  }, []);

  const startMusic = useCallback(() => {
    if (typeof window === 'undefined' || musicContext.current || !window.AudioContext) return;
    const context = new window.AudioContext();
    musicContext.current = context;
    const playChord = () => {
      const start = context.currentTime;
      [110, 138.59, 164.81].forEach((frequency) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(settings.volume * 0.025, start + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 1.8);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 1.9);
      });
    };
    void context.resume();
    playChord();
    musicTimer.current = window.setInterval(playChord, 2000);
  }, [settings.volume]);

  useEffect(() => {
    if (settings.musicEnabled && !settings.muted && settings.volume > 0) startMusic();
    else stopMusic();
    return stopMusic;
  }, [settings.musicEnabled, settings.muted, settings.volume, startMusic, stopMusic]);

  useEffect(() => () => stopMusic(), [stopMusic]);

  const toggleMusic = useCallback(() => {
    setSettings((current) => ({ ...current, musicEnabled: !current.musicEnabled }));
  }, []);

  return { ...settings, play, setVolume, toggleMuted, toggleMusic };
}
