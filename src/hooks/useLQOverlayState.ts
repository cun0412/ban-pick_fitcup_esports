import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBroadcast } from './useBroadcast';
import { fetchHeroOverrides } from '../lib/api';
import { buildMergedHeroes } from '../stores/lqStore';
import { useSettingsStore } from '../stores/settingsStore';
import { LQ_DEFAULT_PHASES } from '../data/defaults';
import type { BPPhase, BPSlot, LQHero, TeamConfig } from '../types';

export interface LQOverlayPayload {
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  phases: BPPhase[];
  currentPhaseIndex: number;
  selectedHeroId?: string | null;
  heroesVersion?: number;
  isComplete: boolean;
  heroes?: LQHero[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  scoreA?: number;
  scoreB?: number;
  boLabel?: string;
  tournamentName: string;
  roundName: string;
  timerSeconds: number;
  timerMax?: number;
  timerRunning?: boolean;
  timerDeadline?: number | null;
  timerEnabled: boolean;
  overlayBg?: 'transparent' | 'chroma' | 'dark';
}

function getDefaultOverlayState(): LQOverlayPayload {
  const settings = useSettingsStore.getState();
  return {
    bansA: Array.from({ length: 5 }, () => ({ heroId: null, playerName: '' })),
    bansB: Array.from({ length: 5 }, () => ({ heroId: null, playerName: '' })),
    picksA: Array.from({ length: 5 }, () => ({ heroId: null, playerName: '' })),
    picksB: Array.from({ length: 5 }, () => ({ heroId: null, playerName: '' })),
    phases: LQ_DEFAULT_PHASES,
    currentPhaseIndex: 0,
    selectedHeroId: null,
    heroesVersion: 0,
    isComplete: false,
    teamA: settings.teamA,
    teamB: settings.teamB,
    scoreA: 0,
    scoreB: 0,
    boLabel: 'BO1',
    tournamentName: settings.tournamentName,
    roundName: settings.roundName,
    timerSeconds: 30,
    timerMax: 30,
    timerRunning: false,
    timerDeadline: null,
    timerEnabled: settings.timerEnabled,
    overlayBg: settings.overlayBg,
  };
}

/**
 * Hook đồng bộ chung cho cả Overlay Ban/Pick full-screen (/lq/overlay)
 * và Overlay Livestream thanh dưới (/lq/overlay/stream).
 */
export function useLQOverlayState(defaultBgFallback: 'transparent' | 'dark' = 'dark') {
  const [searchParams] = useSearchParams();
  const { send, subscribe } = useBroadcast('lq-channel', { remoteListen: true });
  const [state, setState] = useState<LQOverlayPayload>(getDefaultOverlayState);
  const [heroes, setHeroes] = useState<LQHero[]>(() => buildMergedHeroes());
  const [displaySeconds, setDisplaySeconds] = useState<number>(30);
  const lastHeroesVersionRef = useRef<number>(0);

  const bgParam = searchParams.get('bg') as 'transparent' | 'chroma' | 'dark' | null;
  const effectiveBg = bgParam || state.overlayBg || defaultBgFallback;

  // Tải override tướng từ Backend một lần khi mở Overlay
  useEffect(() => {
    let active = true;
    fetchHeroOverrides().then((ov) => {
      if (active) setHeroes(buildMergedHeroes(ov));
    });
    return () => {
      active = false;
    };
  }, []);

  // Preload ảnh tướng âm thầm để bấm chọn là hiện ngay không trễ tải ảnh
  useEffect(() => {
    let cancelled = false;
    const urls = heroes.map((h) => h.image).filter(Boolean);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      urls.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [heroes]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'lq-sync' && msg.payload) {
        const next = msg.payload as LQOverlayPayload;
        setState(next);
        if (Array.isArray(next.heroes) && next.heroes.length > 0) {
          setHeroes(next.heroes);
        } else if (
          next.heroesVersion &&
          next.heroesVersion !== lastHeroesVersionRef.current
        ) {
          lastHeroesVersionRef.current = next.heroesVersion;
          fetchHeroOverrides().then((ov) => setHeroes(buildMergedHeroes(ov)));
        }
      }
    });
    send('request-sync', {});
    return unsub;
  }, [subscribe, send]);

  // Tính số giây còn lại mượt theo timerDeadline
  useEffect(() => {
    if (!state.timerRunning || !state.timerDeadline || state.isComplete) {
      setDisplaySeconds(state.timerSeconds ?? 0);
      return;
    }

    const update = () => {
      const remain = Math.max(
        0,
        Math.ceil(((state.timerDeadline ?? 0) - Date.now()) / 1000)
      );
      setDisplaySeconds(remain);
    };

    update();
    const id = window.setInterval(update, 100);
    return () => clearInterval(id);
  }, [state.timerRunning, state.timerDeadline, state.timerSeconds, state.isComplete]);

  const currentPhase =
    !state.isComplete && state.currentPhaseIndex < state.phases.length
      ? state.phases[state.currentPhaseIndex]
      : null;

  let currentSlotIndex = -1;
  if (currentPhase) {
    currentSlotIndex = 0;
    for (let i = 0; i < state.currentPhaseIndex; i++) {
      if (
        state.phases[i].action === currentPhase.action &&
        state.phases[i].team === currentPhase.team
      ) {
        currentSlotIndex++;
      }
    }
  }

  return {
    state,
    heroes,
    displaySeconds,
    effectiveBg,
    currentPhase,
    currentSlotIndex,
  };
}
