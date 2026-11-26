import OverlayWrapper from '../../components/common/OverlayWrapper';
import BanPickDisplay from '../../components/lq/BanPickDisplay';
import { useLQOverlayState } from '../../hooks/useLQOverlayState';

/**
 * Màn hình Overlay 1920x1080 Full Ban/Pick cho Liên Quân Mobile:
 * - Đồng bộ mượt theo timerDeadline, hỗ trợ preview tướng trước khi khóa
 * - Nền & HUD đồng bộ theo bộ nhận diện FIT CUP Season 3
 */
export default function LQOverlay() {
  const {
    state,
    heroes,
    displaySeconds,
    effectiveBg,
    currentPhase,
    currentSlotIndex,
  } = useLQOverlayState('dark');

  const showAmbientDarkBg = effectiveBg === 'dark';

  return (
    <OverlayWrapper bgOverride={state.overlayBg}>
      <div className="w-full h-full flex flex-col justify-between relative overflow-hidden">
        {showAmbientDarkBg && (
          <div className="pointer-events-none absolute inset-0 bg-[#08060A]">
            <img
              src="/fitcup-s3-banner.jpg"
              alt=""
              className="w-full h-full object-cover opacity-[0.16] contrast-110"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 42%, rgba(10,8,14,0.68) 0%, rgba(7,5,9,0.95) 85%)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-56"
              style={{
                background:
                  'linear-gradient(0deg, rgba(255,77,26,0.14) 0%, transparent 100%)',
              }}
            />
            <div className="absolute inset-0 fc-tactical-hatch opacity-70" />
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#2B82FF] via-[#FFB800] to-[#FF343F]" />
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#2B82FF]/60 via-[#FF4D1A]/80 to-[#FF343F]/60" />
          </div>
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
            scoreA={state.scoreA}
            scoreB={state.scoreB}
            boLabel={state.boLabel}
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
