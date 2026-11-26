import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroGrid from '../../components/lq/HeroGrid';
import BanPickDisplay from '../../components/lq/BanPickDisplay';
import TeamSetup from '../../components/common/TeamSetup';
import MatchReportModal from '../../components/common/MatchReportModal';
import { buildLQReportInitial, type MatchReportData } from '../../utils/matchReport';
import { useLQStore } from '../../stores/lqStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useBroadcast } from '../../hooks/useBroadcast';
import { useTimer } from '../../hooks/useTimer';
import { useAudio } from '../../hooks/useAudio';
import { useKeyboard } from '../../hooks/useKeyboard';
import { saveMatchRecord } from '../../lib/api';
import { LQ_3BAN_PHASES, LQ_4BAN_PHASES, LQ_DEFAULT_PHASES } from '../../data/defaults';
import type { BPPhase } from '../../types';

/**
 * Trang điều khiển Ban/Pick Liên Quân Mobile dành cho Admin / Caster
 */
export default function LQControl() {
  const lq = useLQStore();
  const settings = useSettingsStore();
  const { send, subscribe } = useBroadcast('lq-channel');
  const { playBan, playPick, playWarning } = useAudio();

  const [showSettings, setShowSettings] = useState(false);
  const [reportData, setReportData] = useState<MatchReportData | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [expiredAlert, setExpiredAlert] = useState(false);

  // Tải cấu hình & dữ liệu tướng khi mở trang
  useEffect(() => {
    settings.hydrate();
    lq.hydrate();
  }, []);

  // Tách danh sách ID đã ban và đã pick để HeroGrid hiển thị đúng icon
  const { bannedIds, pickedIds } = useMemo(() => {
    const b = new Set<string>();
    const p = new Set<string>();
    lq.bansA.forEach((s) => s.heroId && b.add(s.heroId));
    lq.bansB.forEach((s) => s.heroId && b.add(s.heroId));
    lq.picksA.forEach((s) => s.heroId && p.add(s.heroId));
    lq.picksB.forEach((s) => s.heroId && p.add(s.heroId));
    return { bannedIds: b, pickedIds: p };
  }, [lq.bansA, lq.bansB, lq.picksA, lq.picksB]);

  const currentPhase = lq.getCurrentPhase();
  const currentSlotIndex = lq.getCurrentSlotIndex();

  const handleTimerExpire = useCallback(() => {
    if (settings.soundEnabled) playWarning();
    if (lq.timerAutoSkip && !lq.isComplete) {
      lq.skipPhase();
    } else {
      setExpiredAlert(true);
    }
  }, [settings.soundEnabled, lq.timerAutoSkip, lq.isComplete]);

  const timer = useTimer(lq.timerMax, handleTimerExpire);

  // Tạo payload đồng bộ sang Overlay (bỏ danh sách 130 tướng khỏi payload để nhẹ ~1.5KB và gửi kèm selectedHeroId đang chọn)
  const buildSyncPayload = useCallback(
    () => ({
      bansA: lq.bansA,
      bansB: lq.bansB,
      picksA: lq.picksA,
      picksB: lq.picksB,
      phases: lq.phases,
      currentPhaseIndex: lq.currentPhaseIndex,
      selectedHeroId: lq.selectedHeroId,
      heroesVersion: lq.heroesVersion,
      isComplete: lq.isComplete,
      teamA: settings.teamA,
      teamB: settings.teamB,
      tournamentName: settings.tournamentName,
      roundName: settings.roundName,
      timerSeconds: timer.pausedSeconds,
      timerMax: lq.timerMax,
      timerRunning: timer.running,
      timerDeadline: timer.deadline,
      timerEnabled: settings.timerEnabled,
      overlayBg: settings.overlayBg,
    }),
    [
      lq.bansA,
      lq.bansB,
      lq.picksA,
      lq.picksB,
      lq.phases,
      lq.currentPhaseIndex,
      lq.selectedHeroId,
      lq.heroesVersion,
      lq.isComplete,
      lq.timerMax,
      settings.teamA,
      settings.teamB,
      settings.tournamentName,
      settings.roundName,
      settings.timerEnabled,
      settings.overlayBg,
      timer.pausedSeconds,
      timer.running,
      timer.deadline,
    ]
  );

  // Tự động broadcast mỗi khi state thay đổi
  useEffect(() => {
    send('lq-sync', buildSyncPayload());
  }, [send, buildSyncPayload]);

  // Trả lời khi Overlay mới mở gửi request-sync
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'request-sync') {
        send('lq-sync', buildSyncPayload());
      }
    });
  }, [subscribe, send, buildSyncPayload]);

  // Khi chuyển lượt thì reset đồng hồ
  useEffect(() => {
    setExpiredAlert(false);
    timer.reset(lq.timerMax);
    if (settings.timerEnabled && !lq.isComplete && lq.history.length > 0) {
      timer.start();
    }
  }, [lq.currentPhaseIndex, lq.timerMax, lq.isComplete]);

  const handleConfirm = useCallback(() => {
    const res = lq.confirmPick();
    if (!res) return;
    if (settings.soundEnabled) {
      if (res.action === 'ban') playBan();
      else playPick();
    }
  }, [lq, settings.soundEnabled, playBan, playPick]);

  const handleUndo = useCallback(() => {
    lq.undo();
  }, [lq]);

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại toàn bộ Ban/Pick hiện tại?')) {
      lq.reset();
      timer.reset(lq.timerMax);
    }
  };

  const handleSwapTeams = () => {
    settings.swapTeams();
    lq.swapSidesSlots();
  };

  useKeyboard(
    useMemo(
      () => ({
        'ctrl+z': () => {
          if (!reportData) handleUndo();
        },
        escape: () => {
          if (reportData) setReportData(null);
          else lq.selectHero(null);
        },
      }),
      [handleUndo, lq, reportData]
    )
  );

  const overlayUrl = `${window.location.origin}/lq/overlay?bg=${settings.overlayBg}`;

  const copyOverlayLink = () => {
    navigator.clipboard?.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMatch = async () => {
    await saveMatchRecord({
      game: 'lq',
      tournament_name: settings.tournamentName,
      round_name: settings.roundName,
      mode: 'banpick',
      team_a: settings.teamA,
      team_b: settings.teamB,
      result: {
        bansA: lq.bansA,
        bansB: lq.bansB,
        picksA: lq.picksA,
        picksB: lq.picksB,
      },
    });
    setSaveNotice('✓ Đã lưu trận');
    setTimeout(() => setSaveNotice(null), 2500);
  };

  const selectedHero = lq.heroes.find((h) => h.id === lq.selectedHeroId);
  const banCountPerTeam = lq.phases.filter((p) => p.action === 'ban' && p.team === 'A').length;

  // Chỉnh chuỗi phases thủ công dạng: B:A, B:B, P:A...
  const [customPhaseText, setCustomPhaseText] = useState('');
  const openSettings = () => {
    setCustomPhaseText(
      lq.phases.map((p) => `${p.action === 'ban' ? 'B' : 'P'}:${p.team}`).join(', ')
    );
    setShowSettings(true);
  };

  const applyCustomPhases = () => {
    const tokens = customPhaseText
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const parsed: BPPhase[] = [];
    for (const t of tokens) {
      const [act, tm] = t.split(':');
      if ((act === 'B' || act === 'P') && (tm === 'A' || tm === 'B')) {
        parsed.push({ action: act === 'B' ? 'ban' : 'pick', team: tm });
      }
    }
    if (parsed.length > 0) {
      lq.setPhases(parsed);
      setShowSettings(false);
    } else {
      alert('Định dạng không hợp lệ! Ví dụ: B:A, B:B, P:A, P:B');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-[#0a1020]/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
          >
            ← Trang chủ
          </Link>
          <h1 className="font-display font-black text-lg tracking-wider bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
            LIÊN QUÂN BAN/PICK
          </h1>
          <Link
            to="/lq/admin"
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25"
          >
            ⚙️ Quản trị tướng
          </Link>
        </div>

        {/* Tên giải + vòng đấu */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={settings.tournamentName}
            onChange={(e) => settings.setTournament(e.target.value)}
            placeholder="Tên giải đấu"
            className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold w-40 focus:outline-none focus:border-blue-400"
          />
          <input
            type="text"
            value={settings.roundName}
            onChange={(e) => settings.setRound(e.target.value)}
            placeholder="Vòng đấu (VD: Bán kết)"
            className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-semibold w-36 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Nút Overlay & Cài đặt */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={settings.overlayBg}
            onChange={(e) =>
              settings.setOverlayBg(e.target.value as 'transparent' | 'chroma' | 'dark')
            }
            className="bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-gray-200"
            title="Nền Overlay OBS"
          >
            <option value="transparent">Nền trong suốt</option>
            <option value="chroma">Nền xanh lá (Chroma)</option>
            <option value="dark">Nền tối</option>
          </select>

          <button
            type="button"
            onClick={() => window.open(overlayUrl, '_blank')}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-display font-bold tracking-wide"
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
            onClick={openSettings}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-semibold"
          >
            ⚙️ Cài đặt luồng
          </button>

          <button
            type="button"
            onClick={handleSaveMatch}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
          >
            {saveNotice || '💾 Lưu trận'}
          </button>

          <button
            type="button"
            onClick={() =>
              setReportData(
                buildLQReportInitial({
                  bansA: lq.bansA,
                  bansB: lq.bansB,
                  picksA: lq.picksA,
                  picksB: lq.picksB,
                  phases: lq.phases,
                  heroes: lq.heroes,
                  teamA: settings.teamA,
                  teamB: settings.teamB,
                  roundName: settings.roundName,
                })
              )
            }
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold"
          >
            📄 Xuất biên bản
          </button>

          <Link
            to="/matches"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            Lịch sử
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto flex flex-col gap-4">
        {/* Hàng trên: Thiết lập 2 đội + Đồng hồ & Thao tác lượt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-4 flex flex-col gap-2">
            <TeamSetup team="A" />
            <div className="grid grid-cols-5 gap-1.5">
              {lq.picksA.map((slot, idx) => (
                <input
                  key={`pa-${idx}`}
                  type="text"
                  value={slot.playerName}
                  onChange={(e) => lq.setPlayerName('A', idx, e.target.value)}
                  placeholder={`P${idx + 1} A`}
                  className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
                />
              ))}
            </div>
          </div>

          {/* Trung tâm điều khiển lượt */}
          <div className="lg:col-span-4 glass rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-gray-400">
                  Lượt {Math.min(lq.currentPhaseIndex + 1, lq.phases.length)} / {lq.phases.length}
                </div>
                {lq.isComplete ? (
                  <div className="text-lg font-display font-black text-amber-400">
                    HOÀN TẤT BAN/PICK
                  </div>
                ) : currentPhase ? (
                  <div className="text-base font-display font-black flex items-center gap-2">
                    <span
                      style={{
                        color:
                          currentPhase.team === 'A'
                            ? settings.teamA.color
                            : settings.teamB.color,
                      }}
                    >
                      {currentPhase.team === 'A' ? settings.teamA.name : settings.teamB.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        currentPhase.action === 'ban'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {currentPhase.action === 'ban' ? 'ĐANG CẤM' : 'ĐANG CHỌN'}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Đồng hồ + nút Start/Pause */}
              {settings.timerEnabled && (
                <div className="flex items-center gap-2">
                  <span
                    className={`font-display font-black text-2xl w-10 text-center ${
                      timer.seconds <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
                    }`}
                  >
                    {timer.seconds}s
                  </span>
                  <button
                    type="button"
                    onClick={() => (timer.running ? timer.pause() : timer.start())}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                  >
                    {timer.running ? '⏸ Tạm dừng' : '▶ Chạy'}
                  </button>
                </div>
              )}
            </div>

            {expiredAlert && (
              <div className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-semibold text-center animate-pulse">
                ⏰ Đã hết thời gian lượt này! Hãy chọn tướng hoặc bấm Bỏ qua.
              </div>
            )}

            {/* Nút xác nhận chọn */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!lq.selectedHeroId || lq.isComplete}
                onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl font-display font-bold text-sm tracking-wider transition ${
                  lq.selectedHeroId && !lq.isComplete
                    ? currentPhase?.action === 'ban'
                      ? 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-600/30'
                      : 'bg-gradient-to-r from-blue-600 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
              >
                {selectedHero
                  ? `XÁC NHẬN ${currentPhase?.action === 'ban' ? 'CẤM' : 'CHỌN'}: ${selectedHero.name}`
                  : 'CHỌN TƯỚNG BÊN DƯỚI'}
              </button>

              <button
                type="button"
                disabled={lq.isComplete}
                onClick={lq.skipPhase}
                className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-gray-300 disabled:opacity-40"
              >
                Bỏ qua
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-2">
            <TeamSetup team="B" />
            <div className="grid grid-cols-5 gap-1.5">
              {lq.picksB.map((slot, idx) => (
                <input
                  key={`pb-${idx}`}
                  type="text"
                  value={slot.playerName}
                  onChange={(e) => lq.setPlayerName('B', idx, e.target.value)}
                  placeholder={`P${idx + 1} B`}
                  className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Xem trước Ban/Pick */}
        <BanPickDisplay
          bansA={lq.bansA}
          bansB={lq.bansB}
          picksA={lq.picksA}
          picksB={lq.picksB}
          heroes={lq.heroes}
          selectedHeroId={lq.selectedHeroId}
          teamA={settings.teamA}
          teamB={settings.teamB}
          currentPhase={currentPhase}
          currentSlotIndex={currentSlotIndex}
          tournamentName={settings.tournamentName}
          roundName={settings.roundName}
          timerSeconds={timer.seconds}
          timerMax={lq.timerMax}
          timerEnabled={settings.timerEnabled}
          isComplete={lq.isComplete}
        />

        {/* Lưới chọn tướng */}
        <HeroGrid
          heroes={lq.heroes}
          bannedIds={bannedIds}
          pickedIds={pickedIds}
          selectedHeroId={lq.selectedHeroId}
          onSelect={(id) => lq.selectHero(id === lq.selectedHeroId ? null : id)}
          disabled={lq.isComplete}
        />
      </main>

      {/* Footer điều khiển nhanh */}
      <footer className="border-t border-white/10 bg-[#0a1020] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={lq.history.length === 0}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 font-semibold"
          >
            ↩ Undo (Ctrl+Z)
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold"
          >
            🔄 Reset
          </button>
          <button
            type="button"
            onClick={handleSwapTeams}
            className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold"
          >
            ⇄ Đổi bên Trái/Phải
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={settings.toggleTimer}
            className={`px-3 py-1.5 rounded-lg font-semibold ${
              settings.timerEnabled
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            ⏱️ Đồng hồ: {settings.timerEnabled ? 'BẬT' : 'TẮT'}
          </button>
          <button
            type="button"
            onClick={settings.toggleSound}
            className={`px-3 py-1.5 rounded-lg font-semibold ${
              settings.soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            🔊 Âm thanh: {settings.soundEnabled ? 'BẬT' : 'TẮT'}
          </button>
        </div>
      </footer>

      {/* Modal Cài đặt luồng Ban/Pick & Timer */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-amber-300">
                Cài đặt Ban/Pick Liên Quân
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Chế độ mẫu (sẽ reset lượt hiện tại):
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      lq.setPhases(LQ_DEFAULT_PHASES);
                      setCustomPhaseText(
                        LQ_DEFAULT_PHASES.map(
                          (p) => `${p.action === 'ban' ? 'B' : 'P'}:${p.team}`
                        ).join(', ')
                      );
                    }}
                    className={`flex-1 py-2 rounded-lg font-semibold border ${
                      banCountPerTeam === 5
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    5 Ban / 5 Pick (Chuẩn)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      lq.setPhases(LQ_4BAN_PHASES);
                      setCustomPhaseText(
                        LQ_4BAN_PHASES.map(
                          (p) => `${p.action === 'ban' ? 'B' : 'P'}:${p.team}`
                        ).join(', ')
                      );
                    }}
                    className={`flex-1 py-2 rounded-lg font-semibold border ${
                      banCountPerTeam === 4
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    4 Ban / 5 Pick
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      lq.setPhases(LQ_3BAN_PHASES);
                      setCustomPhaseText(
                        LQ_3BAN_PHASES.map(
                          (p) => `${p.action === 'ban' ? 'B' : 'P'}:${p.team}`
                        ).join(', ')
                      );
                    }}
                    className={`flex-1 py-2 rounded-lg font-semibold border ${
                      banCountPerTeam === 3
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    3 Ban / 5 Pick
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Thời gian mỗi lượt (giây): {lq.timerMax}s
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={lq.timerMax}
                  onChange={(e) => lq.setTimerMax(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lq.timerAutoSkip}
                  onChange={(e) => lq.setTimerAutoSkip(e.target.checked)}
                />
                <span>Tự động bỏ qua lượt khi hết giờ (tắt = chỉ cảnh báo)</span>
              </label>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Tùy chỉnh thứ tự Ban/Pick (B: Ban, P: Pick; A/B: Đội):
                </label>
                <textarea
                  rows={3}
                  value={customPhaseText}
                  onChange={(e) => setCustomPhaseText(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-lg p-2 text-xs font-mono text-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={applyCustomPhases}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold"
              >
                Áp dụng thứ tự
              </button>
            </div>
          </div>
        </div>
      )}

      <MatchReportModal
        open={Boolean(reportData)}
        initialData={reportData}
        onClose={() => setReportData(null)}
      />
    </div>
  );
}
