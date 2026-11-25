import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { MapSide, ValorantMap } from '../../types';

interface MapCardProps {
  map: ValorantMap;
  status?: 'available' | 'banned' | 'picked' | 'decider';
  banTeamName?: string;
  banTeamLogo?: string;
  banTeamColor?: string;
  pickTeamName?: string;
  pickTeamColor?: string;
  mapNumber?: number;
  side?: MapSide;
  sideTeamName?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'tall';
  preferLocal?: boolean;
}

/**
 * Thẻ hiển thị Map Valorant (ưu tiên ảnh local /maps/ để tránh lỗi mạng lúc livestream)
 */
export default function MapCard({
  map,
  status = 'available',
  banTeamName,
  banTeamLogo,
  banTeamColor = '#FF343F',
  pickTeamName,
  pickTeamColor = '#FF4057',
  mapNumber,
  side,
  sideTeamName,
  onClick,
  size = 'md',
  preferLocal = true,
}: MapCardProps) {
  const isTall = size === 'tall';
  const primarySrc = preferLocal
    ? (isTall ? map.localIcon : map.localSplash) || map.splash
    : (isTall ? map.listViewIcon : map.splash);
  const fallbackSrc = isTall ? map.listViewIcon || map.splash : map.splash;

  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  const sizeClass =
    size === 'sm'
      ? 'w-32 h-20 rounded-[6px]'
      : size === 'lg'
      ? 'w-64 h-44 rounded-[10px]'
      : size === 'tall'
      ? 'w-56 h-[420px] rounded-[10px]'
      : 'w-44 h-28 rounded-[6px]';

  const hudClass =
    status === 'banned'
      ? 'border border-[#FF343F]/40'
      : status === 'picked'
      ? 'hud-neon-red'
      : status === 'decider'
      ? 'hud-neon-gold hud-subtle-pulse'
      : 'border border-white/15 hover:border-[#FF4057]';

  return (
    <motion.div
      whileHover={status === 'available' && onClick ? { scale: 1.03 } : undefined}
      whileTap={status === 'available' && onClick ? { scale: 0.98 } : undefined}
      onClick={status === 'available' ? onClick : undefined}
      className={`relative overflow-hidden bg-[#0b1018] select-none transition ${sizeClass} ${hudClass} ${
        status === 'available' && onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Ảnh map */}
      <img
        src={src}
        alt={map.name}
        onError={() => {
          if (src !== fallbackSrc && fallbackSrc) setSrc(fallbackSrc);
        }}
        className={`w-full h-full object-cover transition duration-300 ${
          status === 'banned' ? 'grayscale brightness-[0.32]' : 'brightness-90'
        }`}
      />

      {/* Gradient chân thẻ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/25 to-transparent" />

      {/* Nhãn trạng thái trên cùng */}
      {status === 'picked' && mapNumber && (
        <div
          className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-[4px] font-display font-black text-xs tracking-wider text-white shadow"
          style={{ backgroundColor: pickTeamColor }}
        >
          MAP {mapNumber}
        </div>
      )}

      {status === 'decider' && (
        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-[4px] bg-[#FFB800] text-black font-display font-black text-xs tracking-wider shadow">
          {mapNumber ? `MAP ${mapNumber} • DECIDER` : 'DECIDER'}
        </div>
      )}

      {/* Lớp phủ BAN */}
      {status === 'banned' && (
        <div className="absolute inset-0 bg-[#1a090d]/70 flex flex-col items-center justify-center gap-2 p-2">
          <span className="px-3.5 py-0.5 rounded-[4px] bg-[#FF343F] text-white font-display font-black text-sm tracking-widest shadow">
            BAN
          </span>
          <div className="flex items-center gap-1.5 bg-black/80 border border-white/10 px-2.5 py-0.5 rounded-[4px] max-w-full">
            {banTeamLogo && (
              <img src={banTeamLogo} alt="" className="w-4 h-4 object-contain" />
            )}
            <span
              className="text-[11px] font-bold truncate"
              style={{ color: banTeamColor }}
            >
              {banTeamName}
            </span>
          </div>
        </div>
      )}

      {/* Tên map & thông tin Pick/Side ở đáy thẻ */}
      <div className="absolute bottom-0 inset-x-0 p-3">
        <div className="font-display font-black text-white tracking-wider uppercase text-sm md:text-base drop-shadow">
          {map.name}
        </div>

        {(status === 'picked' || status === 'decider') && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            {pickTeamName && status === 'picked' && (
              <span
                className="px-1.5 py-0.5 rounded-[3px] bg-black/80 border border-white/10"
                style={{ color: pickTeamColor }}
              >
                {pickTeamName}
              </span>
            )}
            {side && (
              <span
                className={`px-2 py-0.5 rounded-[3px] font-bold uppercase ${
                  side === 'attack'
                    ? 'bg-[#FF4057] text-white'
                    : 'bg-cyan-400 text-black'
                }`}
              >
                {sideTeamName ? `${sideTeamName}: ` : ''}
                {side === 'attack' ? '⚔️ Attack' : '🛡️ Defense'}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
