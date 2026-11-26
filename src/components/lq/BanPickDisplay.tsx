import { useMemo } from 'react';
import { motion } from 'framer-motion';
import HeroAvatar from './HeroAvatar';
import HeroRoleBadge from './HeroRoleBadge';
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
  scoreA?: number;
  scoreB?: number;
  boLabel?: string;
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
 * Giao diện Ban/Pick 2 cột chuẩn Esports Broadcast HUD — FIT CUP Season 3
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
  scoreA,
  scoreB,
  boLabel,
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
    const hudTeamColor = isLeft ? '#2B82FF' : '#FF343F';
    const sideScore = isLeft ? scoreA : scoreB;

    return (
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Header tên đội + logo: khung vát cạnh carbon + thanh neon cạnh bên */}
        <div
          className={`flex items-center gap-3.5 px-4 py-2.5 fc-carbon-surface transition-all relative ${
            isOverlay ? 'fc-chamfer-sm' : 'rounded-xl'
          } ${isLeft ? 'flex-row hud-team-blue' : 'flex-row-reverse text-right hud-team-red'} ${
            isTeamTurn ? 'hud-subtle-pulse' : ''
          }`}
        >
          <div
            className="w-14 h-14 bg-black/75 border flex items-center justify-center overflow-hidden shrink-0 fc-chamfer-sm"
            style={{ borderColor: `${hudTeamColor}80` }}
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
              className="text-xs uppercase tracking-[0.22em] font-display font-bold flex items-center gap-1.5"
              style={{
                color: isTeamTurn ? '#FFB800' : hudTeamColor,
                justifyContent: isLeft ? 'flex-start' : 'flex-end',
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rotate-45"
                style={{ backgroundColor: isTeamTurn ? '#FFB800' : hudTeamColor }}
              />
              {isTeamTurn
                ? currentPhase?.action === 'ban'
                  ? 'ĐANG CẤM TƯỚNG'
                  : 'ĐANG CHỌN TƯỚNG'
                : `TEAM ${side}`}
            </p>
          </div>
          {isOverlay && typeof sideScore === 'number' && (
            <div
              className="px-3.5 py-1 bg-black/65 border text-white font-display font-black text-3xl tabular-nums shrink-0"
              style={{
                borderColor: `${hudTeamColor}65`,
                boxShadow: `0 0 12px ${hudTeamColor}25`,
              }}
            >
              {sideScore}
            </div>
          )}
        </div>

        {/* Hàng Ban (khung vát góc sắc nét, grayscale + gạch chéo neon đỏ) */}
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
                className={`relative overflow-hidden transition-all fc-carbon-surface ${
                  isOverlay ? 'w-20 h-20 fc-chamfer-sm' : 'w-12 h-12 rounded-md'
                } ${
                  isActive
                    ? 'hud-neon-gold hud-subtle-pulse'
                    : hero
                    ? 'border border-[#FF343F]/75 shadow-[0_0_12px_rgba(255,52,63,0.22)]'
                    : 'border border-white/12'
                }`}
              >
                {hero ? (
                  <motion.div
                    key={hero.id}
                    initial={{ scale: 1.18, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35 }}
                    className="w-full h-full relative"
                  >
                    <div className="w-full h-full ban-grayscale">
                      <HeroAvatar hero={hero} textSize="text-sm" eager />
                    </div>
                    <div className="absolute inset-0 bg-[#FF2E3B]/30" />
                    <svg
                      viewBox="0 0 64 64"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <line
                        x1="12"
                        y1="52"
                        x2="52"
                        y2="12"
                        stroke="#FF343F"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.div>
                ) : isPreview && previewHero ? (
                  <div className="w-full h-full relative">
                    <div className="w-full h-full opacity-90">
                      <HeroAvatar hero={previewHero} textSize="text-sm" eager />
                    </div>
                    <div className="absolute inset-0 bg-[#FFB800]/15 ring-1 ring-inset ring-[#FFB800]/85" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/85 text-[#FFB800] text-[9px] font-display font-bold text-center py-0.5 tracking-wider">
                      CHỌN
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/25 fc-tactical-hatch">
                    <span className="text-[10px] font-display font-bold">BAN</span>
                    <span className="text-xs font-bold">{idx + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 5 Slot Pick dọc: khung vát góc chuẩn giải đấu + viền neon đội + SVG role */}
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
                className={`relative overflow-hidden transition-all flex items-center fc-carbon-surface ${
                  isOverlay ? 'h-[126px] fc-chamfer-sm' : 'h-16 rounded-xl'
                } ${isLeft ? 'flex-row' : 'flex-row-reverse'} ${
                  isActive
                    ? 'hud-neon-gold hud-subtle-pulse'
                    : hero
                    ? isLeft
                      ? 'hud-team-blue'
                      : 'hud-team-red'
                    : 'border border-white/12'
                }`}
              >
                {/* Ảnh tướng */}
                <div
                  className={`h-full aspect-square shrink-0 overflow-hidden bg-[#120e16] relative ${
                    isOverlay ? 'w-[126px]' : 'w-16'
                  }`}
                >
                  {hero ? (
                    <motion.div
                      key={hero.id}
                      initial={{ scale: 0.85, opacity: 0.45 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                      className="w-full h-full relative"
                    >
                      <HeroAvatar
                        hero={hero}
                        textSize={isOverlay ? 'text-4xl' : 'text-xl'}
                        eager
                      />
                      <motion.div
                        initial={{ opacity: 0.65 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.55 }}
                        className="absolute inset-0"
                        style={{
                          boxShadow: `inset 0 0 32px ${hudTeamColor}`,
                          backgroundColor: `${hudTeamColor}30`,
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
                      <div className="absolute inset-0 bg-[#FFB800]/12 ring-2 ring-inset ring-[#FFB800]/75" />
                      <div
                        className={`absolute bottom-0 inset-x-0 bg-black/85 text-[#FFB800] font-display font-bold text-center tracking-wider ${
                          isOverlay ? 'text-[11px] py-0.5' : 'text-[9px] py-[1px]'
                        }`}
                      >
                        CHƯA KHÓA
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 font-display font-bold text-lg fc-tactical-hatch">
                      {idx + 1}
                    </div>
                  )}

                  {isOverlay && displayHero && (
                    <div className={`absolute top-1.5 z-10 ${isLeft ? 'left-1.5' : 'right-1.5'}`}>
                      <HeroRoleBadge
                        role={displayHero.role}
                        accentColor={hudTeamColor}
                        size={24}
                      />
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
                    className={`font-display font-black truncate tracking-wide ${
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
                        <span className="text-[#FFB800] font-bold truncate">
                          {slot.playerName}
                        </span>
                      )}
                      {isPreview ? (
                        <span className="text-amber-300/85 text-xs">
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
      ? '#2B82FF'
      : currentPhase?.team === 'B'
      ? '#FF343F'
      : '#FFB800';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header giải đấu FIT CUP S3 */}
      {isOverlay && (
        <div className="flex items-center justify-between gap-6 px-10 pt-5 pb-1">
          <div className="flex items-center gap-3 px-5 py-2 fc-carbon-surface hud-neon-ember fc-chamfer-sm relative">
            <img src="/icon-lq.png" alt="" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-[10px] font-display font-bold tracking-[0.25em] text-[#FF4D1A] uppercase">
                SEASON 3 • OFFICIAL BROADCAST
              </div>
              <span className="font-display font-black text-2xl tracking-wider text-white uppercase">
                {tournamentName}
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-3 opacity-75">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-[#FF4D1A]/60 to-[#FFB800]/70" />
            <span className="w-2.5 h-2.5 rotate-45 bg-[#FFB800] shadow-[0_0_10px_#FFB800]" />
            <span className="h-[1px] flex-1 bg-gradient-to-r from-[#FFB800]/70 to-[#FF343F]/60" />
          </div>

          <div className="flex items-center gap-4 px-5 py-2 fc-carbon-surface hud-neon-gold fc-chamfer-sm relative">
            {boLabel && (
              <span className="px-2.5 py-0.5 bg-[#FFB800]/15 border border-[#FFB800]/60 text-[#FFB800] font-display font-black text-sm tracking-[0.2em]">
                {boLabel}
              </span>
            )}
            <span className="font-display font-bold text-xl tracking-[0.2em] text-white uppercase">
              {roundName}
            </span>
          </div>
        </div>
      )}

      {/* Bố cục chính: Cột A - Trung tâm - Cột B */}
      <div
        className={`flex items-stretch ${
          isOverlay
            ? 'flex-row gap-5 px-10 pb-6'
            : 'flex-col md:flex-row gap-4 md:gap-5'
        }`}
      >
        {renderTeamColumn('A', teamA, bansA, picksA)}

        {/* Cột trung tâm: Vòng đồng hồ kỹ thuật & Lượt hiện tại */}
        <div
          className={`flex items-center justify-center shrink-0 ${
            isOverlay
              ? 'flex-col w-72 gap-6'
              : 'flex-row md:flex-col w-full md:w-40 gap-3'
          }`}
        >
          {timerEnabled && (() => {
            const isLow = timerSeconds <= 5 && !isComplete;
            const ringColor = isLow ? '#FF343F' : activeColor;
            const progress = isComplete
              ? 1
              : Math.max(0, Math.min(1, timerSeconds / Math.max(1, timerMax)));
            const radius = 44;
            const circumference = 2 * Math.PI * radius;
            const dashOffset = circumference * (1 - progress);

            return (
              <div
                className={`relative rounded-full flex flex-col items-center justify-center fc-carbon-surface ${
                  isOverlay ? 'w-44 h-44' : 'w-24 h-24'
                } ${isLow ? 'text-[#FF343F]' : 'text-white'}`}
                style={{
                  boxShadow: `0 0 22px ${
                    isLow ? 'rgba(255,52,63,0.42)' : `${activeColor}35`
                  }, inset 0 0 18px rgba(0,0,0,0.8)`,
                }}
              >
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                  viewBox="0 0 100 100"
                >
                  {/* Vòng khấc kỹ thuật ngoài */}
                  <circle
                    cx="50"
                    cy="50"
                    r="48.5"
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="4"
                    strokeLinecap="butt"
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
                  {isComplete ? (
                    <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#FFB800]">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  ) : (
                    timerSeconds
                  )}
                </span>
                <span className="relative z-10 text-[11px] font-display uppercase tracking-[0.22em] text-gray-400 mt-1">
                  {isComplete ? 'HOÀN TẤT' : 'GIÂY'}
                </span>
              </div>
            );
          })()}

          {/* Chỉ báo lượt FIT CUP S3 */}
          <div
            className={`w-full p-4 fc-carbon-surface text-center relative ${
              isOverlay ? 'fc-chamfer-sm' : 'rounded-xl'
            } ${isComplete ? 'hud-neon-gold' : 'border border-white/15'}`}
            style={
              !isComplete
                ? {
                    borderColor: `${activeColor}85`,
                    boxShadow: `0 0 18px ${activeColor}26`,
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
                <p className="text-xs text-gray-300 mt-1">Sẵn sàng vào trận</p>
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
                  className={`mt-2.5 inline-block px-3.5 py-1 font-display font-bold tracking-wider fc-chamfer-sm ${
                    isOverlay ? 'text-base' : 'text-xs'
                  } ${
                    currentPhase.action === 'ban'
                      ? 'bg-[#FF343F]/20 text-[#FF4D58] border border-[#FF343F]/60'
                      : 'bg-[#2B82FF]/20 text-blue-300 border border-[#2B82FF]/60'
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
