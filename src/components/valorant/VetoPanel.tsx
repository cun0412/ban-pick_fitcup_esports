import { useMemo } from 'react';
import MapCard from './MapCard';
import { useValorantStore } from '../../stores/valorantStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAudio } from '../../hooks/useAudio';
import type { MapSide, VetoEntry } from '../../types';

/**
 * Bảng điều khiển chế độ VETO (Ban/Pick truyền thống) cho Valorant
 */
export default function VetoPanel() {
  const val = useValorantStore();
  const settings = useSettingsStore();
  const { playBan, playPick, playFanfare } = useAudio();

  const currentPhase =
    !val.vetoComplete && val.currentVetoIndex < val.vetoPhases.length
      ? val.vetoPhases[val.currentVetoIndex]
      : null;

  const vetoMapLookup = useMemo(() => {
    const m = new Map<string, VetoEntry>();
    val.vetoHistory.forEach((entry) => m.set(entry.mapId, entry));
    return m;
  }, [val.vetoHistory]);

  const enabledMaps = val.maps.filter((m) => m.enabled);

  const handleSelectMap = (mapId: string) => {
    if (!currentPhase) return;
    if (currentPhase.action !== 'ban' && currentPhase.action !== 'pick') return;
    val.vetoAction(mapId);
    if (settings.soundEnabled) {
      if (currentPhase.action === 'ban') playBan();
      else playPick();
    }
  };

  const handleChooseSide = (side: MapSide) => {
    val.vetoSide(side);
    if (settings.soundEnabled) {
      if (val.currentVetoIndex + 1 >= val.vetoPhases.length) playFanfare();
      else playPick();
    }
  };

  const activeTeam =
    currentPhase?.team === 'A' ? settings.teamA : settings.teamB;

  const pickedAndDecider = val.vetoHistory.filter(
    (v) => v.action === 'pick' || v.action === 'decider'
  );

  return (
    <div className="space-y-4">
      {/* Timeline các bước Veto */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-display font-bold uppercase tracking-widest text-gray-400">
            Tiến trình Veto ({val.boType.toUpperCase()})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={val.vetoUndo}
              disabled={val.currentVetoIndex === 0 && val.vetoHistory.length === 0}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold disabled:opacity-40"
            >
              ↩ Undo
            </button>
            <button
              type="button"
              onClick={val.vetoReset}
              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold"
            >
              🔄 Reset Veto
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {val.vetoPhases.map((p, idx) => {
            const done = idx < val.currentVetoIndex;
            const current = idx === val.currentVetoIndex && !val.vetoComplete;
            const t = p.team === 'A' ? settings.teamA : settings.teamB;
            const label =
              p.action === 'ban'
                ? 'BAN'
                : p.action === 'pick'
                ? 'PICK'
                : p.action === 'side'
                ? 'CHỌN BÊN'
                : 'DECIDER (BÊN)';

            return (
              <div
                key={idx}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  current
                    ? 'animate-pulse-glow border-white bg-white/15 text-white'
                    : done
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 bg-black/30 text-gray-400'
                }`}
              >
                <span className="opacity-60">#{idx + 1}</span>
                <span style={{ color: t.color }}>{t.name}</span>
                <span>{label}</span>
                {done && <span>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chỉ báo lượt hiện tại & nút chọn bên nếu là lượt side/decider */}
      <div className="glass rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#ff4655]/30">
        {val.vetoComplete ? (
          <div className="flex-1 text-center md:text-left">
            <div className="font-display font-black text-xl text-amber-400">
              ✅ VETO HOÀN TẤT – THỨ TỰ MAP THI ĐẤU
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Kết quả đã được đồng bộ lên màn hình Overlay livestream.
            </p>
          </div>
        ) : currentPhase ? (
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-gray-400">
              Lượt hiện tại
            </div>
            <div className="text-xl font-display font-black flex items-center gap-2 mt-0.5">
              <span style={{ color: activeTeam.color }}>{activeTeam.name}</span>
              <span className="text-white">
                {currentPhase.action === 'ban'
                  ? '— Bấm chọn 1 map để CẤM (BAN)'
                  : currentPhase.action === 'pick'
                  ? '— Bấm chọn 1 map để THI ĐẤU (PICK)'
                  : '— Chọn bên khởi đầu (Attack / Defense)'}
              </span>
            </div>
          </div>
        ) : null}

        {currentPhase &&
          (currentPhase.action === 'side' || currentPhase.action === 'decider') &&
          !val.vetoComplete && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleChooseSide('attack')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff4655] to-rose-600 hover:from-rose-500 hover:to-red-500 font-display font-black text-sm tracking-wider shadow-lg shadow-red-600/30"
              >
                ⚔️ ATTACK (CÔNG)
              </button>
              <button
                type="button"
                onClick={() => handleChooseSide('defense')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 font-display font-black text-sm tracking-wider shadow-lg shadow-cyan-600/30"
              >
                🛡️ DEFENSE (THỦ)
              </button>
            </div>
          )}
      </div>

      {/* Lưới chọn Map */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-xs font-display font-bold uppercase tracking-widest text-gray-400 mb-3">
          Bản đồ trong Map Pool ({enabledMaps.length} map)
        </h3>
        <div className="flex flex-wrap gap-3">
          {enabledMaps.map((m) => {
            const entry = vetoMapLookup.get(m.id);
            const status = entry
              ? entry.action === 'ban'
                ? 'banned'
                : entry.action === 'decider'
                ? 'decider'
                : 'picked'
              : 'available';

            const teamObj = entry
              ? entry.team === 'A'
                ? settings.teamA
                : settings.teamB
              : undefined;
            const sideTeamObj = entry?.sideTeam
              ? entry.sideTeam === 'A'
                ? settings.teamA
                : settings.teamB
              : undefined;

            return (
              <MapCard
                key={m.id}
                map={m}
                status={status}
                banTeamName={teamObj?.name}
                banTeamLogo={teamObj?.logo}
                banTeamColor={teamObj?.color}
                pickTeamName={teamObj?.name}
                pickTeamColor={teamObj?.color}
                mapNumber={entry?.mapNumber}
                side={entry?.side || null}
                sideTeamName={sideTeamObj?.name}
                onClick={() => handleSelectMap(m.id)}
                size="md"
              />
            );
          })}
        </div>
      </div>

      {/* Tổng kết thứ tự map */}
      {pickedAndDecider.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-amber-300 mb-3">
            Danh sách Map thi đấu đã chốt
          </h3>
          <div className="flex flex-wrap gap-3">
            {pickedAndDecider.map((entry, i) => {
              const mapObj = val.maps.find((m) => m.id === entry.mapId);
              if (!mapObj) return null;
              const teamObj = entry.team === 'A' ? settings.teamA : settings.teamB;
              const sideTeamObj = entry.sideTeam
                ? entry.sideTeam === 'A'
                  ? settings.teamA
                  : settings.teamB
                : undefined;

              return (
                <MapCard
                  key={`${entry.mapId}-${i}`}
                  map={mapObj}
                  status={entry.action === 'decider' ? 'decider' : 'picked'}
                  pickTeamName={teamObj.name}
                  pickTeamColor={teamObj.color}
                  mapNumber={entry.mapNumber || i + 1}
                  side={entry.side}
                  sideTeamName={sideTeamObj?.name}
                  size="sm"
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
