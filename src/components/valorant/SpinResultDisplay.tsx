import { motion } from 'framer-motion';
import type { SpinResult, TeamConfig, ValorantMap } from '../../types';

interface SpinResultDisplayProps {
  results: SpinResult[];
  maps: ValorantMap[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  isOverlay?: boolean;
}

/**
 * Hiển thị danh sách các map đã quay được theo thứ tự MAP 1, MAP 2, ...
 * Kèm thông tin bên Attack / Defense nếu có
 */
export default function SpinResultDisplay({
  results,
  maps,
  teamA,
  teamB,
  isOverlay = false,
}: SpinResultDisplayProps) {
  if (results.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-6">
        Chưa có kết quả quay map nào.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {results.map((res, idx) => {
        const mapObj = maps.find((m) => m.id === res.mapId);
        if (!mapObj) return null;
        const sideTeam = res.side
          ? res.side.team === 'A'
            ? teamA
            : teamB
          : null;

        return (
          <motion.div
            key={`${res.mapId}-${res.mapNumber}-${idx}`}
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`relative rounded-2xl overflow-hidden border-2 border-[#ff4655] bg-[#0f1923] shadow-[0_0_25px_rgba(255,70,85,0.3)] ${
              isOverlay ? 'w-72 h-44' : 'w-52 h-32'
            }`}
          >
            <img
              src={mapObj.localSplash || mapObj.splash}
              alt={mapObj.name}
              onError={(e) => {
                if (mapObj.splash) e.currentTarget.src = mapObj.splash;
              }}
              className="w-full h-full object-cover brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

            <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded bg-[#ff4655] text-white font-display font-black text-xs tracking-wider">
              MAP {res.mapNumber}
            </div>

            <div className="absolute bottom-2.5 inset-x-3">
              <div
                className={`font-display font-black uppercase text-white tracking-wider ${
                  isOverlay ? 'text-2xl' : 'text-lg'
                }`}
              >
                {mapObj.name}
              </div>
              {res.side && res.side.side && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                  {sideTeam && (
                    <span style={{ color: sideTeam.color }}>{sideTeam.name}:</span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded uppercase ${
                      res.side.side === 'attack'
                        ? 'bg-red-500 text-white'
                        : 'bg-cyan-400 text-black'
                    }`}
                  >
                    {res.side.side === 'attack' ? '⚔️ Attack' : '🛡️ Defense'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
