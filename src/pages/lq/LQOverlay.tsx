import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import OverlayWrapper from '../../components/common/OverlayWrapper';
import BanPickDisplay from '../../components/lq/BanPickDisplay';
import { useBroadcast } from '../../hooks/useBroadcast';
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
  isComplete: boolean;
  heroes: LQHero[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  tournamentName: string;
  roundName: string;
  timerSeconds: number;
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
    isComplete: false,
    heroes: buildMergedHeroes(),
    teamA: settings.teamA,
    teamB: settings.teamB,
    tournamentName: settings.tournamentName,
    roundName: settings.roundName,
    timerSeconds: 30,
    timerEnabled: settings.timerEnabled,
    overlayBg: settings.overlayBg,
  };
}

/**
 * Màn hình Overlay 1920x1080 cho Liên Quân Mobile (đồng bộ qua BroadcastChannel & Backend /api/live)
 */
export default function LQOverlay() {
  const [searchParams] = useSearchParams();
  const { send, subscribe } = useBroadcast('lq-channel', { remoteListen: true });
  const [state, setState] = useState<LQOverlayPayload>(getDefaultOverlayState);

  const bgParam = searchParams.get('bg') as 'transparent' | 'chroma' | 'dark' | null;
  const effectiveBg = bgParam || state.overlayBg || 'dark';
  const showAmbientDarkBg = effectiveBg === 'dark';

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'lq-sync' && msg.payload) {
        setState(msg.payload as LQOverlayPayload);
      }
    });
    send('request-sync', {});
    return unsub;
  }, [subscribe, send]);

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
            heroes={state.heroes}
            teamA={state.teamA}
            teamB={state.teamB}
            currentPhase={currentPhase}
            currentSlotIndex={currentSlotIndex}
            tournamentName={state.tournamentName}
            roundName={state.roundName}
            timerSeconds={state.timerSeconds}
            timerEnabled={state.timerEnabled}
            isComplete={state.isComplete}
            isOverlay={true}
          />
        </div>
      </div>
    </OverlayWrapper>
  );
}
