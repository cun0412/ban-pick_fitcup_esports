import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { TeamSide } from '../../types';

interface TeamSetupProps {
  team: TeamSide;
  onChanged?: () => void;
}

/**
 * Component cấu hình thông tin đội (tên, logo upload, màu chủ đạo)
 */
export default function TeamSetup({ team, onChanged }: TeamSetupProps) {
  const teamConfig = useSettingsStore((s) => (team === 'A' ? s.teamA : s.teamB));
  const updateTeam = useSettingsStore((s) =>
    team === 'A' ? s.updateTeamA : s.updateTeamB
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateTeam({ logo: reader.result });
        onChanged?.();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="glass rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{
            backgroundColor: `${teamConfig.color}25`,
            color: teamConfig.color,
            border: `1px solid ${teamConfig.color}60`,
          }}
        >
          Đội {team}
        </span>
        {teamConfig.logo && (
          <button
            type="button"
            onClick={() => {
              updateTeam({ logo: '' });
              onChanged?.();
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Xoá logo
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Preview logo hoặc chữ cái đầu */}
        <label className="relative w-12 h-12 rounded-lg border border-white/15 bg-black/40 flex items-center justify-center overflow-hidden cursor-pointer hover:border-white/40 transition shrink-0 group">
          {teamConfig.logo ? (
            <img
              src={teamConfig.logo}
              alt={teamConfig.name}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <span
              className="font-display font-bold text-lg"
              style={{ color: teamConfig.color }}
            >
              {teamConfig.name.slice(0, 2).toUpperCase() || team}
            </span>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition">
            Logo
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </label>

        {/* Tên đội */}
        <input
          type="text"
          value={teamConfig.name}
          onChange={(e) => {
            updateTeam({ name: e.target.value });
            onChanged?.();
          }}
          placeholder={`Tên đội ${team}`}
          className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-white/40"
        />

        {/* Chọn màu chủ đạo */}
        <input
          type="color"
          value={teamConfig.color}
          onChange={(e) => {
            updateTeam({ color: e.target.value });
            onChanged?.();
          }}
          title="Màu chủ đạo"
          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0.5 shrink-0"
        />
      </div>
    </div>
  );
}
