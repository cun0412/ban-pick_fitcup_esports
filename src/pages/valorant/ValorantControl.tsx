import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import VetoPanel from '../../components/valorant/VetoPanel';
import SpinWheel from '../../components/valorant/SpinWheel';
import SlotMachine from '../../components/valorant/SlotMachine';
import CardFlip from '../../components/valorant/CardFlip';
import SpinResultDisplay from '../../components/valorant/SpinResultDisplay';
import CoinFlip from '../../components/valorant/CoinFlip';
import TeamSetup from '../../components/common/TeamSetup';
import { useValorantStore } from '../../stores/valorantStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBroadcast } from '../../hooks/useBroadcast';
import { useAudio } from '../../hooks/useAudio';
import { useKeyboard } from '../../hooks/useKeyboard';
import { saveMatchRecord } from '../../lib/api';
import type { BoType, MapSide, SpinStyle, TeamSide, ValorantMap, VetoPhase } from '../../types';

/**
 * Trang điều khiển Valorant (Tab VETO & Tab QUAY MAP)
 */
export default function ValorantControl() {
  const val = useValorantStore();
  const settings = useSettingsStore();
  const { send, subscribe } = useBroadcast('val-channel');
  const { playTick, playFanfare } = useAudio();

  const [copied, setCopied] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [showMapPoolModal, setShowMapPoolModal] = useState(false);
  const [showVetoOrderModal, setShowVetoOrderModal] = useState(false);
  const [coinFlipMode, setCoinFlipMode] = useState<'team' | 'side' | null>(null);
  const [winnerBannerMap, setWinnerBannerMap] = useState<ValorantMap | null>(null);
  const [autoSpinningAll, setAutoSpinningAll] = useState(false);
  const autoSpinQueueRef = useRef<boolean>(false);

  // Tải cấu hình & danh sách map khi mở trang
  useEffect(() => {
    settings.hydrate();
    val.hydrate();
  }, []);

  const buildSyncPayload = useCallback(
    () => ({
      mode: val.mode,
      boType: val.boType,
      maps: val.maps,
      vetoPhases: val.vetoPhases,
      currentVetoIndex: val.currentVetoIndex,
      vetoHistory: val.vetoHistory,
      vetoComplete: val.vetoComplete,
      spinConfig: val.spinConfig,
      spinResults: val.spinResults,
      preSpinBans: val.preSpinBans,
      teamA: settings.teamA,
      teamB: settings.teamB,
      tournamentName: settings.tournamentName,
      roundName: settings.roundName,
      overlayBg: settings.overlayBg,
    }),
    [
      val.mode,
      val.boType,
      val.maps,
      val.vetoPhases,
      val.currentVetoIndex,
      val.vetoHistory,
      val.vetoComplete,
      val.spinConfig,
      val.spinResults,
      val.preSpinBans,
      settings.teamA,
      settings.teamB,
      settings.tournamentName,
      settings.roundName,
      settings.overlayBg,
    ]
  );

  // Broadcast state mỗi khi có thay đổi
  useEffect(() => {
    send('val-sync', buildSyncPayload());
  }, [send, buildSyncPayload]);

  // Trả lời request-sync từ Overlay mới mở
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'request-sync') {
        send('val-sync', buildSyncPayload());
      }
    });
  }, [subscribe, send, buildSyncPayload]);

  const targetSpinCount =
    val.spinConfig.boType === 'bo1' ? 1 : val.spinConfig.boType === 'bo5' ? 5 : 3;

  const spinPoolMaps = val.getSpinPoolMaps();
  const [activeSpinPool, setActiveSpinPool] = useState<ValorantMap[]>(spinPoolMaps);
  const activeSpinMetaRef = useRef<{ mapId: string; mapNumber: number; isRespin: boolean } | null>(null);

  // Giữ nguyên vòng quay vừa trúng để kim dừng đúng map kết quả, chỉ cập nhật lại pool khi quay lượt tiếp hoặc Undo/Reset
  useEffect(() => {
    if (!val.lastWinnerMapId) {
      setWinnerBannerMap(null);
    }
  }, [val.lastWinnerMapId]);

  const wheelDisplayMaps =
    (val.isSpinning || (Boolean(val.lastWinnerMapId) && Boolean(winnerBannerMap))) &&
    activeSpinPool.length > 0
      ? activeSpinPool
      : spinPoolMaps;

  const triggerSingleSpin = useCallback(
    (isRespin = false) => {
      if (val.isSpinning) return;
      if (!isRespin && val.spinResults.length >= targetSpinCount) return;

      const prep = val.prepareSpin(isRespin);
      if (!prep) return;

      setWinnerBannerMap(null);
      setActiveSpinPool(prep.poolMaps);
      activeSpinMetaRef.current = {
        mapId: prep.targetMapId,
        mapNumber: prep.mapNumber,
        isRespin,
      };

      // Gửi tín hiệu quay + kết quả đã tính trước sang Overlay
      send('val-spin-start', {
        targetMapId: prep.targetMapId,
        poolMaps: prep.poolMaps,
        duration: val.spinConfig.duration,
        style: val.spinConfig.style,
        mapNumber: prep.mapNumber,
        isRespin,
        triggeredAt: Date.now(),
      });
    },
    [val, targetSpinCount, send]
  );

  const handleSpinFinish = useCallback(() => {
    const meta = activeSpinMetaRef.current;
    if (!meta) return;
    val.completeSpin(meta.mapId, meta.mapNumber, meta.isRespin);
    if (settings.soundEnabled) playFanfare();

    const wonMap = val.maps.find((m) => m.id === meta.mapId) || null;
    setWinnerBannerMap(wonMap);
    activeSpinMetaRef.current = null;

    // Nếu đang ở chế độ Quay tất cả và chưa đủ số map theo Bo
    if (autoSpinQueueRef.current) {
      const nextCount = meta.isRespin
        ? val.spinResults.length
        : val.spinResults.length + 1;
      if (nextCount < targetSpinCount) {
        setTimeout(() => {
          if (autoSpinQueueRef.current) {
            triggerSingleSpin(false);
          }
        }, 1600);
      } else {
        autoSpinQueueRef.current = false;
        setAutoSpinningAll(false);
      }
    }
  }, [val, settings.soundEnabled, playFanfare, targetSpinCount, triggerSingleSpin]);

  const handleSpinAll = () => {
    if (val.isSpinning || val.spinResults.length >= targetSpinCount) return;
    autoSpinQueueRef.current = true;
    setAutoSpinningAll(true);
    triggerSingleSpin(false);
  };

  const handleStopAutoSpin = () => {
    autoSpinQueueRef.current = false;
    setAutoSpinningAll(false);
  };

  useKeyboard(
    useMemo(
      () => ({
        'ctrl+z': () => {
          if (val.mode === 'veto') val.vetoUndo();
          else val.undoSpin();
        },
        escape: () => {
          setShowMapPoolModal(false);
          setShowVetoOrderModal(false);
          setCoinFlipMode(null);
          setWinnerBannerMap(null);
        },
        space: () => {
          if (val.mode === 'spin' && !val.isSpinning) {
            triggerSingleSpin(false);
          }
        },
      }),
      [val, triggerSingleSpin]
    )
  );

  const overlayUrl = `${window.location.origin}/valorant/overlay?bg=${settings.overlayBg}`;
  const copyOverlayLink = () => {
    navigator.clipboard?.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMatch = async () => {
    await saveMatchRecord({
      game: 'valorant',
      tournament_name: settings.tournamentName,
      round_name: settings.roundName,
      mode: val.mode,
      team_a: settings.teamA,
      team_b: settings.teamB,
      result:
        val.mode === 'veto'
          ? { boType: val.boType, vetoHistory: val.vetoHistory }
          : {
              boType: val.spinConfig.boType,
              spinResults: val.spinResults,
              spinAuditLog: val.spinAuditLog,
              preSpinBans: val.preSpinBans,
            },
    });
    setSaveNotice('✓ Đã lưu trận');
    setTimeout(() => setSaveNotice(null), 2500);
  };

  // Trình tự veto thủ công
  const [vetoOrderText, setVetoOrderText] = useState('');
  const openVetoOrderModal = () => {
    setVetoOrderText(
      val.vetoPhases.map((p) => `${p.action.toUpperCase()}:${p.team}`).join(', ')
    );
    setShowVetoOrderModal(true);
  };
  const applyVetoOrder = () => {
    const tokens = vetoOrderText
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const parsed: VetoPhase[] = [];
    for (const t of tokens) {
      const [act, tm] = t.split(':');
      const low = act?.toLowerCase();
      if (
        (low === 'ban' || low === 'pick' || low === 'side' || low === 'decider') &&
        (tm === 'A' || tm === 'B')
      ) {
        parsed.push({ action: low, team: tm });
      }
    }
    if (parsed.length > 0) {
      val.setCustomVetoPhases(parsed);
      setShowVetoOrderModal(false);
    } else {
      alert('Sai cú pháp! VD: BAN:A, BAN:B, PICK:A, SIDE:B, DECIDER:A');
    }
  };

  // Lượt ban trước khi quay (chế độ lai)
  const totalPreBansRequired = val.spinConfig.bansPerTeam * 2;
  const preBanFinished =
    !val.spinConfig.banBeforeSpin ||
    val.preSpinBans.length >= totalPreBansRequired;
  const nextPreBanTeam: TeamSide =
    val.preSpinBans.length % 2 === 0 ? 'A' : 'B';

  return (
    <div className="min-h-screen bg-[#0b1017] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f1923]/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
          >
            ← Trang chủ
          </Link>
          <h1 className="font-display font-black text-lg tracking-wider text-[#ff4655]">
            VALORANT BAN/PICK &amp; QUAY MAP
          </h1>
        </div>

        {/* Chuyển Tab VETO | QUAY MAP */}
        <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => val.setMode('veto')}
            className={`px-4 py-1.5 rounded-lg font-display font-bold text-xs tracking-wider transition ${
              val.mode === 'veto'
                ? 'bg-[#ff4655] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🛡️ CHẾ ĐỘ VETO
          </button>
          <button
            type="button"
            onClick={() => val.setMode('spin')}
            className={`px-4 py-1.5 rounded-lg font-display font-bold text-xs tracking-wider transition ${
              val.mode === 'spin'
                ? 'bg-gradient-to-r from-[#ff4655] to-amber-500 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎰 QUAY MAP
          </button>
        </div>

        {/* Overlay & Copy */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={settings.overlayBg}
            onChange={(e) =>
              settings.setOverlayBg(e.target.value as 'transparent' | 'chroma' | 'dark')
            }
            className="bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-gray-200"
          >
            <option value="transparent">Nền trong suốt</option>
            <option value="chroma">Nền xanh lá (Chroma)</option>
            <option value="dark">Nền tối</option>
          </select>

          <button
            type="button"
            onClick={() => window.open(overlayUrl, '_blank')}
            className="px-3 py-1.5 rounded-lg bg-[#ff4655] hover:bg-rose-500 text-xs font-display font-bold"
          >
            📺 Mở Overlay
          </button>

          <button
            type="button"
            onClick={copyOverlayLink}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            {copied ? '✓ Đã copy' : '📋 Copy link'}
          </button>

          <button
            type="button"
            onClick={handleSaveMatch}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
          >
            {saveNotice || '💾 Lưu trận'}
          </button>

          <Link
            to="/matches"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            Lịch sử
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sidebar cấu hình chung */}
        <aside className="lg:col-span-3 space-y-3">
          {/* Giải đấu + vòng đấu */}
          <div className="glass rounded-xl p-3 space-y-2">
            <div className="text-xs font-display font-bold uppercase tracking-wider text-gray-400">
              Thông tin giải đấu
            </div>
            <input
              type="text"
              value={settings.tournamentName}
              onChange={(e) => settings.setTournament(e.target.value)}
              placeholder="Tên giải đấu"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            />
            <input
              type="text"
              value={settings.roundName}
              onChange={(e) => settings.setRound(e.target.value)}
              placeholder="Vòng đấu (VD: Bán kết - Bo3)"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            />
          </div>

          <TeamSetup team="A" />
          <TeamSetup team="B" />

          {/* Thể thức & Map Pool */}
          <div className="glass rounded-xl p-3 space-y-3">
            <div>
              <div className="text-xs font-display font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Thể thức thi đấu
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['bo1', 'bo3', 'bo5'] as BoType[]).map((bo) => (
                  <button
                    key={bo}
                    type="button"
                    onClick={() => val.setBoType(bo)}
                    className={`py-1.5 rounded-lg text-xs font-display font-bold uppercase border ${
                      val.boType === bo
                        ? 'bg-[#ff4655] border-[#ff4655] text-white'
                        : 'bg-black/40 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {bo}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowMapPoolModal(true)}
                className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                🗺️ Cấu hình Map Pool ({val.maps.filter((m) => m.enabled).length}/{val.maps.length})
              </button>

              {val.mode === 'veto' && (
                <button
                  type="button"
                  onClick={openVetoOrderModal}
                  className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                >
                  ✏️ Sửa trình tự Veto thủ công
                </button>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCoinFlipMode('team')}
                  className="py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-semibold"
                >
                  🪙 Quay chọn đội
                </button>
                <button
                  type="button"
                  onClick={() => setCoinFlipMode('side')}
                  className="py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-semibold"
                >
                  ⚔️ Quay chọn bên
                </button>
              </div>
            </div>
          </div>

          {/* Tiện ích chung */}
          <div className="glass rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                settings.swapTeams();
                val.swapVetoTeams();
              }}
              className="py-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold"
            >
              ⇄ Đổi bên A/B
            </button>
            <button
              type="button"
              onClick={settings.toggleSound}
              className={`py-2 rounded-lg font-semibold ${
                settings.soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-white/5 text-gray-400'
              }`}
            >
              🔊 Âm thanh: {settings.soundEnabled ? 'BẬT' : 'TẮT'}
            </button>
          </div>
        </aside>

        {/* Khu vực làm việc chính */}
        <section className="lg:col-span-9 space-y-4">
          {val.mode === 'veto' ? (
            <VetoPanel />
          ) : (
            <div className="space-y-4">
              {/* Cấu hình Quay Map */}
              <div className="glass rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kiểu hiệu ứng quay */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                      Kiểu hiệu ứng quay trên Overlay
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'wheel', label: '🎡 Vòng quay' },
                          { id: 'slot', label: '🎰 Cuộn dọc' },
                          { id: 'card', label: '🃏 Lật thẻ' },
                        ] as Array<{ id: SpinStyle; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => val.setSpinConfig({ style: opt.id })}
                          className={`py-2 px-1 rounded-lg text-xs font-bold border ${
                            val.spinConfig.style === opt.id
                              ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                              : 'border-white/10 bg-black/40 text-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nhóm map quay */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                      Quay trong nhóm map
                    </label>
                    <select
                      value={val.spinConfig.spinPool}
                      onChange={(e) =>
                        val.setSpinConfig({
                          spinPool: e.target.value as 'all' | 'remaining' | 'custom',
                        })
                      }
                      className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      <option value="all">Toàn bộ Map Pool đang bật</option>
                      <option value="remaining">Chỉ các map chưa bị ban ở Veto</option>
                      <option value="custom">Chọn tay một nhóm map</option>
                    </select>
                  </div>

                  {/* Thời gian quay */}
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">
                      Thời gian quay: <strong className="text-white">{val.spinConfig.duration}s</strong>
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={10}
                      step={1}
                      value={val.spinConfig.duration}
                      onChange={(e) =>
                        val.setSpinConfig({ duration: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Các tùy chọn toggle */}
                <div className="flex flex-wrap gap-4 text-xs pt-1 border-t border-white/10">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val.spinConfig.excludePicked}
                      onChange={(e) =>
                        val.setSpinConfig({ excludePicked: e.target.checked })
                      }
                    />
                    <span>Loại trừ map đã trúng ở lần quay trước</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val.spinConfig.banBeforeSpin}
                      onChange={(e) =>
                        val.setSpinConfig({ banBeforeSpin: e.target.checked })
                      }
                    />
                    <span>Chế độ lai: Ban trước rồi quay</span>
                  </label>

                  {val.spinConfig.banBeforeSpin && (
                    <div className="flex items-center gap-1.5">
                      <span>Mỗi đội ban:</span>
                      <input
                        type="number"
                        min={1}
                        max={3}
                        value={val.spinConfig.bansPerTeam}
                        onChange={(e) =>
                          val.setSpinConfig({
                            bansPerTeam: Math.max(1, Math.min(3, Number(e.target.value))),
                          })
                        }
                        className="w-12 bg-black/50 border border-white/15 rounded px-1.5 py-0.5 text-center"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={val.spinConfig.allowRespin}
                      onChange={(e) =>
                        val.setSpinConfig({ allowRespin: e.target.checked })
                      }
                    />
                    <span className="text-amber-300">Bật quyền Quay lại (Re-spin)</span>
                  </label>
                </div>

                {/* Nếu chọn tay nhóm map */}
                {val.spinConfig.spinPool === 'custom' && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs text-gray-400 mb-2">
                      Chọn các map đưa vào vòng quay:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {val.maps.map((m) => {
                        const checked = val.spinConfig.customPool.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => val.toggleCustomPoolMap(m.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              checked
                                ? 'bg-[#ff4655]/25 border-[#ff4655] text-white'
                                : 'bg-black/40 border-white/10 text-gray-400'
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chế độ lai: Ban trước khi quay */}
                {val.spinConfig.banBeforeSpin && (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>
                        {preBanFinished ? (
                          <strong className="text-emerald-400">
                            ✓ Đã ban đủ {totalPreBansRequired} map — Sẵn sàng quay trong{' '}
                            {spinPoolMaps.length} map còn lại!
                          </strong>
                        ) : (
                          <span>
                            Đội{' '}
                            <strong
                              style={{
                                color:
                                  nextPreBanTeam === 'A'
                                    ? settings.teamA.color
                                    : settings.teamB.color,
                              }}
                            >
                              {nextPreBanTeam === 'A'
                                ? settings.teamA.name
                                : settings.teamB.name}
                            </strong>{' '}
                            chọn map để BAN ({val.preSpinBans.length}/{totalPreBansRequired})
                          </span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={val.undoPreSpinBan}
                          disabled={val.preSpinBans.length === 0}
                          className="px-2 py-1 rounded bg-white/10 text-[11px] disabled:opacity-40"
                        >
                          Undo ban
                        </button>
                        <button
                          type="button"
                          onClick={val.clearPreSpinBans}
                          className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-[11px]"
                        >
                          Xóa ban
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {val.maps
                        .filter((m) => m.enabled)
                        .map((m) => {
                          const banned = val.preSpinBans.find((b) => b.mapId === m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={Boolean(banned) || preBanFinished}
                              onClick={() => val.addPreSpinBan(m.id, nextPreBanTeam)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                banned
                                  ? 'bg-red-950/60 border-red-500/40 text-red-400 line-through'
                                  : 'bg-black/40 border-white/15 hover:border-[#ff4655]'
                              }`}
                            >
                              {m.name} {banned ? `(Ban ${banned.team})` : ''}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Khu vực Sân khấu Quay Map */}
              <div className="glass rounded-2xl p-5 flex flex-col items-center gap-5 relative overflow-hidden">
                <div className="w-full flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-display font-bold uppercase tracking-widest text-gray-400">
                    Đang quay: {val.spinResults.length}/{targetSpinCount} Map ({val.spinConfig.boType.toUpperCase()}) • Pool hiện có {spinPoolMaps.length} map
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        val.isSpinning ||
                        !preBanFinished ||
                        val.spinResults.length >= targetSpinCount ||
                        spinPoolMaps.length === 0
                      }
                      onClick={() => triggerSingleSpin(false)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#ff4655] to-amber-500 hover:from-rose-500 hover:to-amber-400 font-display font-black text-xs tracking-wider shadow-lg disabled:opacity-40"
                    >
                      🎰 QUAY MAP {Math.min(val.spinResults.length + 1, targetSpinCount)} (Space)
                    </button>

                    {autoSpinningAll ? (
                      <button
                        type="button"
                        onClick={handleStopAutoSpin}
                        className="px-4 py-2 rounded-xl bg-red-600 text-xs font-bold"
                      >
                        ⏹ Dừng quay tự động
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          val.isSpinning ||
                          !preBanFinished ||
                          val.spinResults.length >= targetSpinCount
                        }
                        onClick={handleSpinAll}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold disabled:opacity-40"
                      >
                        ⚡ Quay tất cả
                      </button>
                    )}

                    {val.spinConfig.allowRespin && val.spinResults.length > 0 && (
                      <button
                        type="button"
                        disabled={val.isSpinning}
                        onClick={() => triggerSingleSpin(true)}
                        className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-300 text-xs font-bold"
                      >
                        🔁 Quay lại (Re-spin)
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={val.isSpinning || val.spinResults.length === 0}
                      onClick={val.undoSpin}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold disabled:opacity-40"
                    >
                      ↩ Undo
                    </button>
                    <button
                      type="button"
                      disabled={val.isSpinning}
                      onClick={val.resetSpin}
                      className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>

                {/* Component hiệu ứng quay */}
                <div className="py-2 w-full flex justify-center">
                  {val.spinConfig.style === 'wheel' && (
                    <SpinWheel
                      maps={wheelDisplayMaps}
                      targetMapId={val.currentSpinTargetId}
                      isSpinning={val.isSpinning}
                      duration={val.spinConfig.duration}
                      triggerId={val.spinTriggerId}
                      onTick={() => settings.soundEnabled && playTick()}
                      onFinish={handleSpinFinish}
                      size={360}
                    />
                  )}
                  {val.spinConfig.style === 'slot' && (
                    <SlotMachine
                      maps={wheelDisplayMaps}
                      targetMapId={val.currentSpinTargetId}
                      isSpinning={val.isSpinning}
                      duration={val.spinConfig.duration}
                      triggerId={val.spinTriggerId}
                      onTick={() => settings.soundEnabled && playTick()}
                      onFinish={handleSpinFinish}
                      itemHeight={110}
                      width={420}
                    />
                  )}
                  {val.spinConfig.style === 'card' && (
                    <CardFlip
                      maps={wheelDisplayMaps}
                      targetMapId={val.currentSpinTargetId}
                      isSpinning={val.isSpinning}
                      duration={val.spinConfig.duration}
                      triggerId={val.spinTriggerId}
                      onTick={() => settings.soundEnabled && playTick()}
                      onFinish={handleSpinFinish}
                    />
                  )}
                </div>

                {/* Banner map trúng lớn */}
                <AnimatePresence>
                  {winnerBannerMap && !val.isSpinning && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#ff4655]/30 via-amber-500/20 to-[#ff4655]/30 border border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                    >
                      <img
                        src={winnerBannerMap.localSplash || winnerBannerMap.splash}
                        alt={winnerBannerMap.name}
                        className="w-24 h-14 object-cover rounded-lg border border-white/20"
                      />
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-amber-300 font-bold">
                          🎉 KẾT QUẢ VỪA QUAY
                        </div>
                        <div className="text-2xl font-display font-black uppercase text-white">
                          {winnerBannerMap.name}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Kết quả các map đã quay + Gán bên Attack/Defense */}
              <div className="glass rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-display font-bold uppercase tracking-widest text-amber-300">
                  Tổng kết kết quả quay ({val.spinResults.length}/{targetSpinCount})
                </h3>
                <SpinResultDisplay
                  results={val.spinResults}
                  maps={val.maps}
                  teamA={settings.teamA}
                  teamB={settings.teamB}
                />

                {val.spinResults.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="text-[11px] text-gray-400">
                      Gán bên khởi đầu (Attack / Defense) cho từng map đã quay:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {val.spinResults.map((res) => {
                        const m = val.maps.find((x) => x.id === res.mapId);
                        return (
                          <div
                            key={res.mapNumber}
                            className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs"
                          >
                            <span className="font-bold text-amber-300">
                              M{res.mapNumber} ({m?.name}):
                            </span>
                            <select
                              value={res.side?.team || 'A'}
                              onChange={(e) =>
                                val.setSpinResultSide(
                                  res.mapNumber,
                                  e.target.value as TeamSide,
                                  res.side?.side || 'attack'
                                )
                              }
                              className="bg-black/60 border border-white/15 rounded px-1 py-0.5 text-[11px]"
                            >
                              <option value="A">{settings.teamA.name}</option>
                              <option value="B">{settings.teamB.name}</option>
                            </select>
                            <select
                              value={res.side?.side || ''}
                              onChange={(e) =>
                                val.setSpinResultSide(
                                  res.mapNumber,
                                  res.side?.team || 'A',
                                  (e.target.value || null) as MapSide
                                )
                              }
                              className="bg-black/60 border border-white/15 rounded px-1 py-0.5 text-[11px]"
                            >
                              <option value="">-- Bên --</option>
                              <option value="attack">Attack</option>
                              <option value="defense">Defense</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lịch sử minh bạch */}
                {val.spinAuditLog.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] font-semibold text-gray-400 mb-1">
                      Lịch sử các lần quay (minh bạch):
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-gray-300">
                      {val.spinAuditLog.map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <span>
                            • MAP {item.mapNumber}: <strong>{item.mapName}</strong>{' '}
                            {item.isRespin && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[10px]">
                                Re-spin
                              </span>
                            )}
                          </span>
                          <span className="text-gray-500 text-[11px]">
                            {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal Map Pool */}
      {showMapPoolModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1923] border border-white/20 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#ff4655]">
                Cấu hình Map Pool Valorant
              </h3>
              <button
                type="button"
                onClick={() => setShowMapPoolModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Bật hoặc tắt các map dùng trong giải đấu.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto">
              {val.maps.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => val.toggleMap(m.id)}
                  className={`relative rounded-xl overflow-hidden border-2 h-20 text-left transition ${
                    m.enabled
                      ? 'border-[#ff4655] opacity-100'
                      : 'border-white/10 opacity-45 grayscale'
                  }`}
                >
                  <img
                    src={m.localSplash || m.splash}
                    alt={m.name}
                    onError={(e) => {
                      if (m.splash) e.currentTarget.src = m.splash;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                    <span className="font-display font-bold text-xs text-white">
                      {m.name}
                    </span>
                    <span className="text-xs">{m.enabled ? '✓' : '✕'}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowMapPoolModal(false)}
                className="px-4 py-2 rounded-lg bg-[#ff4655] font-bold text-xs"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sửa trình tự Veto */}
      {showVetoOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1923] border border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-[#ff4655]">
              Chỉnh trình tự Veto thủ công
            </h3>
            <p className="text-xs text-gray-400">
              Cú pháp: BAN:A, BAN:B, PICK:A, SIDE:B, DECIDER:A (cách nhau bởi dấu phẩy).
            </p>
            <textarea
              rows={4}
              value={vetoOrderText}
              onChange={(e) => setVetoOrderText(e.target.value)}
              className="w-full bg-black/50 border border-white/15 rounded-lg p-3 text-xs font-mono text-gray-200"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVetoOrderModal(false)}
                className="px-4 py-2 rounded-lg bg-white/10 text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyVetoOrder}
                className="px-4 py-2 rounded-lg bg-[#ff4655] text-xs font-bold"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tung đồng xu */}
      {coinFlipMode && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <CoinFlip
            title={
              coinFlipMode === 'team'
                ? 'QUAY CHỌN ĐỘI ĐI TRƯỚC'
                : 'QUAY CHỌN BÊN (ATTACK / DEFENSE)'
            }
            leftLabel={coinFlipMode === 'team' ? settings.teamA.name : '⚔️ ATTACK'}
            rightLabel={coinFlipMode === 'team' ? settings.teamB.name : '🛡️ DEFENSE'}
            leftColor={coinFlipMode === 'team' ? settings.teamA.color : '#ff4655'}
            rightColor={coinFlipMode === 'team' ? settings.teamB.color : '#22d3ee'}
            onClose={() => setCoinFlipMode(null)}
          />
        </div>
      )}
    </div>
  );
}
