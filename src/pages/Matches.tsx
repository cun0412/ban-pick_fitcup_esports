import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteMatchRecord,
  fetchMatchRecords,
  type SavedMatchRecord,
} from '../lib/api';
import lqHeroesRaw from '../data/lq-heroes.json';
import valorantMapsRaw from '../data/valorant-maps.json';
import MatchReportModal from '../components/common/MatchReportModal';
import { buildReportFromSavedMatch, type MatchReportData } from '../utils/matchReport';
import type { LQHero, ValorantMap } from '../types';

/**
 * Trang Lịch sử các trận đấu Ban/Pick & Quay Map của giải đấu FITCUP
 */
export default function Matches() {
  const [matches, setMatches] = useState<SavedMatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGame, setFilterGame] = useState<'all' | 'lq' | 'valorant'>('all');
  const [search, setSearch] = useState('');
  const [reportData, setReportData] = useState<MatchReportData | null>(null);

  const heroMap = useMemo(() => {
    const m = new Map<string, string>();
    (lqHeroesRaw as LQHero[]).forEach((h) => m.set(h.id, h.name));
    return m;
  }, []);

  const valMapLookup = useMemo(() => {
    const m = new Map<string, string>();
    (valorantMapsRaw as ValorantMap[]).forEach((mp) => m.set(mp.id, mp.name));
    return m;
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await fetchMatchRecords();
    setMatches(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa biên bản trận đấu này?')) return;
    await deleteMatchRecord(id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(matches, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitcup-matches-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matches.filter((m) => {
      if (filterGame !== 'all' && m.game !== filterGame) return false;
      if (!q) return true;
      return (
        m.tournament_name.toLowerCase().includes(q) ||
        m.round_name.toLowerCase().includes(q) ||
        m.team_a?.name?.toLowerCase().includes(q) ||
        m.team_b?.name?.toLowerCase().includes(q)
      );
    });
  }, [matches, filterGame, search]);

  return (
    <div className="min-h-screen bg-[#0b0d14] text-[#eef0f5] font-body">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(238,240,245,0.08)] pb-5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="h-9 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#232836] border border-[rgba(238,240,245,0.1)] text-xs inline-flex items-center whitespace-nowrap shrink-0"
            >
              ← Trang chủ
            </Link>
            <h1 className="text-2xl font-semibold text-[#eef0f5]">
              Lịch sử Ban/Pick giải đấu
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="h-9 px-3.5 rounded-lg bg-[#1a1e28] hover:bg-[#232836] border border-[rgba(238,240,245,0.1)] text-xs font-medium"
            >
              Làm mới
            </button>
            <button
              type="button"
              onClick={handleExportAll}
              disabled={matches.length === 0}
              className="h-9 px-3.5 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium disabled:opacity-40"
            >
              Xuất JSON ({matches.length})
            </button>
          </div>
        </header>

        {/* Bộ lọc */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#11141c] p-1 rounded-lg border border-[rgba(238,240,245,0.08)]">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'lq', label: 'Liên Quân Mobile' },
                { id: 'valorant', label: 'Valorant' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterGame(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterGame === tab.id
                    ? 'bg-[#1a1e28] text-[#eef0f5]'
                    : 'text-[#7a8296] hover:text-[#eef0f5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên đội hoặc vòng đấu..."
            className="h-9 w-64 px-3 rounded-lg bg-[#11141c] border border-[rgba(238,240,245,0.1)] text-xs text-[#eef0f5] placeholder-[#7a8296] focus:outline-none focus:border-[#3185FF]"
          />
        </div>

        {/* Danh sách trận */}
        {loading ? (
          <div className="py-16 text-center text-sm text-[#7a8296]">
            Đang tải dữ liệu...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-[#11141c] border border-[rgba(238,240,245,0.08)] py-16 text-center space-y-2">
            <div className="text-sm text-[#a3a9b8]">Chưa có trận đấu nào được lưu</div>
            <p className="text-xs text-[#7a8296]">
              Sau khi hoàn tất Ban/Pick hoặc Quay Map ở trang điều khiển, bấm nút Lưu trận để lưu lại
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((match) => (
              <article
                key={match.id}
                className="rounded-xl bg-[#11141c] border border-[rgba(238,240,245,0.08)] overflow-hidden"
              >
                <div
                  className={`h-[2px] w-full ${
                    match.game === 'lq' ? 'bg-[#3185FF]' : 'bg-[#FF4057]'
                  }`}
                />
                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="px-2 py-0.5 rounded bg-[#1a1e28] text-[#eef0f5] font-medium">
                        {match.game === 'lq' ? 'Liên Quân Mobile' : 'Valorant'}
                      </span>
                      <span className="text-[#a3a9b8] font-medium">
                        {match.tournament_name}
                        {match.round_name ? ` · ${match.round_name}` : ''}
                      </span>
                      <span className="text-[#7a8296] tabular-nums">
                        {new Date(match.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setReportData(
                            buildReportFromSavedMatch(
                              match,
                              lqHeroesRaw as LQHero[],
                              valorantMapsRaw as ValorantMap[]
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-md bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
                      >
                        📄 Xuất biên bản
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(match.id)}
                        className="text-xs text-[#7a8296] hover:text-red-400 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Cặp đấu */}
                  <div className="flex items-center gap-3 text-base font-medium">
                    <span style={{ color: match.team_a?.color || '#3185FF' }}>
                      {match.team_a?.name || 'Đội A'}
                    </span>
                    <span className="text-xs text-[#7a8296]">vs</span>
                    <span style={{ color: match.team_b?.color || '#FF343F' }}>
                      {match.team_b?.name || 'Đội B'}
                    </span>
                  </div>

                  {/* Chi tiết kết quả */}
                  {match.game === 'lq' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-t border-[rgba(238,240,245,0.06)] pt-3">
                      {[
                        {
                          label: match.team_a?.name || 'Đội A',
                          bans: match.result?.bansA || [],
                          picks: match.result?.picksA || [],
                        },
                        {
                          label: match.team_b?.name || 'Đội B',
                          bans: match.result?.bansB || [],
                          picks: match.result?.picksB || [],
                        },
                      ].map((side, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="text-[#a3a9b8] font-medium">{side.label}</div>
                          <div className="text-[#7a8296]">
                            Cấm:{' '}
                            <span className="text-[#eef0f5]">
                              {side.bans
                                .map((b: any) =>
                                  b.heroId ? heroMap.get(b.heroId) || b.heroId : null
                                )
                                .filter(Boolean)
                                .join(', ') || 'Không'}
                            </span>
                          </div>
                          <div className="text-[#7a8296]">
                            Chọn:{' '}
                            <span className="text-[#eef0f5]">
                              {side.picks
                                .map((p: any) => {
                                  const hn = p.heroId
                                    ? heroMap.get(p.heroId) || p.heroId
                                    : null;
                                  if (!hn) return null;
                                  return p.playerName ? `${hn} (${p.playerName})` : hn;
                                })
                                .filter(Boolean)
                                .join(', ') || 'Chưa chọn'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-[rgba(238,240,245,0.06)] pt-3 text-xs space-y-2">
                      {match.mode === 'veto' ? (
                        <div className="flex flex-wrap gap-2">
                          {(match.result?.vetoHistory || []).map((v: any, i: number) => {
                            const mapName = valMapLookup.get(v.mapId) || v.mapId;
                            const teamName =
                              v.team === 'A'
                                ? match.team_a?.name
                                : match.team_b?.name;
                            return (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded bg-[#1a1e28] border border-[rgba(238,240,245,0.08)]"
                              >
                                <strong className="uppercase">{v.action}</strong>{' '}
                                {mapName} ({teamName}
                                {v.side ? ` · ${v.side}` : ''})
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(match.result?.spinResults || []).map((r: any, i: number) => {
                            const mapName = valMapLookup.get(r.mapId) || r.mapId;
                            return (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded bg-[#1a1e28] border border-[rgba(238,240,245,0.08)]"
                              >
                                <strong>MAP {r.mapNumber}:</strong> {mapName}
                                {r.side?.side ? ` (${r.side.side})` : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <MatchReportModal
        open={Boolean(reportData)}
        initialData={reportData}
        onClose={() => setReportData(null)}
      />
    </div>
  );
}
