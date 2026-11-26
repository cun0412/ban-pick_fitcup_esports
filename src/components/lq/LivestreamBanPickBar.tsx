import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import HeroRoleBadge from './HeroRoleBadge';
import type { BPPhase, BPSlot, LQHero, TeamConfig, TeamSide } from '../../types';

interface LivestreamBanPickBarProps {
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  heroes: LQHero[];
  selectedHeroId?: string | null;
  teamA: TeamConfig;
  teamB: TeamConfig;
  scoreA: number;
  scoreB: number;
  boLabel: string;
  currentPhase: BPPhase | null;
  currentSlotIndex: number;
  tournamentName: string;
  roundName: string;
  timerSeconds: number;
  timerMax: number;
  timerEnabled: boolean;
  isComplete: boolean;
}

function StreamPortrait({
  hero,
  grayscale = false,
}: {
  hero: LQHero;
  grayscale?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);

  if (imgErr || !hero.image) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1d1722] to-[#0a080d] font-display font-black text-3xl text-white/45 select-none">
        {hero.name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={hero.image}
      alt={hero.name}
      loading="eager"
      decoding="sync"
      onError={() => setImgErr(true)}
      className={`w-full h-full object-cover object-top ${
        grayscale ? 'grayscale brightness-75 contrast-125' : ''
      }`}
    />
  );
}

/**
 * Thanh HUD Ban/Pick gắn mép dưới khung hình 1920x1080 cho OBS Livestream
 * Thiết kế theo phong cách giải đấu chuyên nghiệp & nhận diện FIT CUP Season 3
 */
export default function LivestreamBanPickBar({
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
  timerMax,
  timerEnabled,
  isComplete,
}: LivestreamBanPickBarProps) {
  const heroMap = useMemo(() => {
    const m = new Map<string, LQHero>();
    heroes.forEach((h) => m.set(h.id, h));
    return m;
  }, [heroes]);

  const previewHero = useMemo(
    () => (selectedHeroId ? heroMap.get(selectedHeroId) ?? null : null),
    [selectedHeroId, heroMap]
  );

  const renderBanStrip = (side: TeamSide, bans: BPSlot[]) => {
    const isLeft = side === 'A';
    const sideAccent = isLeft ? '#2B82FF' : '#FF343F';

    return (
      <div
        className={`flex items-end gap-1 px-2 pt-1.5 pb-1 bg-[#08060A]/92 border-t border-white/15 backdrop-blur-sm ${
          isLeft
            ? 'border-r border-r-white/15 fc-chamfer-tr pr-4'
            : 'border-l border-l-white/15 fc-chamfer-tl pl-4 flex-row-reverse'
        }`}
        style={{
          boxShadow: `0 -4px 18px rgba(0,0,0,0.65), inset 0 1px 0 ${sideAccent}45`,
        }}
      >
        <div className="flex items-center gap-1">
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
                key={`sban-${side}-${idx}`}
                className={`relative w-[68px] h-[54px] overflow-hidden bg-[#120E15] transition-all ${
                  isActive
                    ? 'ring-2 ring-[#FFB800] shadow-[0_0_14px_rgba(255,184,0,0.5)]'
                    : hero
                    ? 'border border-[#FF343F]/65'
                    : 'border border-white/12'
                }`}
              >
                {hero ? (
                  <motion.div
                    key={hero.id}
                    initial={{ scale: 1.18, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full relative"
                  >
                    <StreamPortrait hero={hero} grayscale />
                    <div className="absolute inset-0 bg-[#FF2E3B]/25" />
                    {/* Đường gạch chéo cấm sắc nét */}
                    <svg
                      viewBox="0 0 68 54"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <line
                        x1="8"
                        y1="46"
                        x2="60"
                        y2="8"
                        stroke="#FF3B47"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.div>
                ) : isPreview && previewHero ? (
                  <div className="w-full h-full relative">
                    <StreamPortrait hero={previewHero} />
                    <div className="absolute inset-0 bg-[#FFB800]/18 ring-1 ring-inset ring-[#FFB800]" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[#FFB800] text-[9px] font-display font-bold text-center tracking-wider">
                      BAN?
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-display font-bold text-white/25 tracking-wider">
                    B{idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className={`px-2 py-0.5 text-[10px] font-display font-extrabold tracking-[0.18em] uppercase self-center ${
            isLeft ? 'text-[#60A5FA]' : 'text-[#FF6B74]'
          }`}
        >
          CẤM
        </div>
      </div>
    );
  };

  const renderPickColumn = (side: TeamSide, picks: BPSlot[]) => {
    const isLeft = side === 'A';
    const teamAccent = isLeft ? '#216BFF' : '#D91C28';
    const topEdgeNeon = isLeft ? '#38BDF8' : '#FF5A36';
    const plateBg = isLeft
      ? 'linear-gradient(180deg, #165AE0 0%, #0A2C7A 100%)'
      : 'linear-gradient(180deg, #D91D2A 0%, #750B14 100%)';

    return (
      <div className="flex-1 grid grid-cols-5 h-full bg-[#09070B]">
        {picks.map((slot, idx) => {
          const hero = slot.heroId ? heroMap.get(slot.heroId) : null;
          const isActive =
            !isComplete &&
            currentPhase?.team === side &&
            currentPhase?.action === 'pick' &&
            currentSlotIndex === idx;
          const isPreview = !hero && isActive && Boolean(previewHero);
          const displayHero = hero || (isPreview ? previewHero : null);
          const displayLabel =
            slot.playerName?.trim() ||
            displayHero?.name ||
            `P${idx + 1}`;

          return (
            <div
              key={`spick-${side}-${idx}`}
              className={`relative h-full flex flex-col overflow-hidden border-r border-black/80 last:border-r-0 ${
                isActive ? 'z-10' : ''
              }`}
              style={{
                boxShadow: isActive
                  ? 'inset 0 0 0 2px #FFB800, 0 0 20px rgba(255,184,0,0.45)'
                  : undefined,
              }}
            >
              {/* Đường viền neon mảnh mép trên mỗi ô tướng */}
              <div
                className="h-[3px] w-full shrink-0 z-20"
                style={{
                  backgroundColor: isActive ? '#FFB800' : topEdgeNeon,
                  boxShadow: isActive
                    ? '0 0 12px #FFB800'
                    : `0 0 8px ${topEdgeNeon}90`,
                }}
              />

              {/* Vùng ảnh tướng dọc */}
              <div className="flex-1 relative overflow-hidden bg-[#100D14]">
                {hero ? (
                  <motion.div
                    key={hero.id}
                    initial={{ scale: 1.08, opacity: 0.45 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="w-full h-full relative"
                  >
                    <StreamPortrait hero={hero} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />
                  </motion.div>
                ) : isPreview && previewHero ? (
                  <div className="w-full h-full relative">
                    <div className="w-full h-full opacity-90">
                      <StreamPortrait hero={previewHero} />
                    </div>
                    <div className="absolute inset-0 bg-[#FFB800]/14 border-2 border-[#FFB800]/70 pointer-events-none" />
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/85 border border-[#FFB800] text-[#FFB800] text-[10px] font-display font-black tracking-widest whitespace-nowrap">
                      CHỜ KHÓA
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center fc-tactical-hatch">
                    <span
                      className={`font-display font-black text-3xl ${
                        isActive ? 'text-[#FFB800]' : 'text-white/15'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    {isActive && (
                      <span className="mt-1 px-2 py-0.5 bg-[#FFB800]/20 border border-[#FFB800]/70 text-[#FFB800] text-[10px] font-display font-bold tracking-widest">
                        ĐANG CHỌN
                      </span>
                    )}
                  </div>
                )}

                {/* Icon vai trò tướng góc trên giống ảnh mẫu */}
                <div
                  className={`absolute top-2 z-20 ${
                    isLeft ? 'left-2' : 'right-2'
                  }`}
                >
                  <HeroRoleBadge
                    role={displayHero?.role}
                    accentColor={teamAccent}
                    size={26}
                  />
                </div>

                {/* Tên tướng nhỏ ở mép dưới ảnh khi đã nhập tên tuyển thủ */}
                {displayHero && slot.playerName?.trim() && (
                  <div
                    className={`absolute bottom-1.5 px-2 z-20 text-[11px] font-display font-bold tracking-wider text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] truncate inset-x-0 ${
                      isLeft ? 'text-left' : 'text-right'
                    }`}
                  >
                    {displayHero.name}
                  </div>
                )}
              </div>

              {/* Thanh tên tuyển thủ / tên tướng dưới cùng (gradient xanh/đỏ giống broadcast) */}
              <div
                className="h-[44px] px-2 flex items-center justify-center relative shrink-0 border-t"
                style={{
                  background: isActive
                    ? 'linear-gradient(180deg, #D98A00 0%, #8A4F00 100%)'
                    : plateBg,
                  borderTopColor: isActive ? '#FFD43B' : topEdgeNeon,
                }}
              >
                <span className="font-display font-extrabold text-[15px] tracking-wide text-white truncate drop-shadow">
                  {displayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const activeTurnColor =
    currentPhase?.team === 'A'
      ? '#38BDF8'
      : currentPhase?.team === 'B'
      ? '#FF4D2E'
      : '#FFB800';

  const timerRatio = isComplete
    ? 0
    : Math.max(0, Math.min(1, timerSeconds / Math.max(1, timerMax)));

  return (
    <div className="w-full flex flex-col justify-end select-none">
      {/* Hàng Ban nhỏ nằm sát mép trên hai bên trái/phải */}
      <div className="w-full flex items-end justify-between">
        <div>{renderBanStrip('A', bansA)}</div>

        {/* Đồng hồ đếm ngược gọn phía trên Center Core khi đang Ban/Pick */}
        {timerEnabled && !isComplete && currentPhase && (
          <div className="flex flex-col items-center mb-[1px]">
            <div
              className="px-5 py-1 bg-[#09070B]/95 border-t border-x flex items-center gap-3 fc-chamfer-sm"
              style={{
                borderColor: `${activeTurnColor}85`,
                boxShadow: `0 0 18px ${activeTurnColor}30`,
              }}
            >
              <span
                className="text-[11px] font-display font-extrabold uppercase tracking-[0.2em]"
                style={{ color: activeTurnColor }}
              >
                {currentPhase.team === 'A' ? teamA.name : teamB.name} •{' '}
                {currentPhase.action === 'ban' ? 'CẤM' : 'CHỌN'}
              </span>
              <span
                className={`font-display font-black text-xl tabular-nums leading-none ${
                  timerSeconds <= 5 ? 'text-[#FF4057]' : 'text-[#FFB800]'
                }`}
              >
                {timerSeconds}s
              </span>
            </div>
            <div className="w-[276px] h-[3px] bg-black/90 overflow-hidden">
              <div
                className="h-full transition-[width] duration-150 ease-linear"
                style={{
                  width: `${timerRatio * 100}%`,
                  backgroundColor: timerSeconds <= 5 ? '#FF4057' : '#FFB800',
                  boxShadow: '0 0 10px rgba(255,184,0,0.8)',
                }}
              />
            </div>
          </div>
        )}

        <div>{renderBanStrip('B', bansB)}</div>
      </div>

      {/* Thanh Broadcast Chính 248px ở mép dưới */}
      <div className="w-full h-[248px] flex items-stretch bg-[#070509] border-t border-white/15 shadow-[0_-12px_40px_rgba(0,0,0,0.8)]">
        {/* Đội A (5 tướng trái) */}
        {renderPickColumn('A', picksA)}

        {/* Khối Trung tâm Match Core — FIT CUP S3 */}
        <div
          className="w-[276px] shrink-0 relative flex flex-col justify-between bg-[#09070B] border-x border-white/15 overflow-hidden"
          style={{
            boxShadow:
              'inset 0 2px 0 #FF4D1A, inset 0 -3px 0 #FFB800, 0 0 28px rgba(255,77,26,0.18)',
          }}
        >
          {/* Viền glow neon trái (Xanh) & phải (Đỏ) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-[#2B82FF] shadow-[0_0_12px_#2B82FF]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[3px] bg-[#FF343F] shadow-[0_0_12px_#FF343F]" />

          {/* Header FIT CUP S3 + Liên Quân Mobile */}
          <div className="px-3.5 pt-2.5 pb-1.5 flex items-center justify-between border-b border-white/10 bg-gradient-to-b from-[#1E100E]/90 to-transparent">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-5 bg-gradient-to-b from-[#FFB800] to-[#FF4D1A] shrink-0" />
              <div className="min-w-0 leading-tight">
                <div className="font-display font-black text-xs tracking-[0.14em] text-[#FFB800] uppercase truncate">
                  {tournamentName || 'FIT CUP S3'}
                </div>
                <div className="text-[10px] font-display font-bold text-white/65 tracking-[0.18em] uppercase truncate">
                  {roundName || 'SEASON 3'}
                </div>
              </div>
            </div>
            <img
              src="/icon-lq.png"
              alt="Liên Quân Mobile"
              className="w-7 h-7 object-contain shrink-0 opacity-95"
            />
          </div>

          {/* Hàng Logo 2 đội + VS */}
          <div className="px-4 flex items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-1 w-[82px]">
              <div className="w-[58px] h-[58px] bg-[#121622] border border-[#2B82FF]/65 flex items-center justify-center overflow-hidden p-1 shadow-[0_0_12px_rgba(43,130,255,0.25)]">
                {teamA.logo ? (
                  <img
                    src={teamA.logo}
                    alt={teamA.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-display font-black text-lg text-[#60A5FA]">
                    {teamA.name.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-display font-extrabold tracking-wider text-white truncate max-w-full uppercase">
                {teamA.name}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="font-display font-black italic text-xl tracking-widest text-[#FFB800] drop-shadow-[0_0_10px_rgba(255,184,0,0.45)]">
                VS
              </span>
            </div>

            <div className="flex flex-col items-center gap-1 w-[82px]">
              <div className="w-[58px] h-[58px] bg-[#1C1116] border border-[#FF343F]/65 flex items-center justify-center overflow-hidden p-1 shadow-[0_0_12px_rgba(255,52,63,0.25)]">
                {teamB.logo ? (
                  <img
                    src={teamB.logo}
                    alt={teamB.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="font-display font-black text-lg text-[#FF6B74]">
                    {teamB.name.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-display font-extrabold tracking-wider text-white truncate max-w-full uppercase">
                {teamB.name}
              </span>
            </div>
          </div>

          {/* Tỉ số 2 đội & BO format */}
          <div className="px-5 pb-3 pt-1 flex items-center justify-between">
            <span className="w-12 text-center font-display font-black text-[42px] leading-none tabular-nums text-white drop-shadow-[0_0_12px_rgba(43,130,255,0.45)]">
              {scoreA}
            </span>
            <span className="px-3 py-1 bg-[#1A120E] border border-[#FFB800]/55 text-[#FFB800] font-display font-black text-sm tracking-[0.2em] uppercase fc-chamfer-sm shadow-[0_0_12px_rgba(255,184,0,0.18)]">
              {boLabel || 'BO1'}
            </span>
            <span className="w-12 text-center font-display font-black text-[42px] leading-none tabular-nums text-white drop-shadow-[0_0_12px_rgba(255,52,63,0.45)]">
              {scoreB}
            </span>
          </div>
        </div>

        {/* Đội B (5 tướng phải) */}
        {renderPickColumn('B', picksB)}
      </div>
    </div>
  );
}
