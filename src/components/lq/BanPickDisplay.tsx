import { useMemo } from 'react';
import { motion } from 'framer-motion';
import HeroAvatar from './HeroAvatar';
import HudCorners from '../common/HudCorners';
import type { BPPhase, BPSlot, LQHero, TeamConfig, TeamSide } from '../../types';

interface BanPickDisplayProps {
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  heroes: LQHero[];
  selectedHeroId?: string | null;
  teamA: TeamConfig;
  teamB: TeamConfig;
  currentPhase: BPPhase | null;
  currentSlotIndex: number;
  tournamentName: string;
  roundName: string;
  timerSeconds: number;
  timerMax?: number;
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
  selectedHeroId = null,
  teamA,
  teamB,
  currentPhase,
  currentSlotIndex,
  tournamentName,
  roundName,
  timerSeconds,
  timerMax = 30,
  timerEnabled,
  isComplete,
  isOverlay = false,
}: BanPickDisplayProps) {
  const heroMap = useMemo(() => {
    const m = new Map<string, LQHero>();
    heroes.forEach((h) => m.set(h.id, h));
    return m;
  }, [heroes]);

  const previewHero = useMemo(
    () => (selectedHeroId ? heroMap.get(selectedHeroId) ?? null : null),
    [selectedHeroId, heroMap]
  );

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

        {/* Hàng Ban (thumbnail 6px radius, grayscale + X đỏ; hỗ trợ xem trước khi chưa khóa) */}
        <div className={`flex gap-2 ${isLeft ? 'justify-start' : 'justify-end'}`}>
          {bans.map((slot, idx) => {
            const hero = slot.heroId ? heroMap.get(slot.heroId) : null;
            const isActive =
              !isComplete &&
              currentPhase?.team === side &&
              currentPhase?.action === 'ban' &&
              currentSlotIndex === idx;
            const isPreview = !hero && isActive && Boolean(previewHero);

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
                      <HeroAvatar hero={hero} textSize="text-sm" eager />
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
                ) : isPreview && previewHero ? (
                  <div className="w-full h-full relative">
                    <div className="w-full h-full opacity-90">
                      <HeroAvatar hero={previewHero} textSize="text-sm" eager />
                    </div>
                    <div className="absolute inset-0 bg-[#FFB800]/15 ring-1 ring-inset ring-[#FFB800]/70" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[#FFB800] text-[9px] font-display font-bold text-center py-0.5 tracking-wider">
                      CHỌN
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/25">
                    <span className="text-[10px] font-display font-bold">BAN</span>
                    <span className="text-xs font-bold">{idx + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 5 Slot Pick dọc (8-10px radius -> 9px, active gold glow; hỗ trợ xem trước khi chưa khóa) */}
        <div className="flex flex-col gap-2.5 flex-1">
          {picks.map((slot, idx) => {
            const hero = slot.heroId ? heroMap.get(slot.heroId) : null;
            const isActive =
              !isComplete &&
              currentPhase?.team === side &&
              currentPhase?.action === 'pick' &&
              currentSlotIndex === idx;
            const isPreview = !hero && isActive && Boolean(previewHero);
            const displayHero = hero || (isPreview ? previewHero : null);

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
                  {hero ? (
                    <motion.div
                      key={hero.id}
                      initial={{ scale: 0.78, opacity: 0.4 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      className="w-full h-full relative"
                    >
                      <HeroAvatar
                        hero={hero}
                        textSize={isOverlay ? 'text-4xl' : 'text-xl'}
                        eager
                      />
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
                  ) : isPreview && previewHero ? (
                    <div className="w-full h-full relative">
                      <div className="w-full h-full opacity-90">
                        <HeroAvatar
                          hero={previewHero}
                          textSize={isOverlay ? 'text-4xl' : 'text-xl'}
                          eager
                        />
                      </div>
                      <div className="absolute inset-0 bg-[#FFB800]/12 ring-2 ring-inset ring-[#FFB800]/65" />
                      <div
                        className={`absolute bottom-0 inset-x-0 bg-black/75 text-[#FFB800] font-display font-bold text-center tracking-wider ${
                          isOverlay ? 'text-[11px] py-0.5' : 'text-[9px] py-[1px]'
                        }`}
                      >
                        CHƯA KHÓA
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 font-display font-bold text-lg">
                      {idx + 1}
                    </div>
                  )}
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
                    {displayHero
                      ? displayHero.name
                      : isActive
                      ? 'Đang chọn...'
                      : `Vị trí ${idx + 1}`}
                  </div>
                  {(slot.playerName || displayHero?.role || isPreview) && (
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
                      {isPreview ? (
                        <span className="text-amber-300/80 text-xs">
                          {slot.playerName ? '• ' : ''}
                          {displayHero?.role ? `Chờ khóa • ${displayHero.role}` : 'Chờ khóa'}
                        </span>
                      ) : displayHero?.role ? (
                        <span className="text-gray-400 text-xs">
                          {slot.playerName ? `• ${displayHero.role}` : displayHero.role}
                        </span>
                      ) : null}
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
          {timerEnabled && (() => {
            const isLow = timerSeconds <= 5 && !isComplete;
            const ringColor = isLow ? '#FF4057' : activeColor;
            const progress = isComplete
              ? 1
              : Math.max(0, Math.min(1, timerSeconds / Math.max(1, timerMax)));
            const radius = 46;
            const circumference = 2 * Math.PI * radius;
            const dashOffset = circumference * (1 - progress);

            return (
              <div
                className={`relative rounded-full flex flex-col items-center justify-center bg-[#0b1018]/92 ${
                  isOverlay ? 'w-44 h-44' : 'w-24 h-24'
                } ${isLow ? 'text-[#FF4057]' : 'text-white'}`}
                style={{
                  boxShadow: `0 0 24px ${
                    isLow ? 'rgba(255,64,87,0.35)' : `${activeColor}30`
                  }, inset 0 0 18px rgba(0,0,0,0.6)`,
                }}
              >
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-[stroke-dashoffset,stroke] duration-200 ease-linear"
                  />
                </svg>

                <span
                  className={`relative z-10 font-display font-bold tabular-nums leading-none ${
                    isOverlay ? 'text-7xl' : 'text-3xl'
                  }`}
                >
                  {isComplete ? '✓' : timerSeconds}
                </span>
                <span className="relative z-10 text-[11px] font-display uppercase tracking-[0.22em] text-gray-400 mt-1">
                  {isComplete ? 'HOÀN TẤT' : 'GIÂY'}
                </span>
              </div>
            );
          })()}

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
