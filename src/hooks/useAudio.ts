import { useCallback, useRef } from 'react';

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const playTick = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = 'square';
      gain.gain.value = 0.1;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }, [getCtx]);

  const playBan = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 150; osc.type = 'sawtooth';
      gain.gain.value = 0.3;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [getCtx]);

  const playPick = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1200; osc.type = 'sine';
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, [getCtx]);

  const playFanfare = useCallback(() => {
    try {
      const ctx = getCtx();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1 * i + 0.5);
        osc.start(ctx.currentTime + 0.1 * i);
        osc.stop(ctx.currentTime + 0.1 * i + 0.5);
      });
    } catch {}
  }, [getCtx]);

  const playWarning = useCallback(() => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 440; osc.type = 'triangle';
      gain.gain.value = 0.3;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, [getCtx]);

  return { playTick, playBan, playPick, playFanfare, playWarning };
}
