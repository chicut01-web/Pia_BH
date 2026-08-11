"use client";

import { useCallback, useEffect, useState } from "react";

class SoundFX {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  playCoin() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  playScratch() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400 + Math.random() * 600, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
    } catch {}
  }

  playTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(450 + Math.random() * 100, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }

  playReelStop() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.09);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  playWin(amount: number = 2) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes =
        amount >= 8
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
          : amount >= 4
          ? [523.25, 659.25, 783.99, 1046.5]
          : [523.25, 659.25, 783.99];

      const stepTime = 0.09;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * stepTime);
        gain.gain.setValueAtTime(0.2, now + idx * stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * stepTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * stepTime);
        osc.stop(now + idx * stepTime + 0.35);
      });

      if (amount >= 5) {
        setTimeout(() => {
          if (!this.ctx) return;
          const now2 = this.ctx.currentTime;
          [1046.5, 1318.51, 1567.98, 2093.0].forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now2 + idx * 0.07);
            gain.gain.setValueAtTime(0.16, now2 + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now2 + idx * 0.07 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now2 + idx * 0.07);
            osc.stop(now2 + idx * 0.07 + 0.4);
          });
        }, 320);
      }
    } catch {}
  }

  playRigioca() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.16, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {}
  }

  playLoss() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(392, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(293.66, now + 0.16);
      gain2.gain.setValueAtTime(0.07, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16 + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.16 + 0.28);
    } catch {}
  }
}

export const soundEngine = new SoundFX();

export function useAudio() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("piuccia_muted") === "true";
    }
    return false;
  });

  useEffect(() => {
    soundEngine.muted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("piuccia_muted", String(muted));
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const playClick = useCallback(() => soundEngine.playClick(), []);
  const playCoin = useCallback(() => soundEngine.playCoin(), []);
  const playScratch = useCallback(() => soundEngine.playScratch(), []);
  const playTick = useCallback(() => soundEngine.playTick(), []);
  const playReelStop = useCallback(() => soundEngine.playReelStop(), []);
  const playWin = useCallback((amount?: number) => soundEngine.playWin(amount), []);
  const playRigioca = useCallback(() => soundEngine.playRigioca(), []);
  const playLoss = useCallback(() => soundEngine.playLoss(), []);

  return {
    muted,
    toggleMute,
    playClick,
    playCoin,
    playScratch,
    playTick,
    playReelStop,
    playWin,
    playRigioca,
    playLoss,
  };
}
