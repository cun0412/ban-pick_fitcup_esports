import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroAvatar from './HeroAvatar';
import HudCorners from '../common/HudCorners';
import type { BPPhase, BPSlot, LQHero, TeamConfig, TeamSide } from '../../types';

interface BanPickDisplayProps {
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  heroes: LQHero[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  currentPhase: BPPhase | null;
  currentSlotIndex: number;
  tournamentName: string;
  roundName: string;
  timerSeconds: number;
  timerEnabled: boolean;
  isComplete: boolean;
  isOverlay?: boolean;
}

/**
 * Giao diện Ban/Pick 2 cột trái/phải chuẩn livestream Broadcast HUD cho Liên Quân Mobile
 */
export default function BanPickDisplay({
  bansA,
  bansB,
  picksA,
  picksB,
  heroes,
  teamA,
  teamB,
  currentPhase,
  currentSlotIndex,
  tournamentName,
  roundName,
  timerSeconds,
  timerEnabled,
  isComplete,
  isOverlay = false,
}: BanPickDisplayProps) {
  const heroMap = useMemo(() => {
    const m = new Map<string, LQHero>();
    heroes.forEach((h) => m.set(h.id, h));
    return m;
  }, [heroes]);

  const renderTeamColumn = (
    side: TeamSide,
    team: TeamConfig,
    bans: BPSlot[],
    picks: BPSlot[]
  ) => {
    const isLeft = side === 'A';
    const isTeamTurn = currentPhase?.team === side && !isComplete;
    const hudTeamColor = isLeft ? '#3185FF' : '#FF343F';

    return (
      <div className="flex-1 flex flex-col gap-3">
        {/* Header tên đội + logo: 7px radius, Team A xanh cạnh trái / Team B đỏ cạnh phải */}
        <div
          className={`flex items-center gap-3.5 px-4 py-2.5 rounded-[7px] bg-[#0b1018]/92 transition-all relative ${
            isLeft ? 'flex-row hud-team-blue' : 'flex-row-reverse text-right hud-team-red'
          } ${isTeamTurn ? 'hud-subtle-pulse' : ''}`}
        >
          <div
            className="w-14 h-14 rounded-[6px] bg-black/60 border flex items-center justify-center overflow-hidden shrink-0"
            style={{ borderColor: `${hudTeamColor}70` }}
          >
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="font-display font-black text-xl" style={{ color: hudTeamColor }}>
                {team.name.slice(0, 2).toUpperCase() || side}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className={`font-display font-black tracking-wider truncate text-white ${
                isOverlay ? 'text-3xl' : 'text-lg'
              }`}
            >
              {team.name}
            </h2>
            <p
              className="text-xs uppercase tracking-[0.2em] font-display font-bold"
              style={{ color: isTeamTurn ? '#FFB800' : hudTeamColor }}
            >
              {isTeamTurn
                ? currentPhase?.action === 'ban'
                  ? '● ĐANG CẤM TƯỚNG'
                  : '● ĐANG CHỌN TƯỚNG'
                : `TEAM ${side}`}
            </p>
          </div>
        </div>

        {/* Hàng Ban (thumbnail 6px radius, grayscale + X đỏ) */}
        <div className={`flex gap-2 ${isLeft ? 'justify-start' : 'justify-end'}`}>
          {bans.map((slot, idx) => {
            const hero = slot.heroId ? heroMap.get(slot.heroId) : null;
            const isActive =
              !isComplete &&
              currentPhase?.team === side &&
              currentPhase?.action === 'ban' &&
              currentSlotIndex === idx;

            return (
              <div
                key={`ban-${side}-${idx}`}
                className={`relative rounded-[6px] overflow-hidden transition-all ${
                  isOverlay ? 'w-20 h-20' : 'w-12 h-12'
                } ${
                  isActive
                    ? 'hud-neon-gold hud-subtle-pulse bg-[#FFB800]/10'
                    : hero
                    ? 'border border-[#FF343F]/60 bg-[#0b1018]/90'
                    : 'border border-white/10 bg-[#0b1018]/75'
                }`}
              >
                <AnimatePresence mode="wait">
                  {hero ? (
                    <motion.div
                      key={hero.id}
                      initial={{ scale: 1.2, x: -5 }}
                      animate={{
                        scale: 1,
                        x: [0, -5, 5, -3, 3, 0],
                      }}
                      transition={{ duration: 0.42 }}
                      className="w-full h-full relative"
                    >
                      <div className="w-full h-full ban-grayscale">
                        <HeroAvatar hero={hero} textSize="text-sm" />
                      </div>
                      <motion.div
                        initial={{ opacity: 0.85 }}
                        animate={{ opacity: 0.35 }}
                        transition={{ duration: 0.55 }}
                        className="absolute inset-0 bg-[#FF343F]/45"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className={`text-[#FF343F] font-display font-black drop-shadow-[0_0_8px_rgba(255,52,63,0.9)] ${
                            isOverlay ? 'text-4xl' : 'text-2xl'
                          }`}
                        >
                          ✕
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/25">
                      <span className="text-[10px] font-display font-bold">BAN</span>
                      <span className="text-xs font-bold">{idx + 1}</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* 5 Slot Pick dọc (8-10px radius -> 9px, active gold glow) */}
        <div className="flex flex-col gap-2.5 flex-1">
          {picks.map((slot, idx) => {
            const hero = slot.heroId ? heroMap.get(slot.heroId) : null;
            const isActive =
              !isComplete &&
              currentPhase?.team === side &&
              currentPhase?.action === 'pick' &&
              currentSlotIndex === idx;

            return (
              <div
                key={`pick-${side}-${idx}`}
                className={`relative rounded-[9px] overflow-hidden transition-all flex items-center ${
                  isOverlay ? 'h-[134px]' : 'h-16'
                } ${isLeft ? 'flex-row' : 'flex-row-reverse'} ${
                  isActive
                    ? 'hud-neon-gold hud-subtle-pulse bg-[#0b1018]/95'
                    : hero
                    ? isLeft
                      ? 'hud-team-blue bg-[#0b1018]/92'
                      : 'hud-team-red bg-[#0b1018]/92'
                    : 'border border-white/10 bg-[#0b1018]/80'
                }`}
              >
                {/* Ảnh tướng */}
                <div
                  className={`h-full aspect-square shrink-0 overflow-hidden bg-slate-900/90 relative ${
                    isOverlay ? 'w-[134px]' : 'w-16'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {hero ? (
                      <motion.div
                        key={hero.id}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                        className="w-full h-full relative"
                      >
                        <HeroAvatar hero={hero} textSize={isOverlay ? 'text-4xl' : 'text-xl'} />
                        <motion.div
                          initial={{ opacity: 0.7 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.65 }}
                          className="absolute inset-0"
                          style={{
                            boxShadow: `inset 0 0 36px ${hudTeamColor}`,
                            backgroundColor: `${hudTeamColor}35`,
                          }}
                        />
                      </motion.div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 font-display font-bold text-lg">
                        {idx + 1}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tên tướng + tên người chơi */}
                <div
                  className={`flex-1 px-4 flex flex-col justify-center min-w-0 ${
                    isLeft ? 'text-left' : 'text-right'
                  }`}
                >
                  <div
                    className={`font-display font-bold truncate ${
                      isOverlay ? 'text-2xl' : 'text-sm'
                    } ${hero ? 'text-white' : isActive ? 'text-[#FFB800]' : 'text-gray-500'}`}
                  >
                    {hero ? hero.name : isActive ? 'Đang chọn...' : `Vị trí ${idx + 1}`}
                  </div>
                  {(slot.playerName || hero?.role) && (
                    <div
                      className={`flex items-center gap-2 truncate ${
                        isLeft ? 'justify-start' : 'justify-end'
                      } ${isOverlay ? 'text-base mt-1' : 'text-xs'}`}
                    >
                      {slot.playerName && (
                        <span className="text-[#FFB800] font-semibold truncate">
                          {slot.playerName}
                        </span>
                      )}
                      {hero?.role && (
                        <span className="text-gray-400 text-xs">
                          {slot.playerName ? `• ${hero.role}` : hero.role}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const activeColor =
    currentPhase?.team === 'A'
      ? '#3185FF'
      : currentPhase?.team === 'B'
      ? '#FF343F'
      : '#FFB800';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header giải đấu (11px radius + viền neon mảnh) */}
      {isOverlay && (
        <div className="flex items-center justify-between px-10 pt-6 pb-1">
          <div className="px-6 py-2.5 rounded-[10px] bg-[#0b1018]/92 hud-neon-gold relative">
            <HudCorners color="#FFB800" size={9} offset={4} />
            <span className="font-display font-black text-2xl tracking-wider text-white uppercase">
              {tournamentName}
            </span>
          </div>
          <div className="px-6 py-2.5 rounded-[10px] bg-[#0b1018]/92 border border-[#3185FF]/50 shadow-[0_0_20px_rgba(49,133,255,0.2)] relative">
            <HudCorners color="#3185FF" size={9} offset={4} />
            <span className="font-display font-bold text-xl tracking-[0.2em] text-[#FFB800] uppercase">
              {roundName}
            </span>
          </div>
        </div>
      )}

      {/* Bố cục chính: Cột A - Trung tâm - Cột B */}
      <div className={`flex items-stretch gap-5 ${isOverlay ? 'px-10 pb-8' : ''}`}>
        {renderTeamColumn('A', teamA, bansA, picksA)}

        {/* Cột trung tâm: Đồng hồ & Lượt hiện tại */}
        <div
          className={`flex flex-col items-center justify-center shrink-0 ${
            isOverlay ? 'w-72 gap-6' : 'w-40 gap-3'
          }`}
        >
          {timerEnabled && (
            <div
              className={`rounded-full flex flex-col items-center justify-center border-2 transition-colors bg-[#0b1018]/92 ${
                isOverlay ? 'w-44 h-44' : 'w-24 h-24'
              } ${
                timerSeconds <= 5 && !isComplete
                  ? 'hud-neon-red text-[#FF4057]'
                  : 'text-white'
              }`}
              style={{
                borderColor:
                  timerSeconds <= 5 && !isComplete ? '#FF4057' : activeColor,
                boxShadow: `0 0 24px ${
                  timerSeconds <= 5 && !isComplete ? 'rgba(255,64,87,0.35)' : `${activeColor}35`
                }, inset 0 0 18px rgba(0,0,0,0.6)`,
              }}
            >
              <span
                className={`font-display font-black leading-none ${
                  isOverlay ? 'text-7xl' : 'text-3xl'
                }`}
              >
                {isComplete ? '✓' : timerSeconds}
              </span>
              <span className="text-[11px] font-display uppercase tracking-[0.22em] text-gray-400 mt-1">
                {isComplete ? 'HOÀN TẤT' : 'GIÂY'}
              </span>
            </div>
          )}

          {/* Chỉ báo lượt: 11px radius + HudCorners */}
          <div
            className={`w-full rounded-[11px] p-4 bg-[#0b1018]/92 text-center relative ${
              isComplete ? 'hud-neon-gold' : 'border border-white/15'
            }`}
            style={
              !isComplete
                ? {
                    borderColor: `${activeColor}85`,
                    boxShadow: `0 0 22px ${activeColor}22`,
                  }
                : undefined
            }
          >
            <HudCorners color={isComplete ? '#FFB800' : activeColor} size={10} offset={5} />
            {isComplete ? (
              <>
                <div
                  className={`font-display font-black text-[#FFB800] ${
                    isOverlay ? 'text-2xl' : 'text-sm'
                  }`}
                >
                  ĐỘI HÌNH HOÀN TẤT
                </div>
                <p className="text-xs text-gray-300 mt-1">Sẵn sàng vào trận!</p>
              </>
            ) : currentPhase ? (
              <>
                <div className="text-[11px] font-display uppercase tracking-[0.22em] text-gray-400">
                  Lượt hiện tại
                </div>
                <div
                  className={`font-display font-black mt-1 truncate ${
                    isOverlay ? 'text-2xl' : 'text-sm'
                  }`}
                  style={{ color: activeColor }}
                >
                  {currentPhase.team === 'A' ? teamA.name : teamB.name}
                </div>
                <div
                  className={`mt-2.5 inline-block px-3 py-1 rounded-[4px] font-display font-bold tracking-wider ${
                    isOverlay ? 'text-base' : 'text-xs'
                  } ${
                    currentPhase.action === 'ban'
                      ? 'bg-[#FF343F]/20 text-[#FF4057] border border-[#FF343F]/50'
                      : 'bg-[#3185FF]/20 text-blue-300 border border-[#3185FF]/50'
                  }`}
                >
                  {currentPhase.action === 'ban' ? 'CẤM TƯỚNG' : 'CHỌN TƯỚNG'}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {renderTeamColumn('B', teamB, bansB, picksB)}
      </div>
    </div>
  );
}
