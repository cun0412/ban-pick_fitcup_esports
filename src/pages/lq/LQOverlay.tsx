import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import OverlayWrapper from '../../components/common/OverlayWrapper';
import BanPickDisplay from '../../components/lq/BanPickDisplay';
import { useBroadcast } from '../../hooks/useBroadcast';
import { fetchHeroOverrides } from '../../lib/api';
import { buildMergedHeroes } from '../../stores/lqStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { LQ_DEFAULT_PHASES } from '../../data/defaults';
import type { BPPhase, BPSlot, LQHero, TeamConfig } from '../../types';

interface LQOverlayPayload {
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
 * Màn hình Overlay 1920x1080 cho Liên Quân Mobile:
 * - Đồng hồ tự đếm mượt theo timerDeadline
 * - Tướng được nạp sẵn cục bộ + override từ /api/heroes (không nhồi 130 tướng vào payload sync)
 * - Hỗ trợ hiển thị tướng đang chọn (preview) ngay trong box trước khi khóa
 */
export default function LQOverlay() {
  const [searchParams] = useSearchParams();
  const { send, subscribe } = useBroadcast('lq-channel', { remoteListen: true });
  const [state, setState] = useState<LQOverlayPayload>(getDefaultOverlayState);
  const [heroes, setHeroes] = useState<LQHero[]>(() => buildMergedHeroes());
  const [displaySeconds, setDisplaySeconds] = useState<number>(30);
  const lastHeroesVersionRef = useRef<number>(0);

  const bgParam = searchParams.get('bg') as 'transparent' | 'chroma' | 'dark' | null;
  const effectiveBg = bgParam || state.overlayBg || 'dark';
  const showAmbientDarkBg = effectiveBg === 'dark';

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

  // Preload ảnh tướng âm thầm sau khi mở Overlay để bấm chọn hiện ngay không trễ tải ảnh
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

  // Tính số giây còn lại trực tiếp trên Overlay dựa vào timerDeadline (không bị giật lag khi sync)
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

  return (
    <OverlayWrapper bgOverride={state.overlayBg}>
      <div className="w-full h-full flex flex-col justify-between relative overflow-hidden">
        {showAmbientDarkBg && (
          <>
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
              }}
            />
            <div className="pointer-events-none absolute -top-28 -left-28 w-[480px] h-[480px] rounded-full bg-[#3185FF]/15 blur-[135px]" />
            <div className="pointer-events-none absolute -top-28 -right-28 w-[480px] h-[480px] rounded-full bg-[#FF343F]/15 blur-[135px]" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[780px] h-[200px] rounded-full bg-[#FFB800]/10 blur-[120px]" />
          </>
        )}

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <BanPickDisplay
            bansA={state.bansA}
            bansB={state.bansB}
            picksA={state.picksA}
            picksB={state.picksB}
            heroes={heroes}
            selectedHeroId={state.selectedHeroId ?? null}
            teamA={state.teamA}
            teamB={state.teamB}
            currentPhase={currentPhase}
            currentSlotIndex={currentSlotIndex}
            tournamentName={state.tournamentName}
            roundName={state.roundName}
            timerSeconds={displaySeconds}
            timerMax={state.timerMax || 30}
            timerEnabled={state.timerEnabled}
            isComplete={state.isComplete}
            isOverlay={true}
          />
        </div>
      </div>
    </OverlayWrapper>
  );
}
