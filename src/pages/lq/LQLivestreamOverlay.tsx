import { useSearchParams } from 'react-router-dom';
import OverlayWrapper from '../../components/common/OverlayWrapper';
import LivestreamBanPickBar from '../../components/lq/LivestreamBanPickBar';
import { useLQOverlayState } from '../../hooks/useLQOverlayState';

/**
 * Overlay Livestream Bottom-Bar (/lq/overlay/stream):
 * - Mặc định nền trong suốt (?bg=transparent) để chèn đè lên camera/trận đấu trên OBS
 * - Chừa trống ~72% khung hình phía trên, đặt toàn bộ Ban/Pick/Score/VS ở mép dưới
 */
export default function LQLivestreamOverlay() {
  const [searchParams] = useSearchParams();
  const {
    state,
    heroes,
    displaySeconds,
    currentPhase,
    currentSlotIndex,
  } = useLQOverlayState('transparent');

  // Riêng Livestream Overlay luôn mặc định trong suốt nếu không truyền ?bg=dark/chroma
  const bgParam = searchParams.get('bg') as 'transparent' | 'chroma' | 'dark' | null;
  const resolvedBg = bgParam || 'transparent';

  return (
    <OverlayWrapper bgOverride={resolvedBg}>
      <div className="w-full h-full flex flex-col justify-end relative overflow-hidden">
        {resolvedBg === 'dark' && (
          <div className="pointer-events-none absolute inset-0 bg-[#08060A]">
            <img
              src="/fitcup-s3-banner.jpg"
              alt=""
              className="w-full h-full object-cover opacity-16"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08060A] via-[#08060A]/55 to-[#08060A]/85" />
          </div>
        )}

        <div className="relative z-10 w-full">
          <LivestreamBanPickBar
            bansA={state.bansA}
            bansB={state.bansB}
            picksA={state.picksA}
            picksB={state.picksB}
            heroes={heroes}
            selectedHeroId={state.selectedHeroId ?? null}
            teamA={state.teamA}
            teamB={state.teamB}
            scoreA={state.scoreA ?? 0}
            scoreB={state.scoreB ?? 0}
            boLabel={state.boLabel || 'BO1'}
            currentPhase={currentPhase}
            currentSlotIndex={currentSlotIndex}
            tournamentName={state.tournamentName}
            roundName={state.roundName}
            timerSeconds={displaySeconds}
            timerMax={state.timerMax || 30}
            timerEnabled={state.timerEnabled}
            isComplete={state.isComplete}
          />
        </div>
      </div>
    </OverlayWrapper>
  );
}
