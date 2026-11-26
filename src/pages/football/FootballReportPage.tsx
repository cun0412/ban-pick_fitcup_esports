import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CaptainFaceCapture from '../../components/football/CaptainFaceCapture';
import {
  deleteFootballReport,
  fetchFootballReports,
  saveFootballReport,
} from '../../lib/api';
import {
  createEmptyFootballPlayer,
  createInitialFootballReport,
  downloadFootballReportDoc,
  printFootballReportPdf,
  type FootballPlayerRow,
  type FootballReportData,
} from '../../utils/footballReport';

/**
 * Trang Biên bản trận đấu Bóng đá FIT CUP S3 (tách biệt hoàn toàn với phần Esports)
 * Hỗ trợ nhập đầy đủ biểu mẫu, chụp ảnh xác nhận Face ID 2 đội trưởng, lưu DB & xuất Word/PDF
 */
export default function FootballReportPage() {
  const [tab, setTab] = useState<'form' | 'saved'>('form');
  const [activeTeamTab, setActiveTeamTab] = useState<'A' | 'B'>('A');
  const [form, setForm] = useState<FootballReportData>(createInitialFootballReport);
  const [savedReports, setSavedReports] = useState<FootballReportData[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const loadSaved = async () => {
    setLoadingSaved(true);
    const res = await fetchFootballReports<FootballReportData>();
    setSavedReports(res.data);
    setLoadingSaved(false);
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const update = <K extends keyof FootballReportData>(
    key: K,
    val: FootballReportData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const updatePlayer = (
    side: 'A' | 'B',
    idx: number,
    patch: Partial<FootballPlayerRow>
  ) => {
    const key = side === 'A' ? 'playersA' : 'playersB';
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const updatePlayerGoal = (
    side: 'A' | 'B',
    idx: number,
    goalIdx: number,
    val: string
  ) => {
    const key = side === 'A' ? 'playersA' : 'playersB';
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((row, i) => {
        if (i !== idx) return row;
        const nextGoals = [...row.goals] as FootballPlayerRow['goals'];
        nextGoals[goalIdx] = val;
        return { ...row, goals: nextGoals };
      }),
    }));
  };

  const addPlayerRow = (side: 'A' | 'B') => {
    const key = side === 'A' ? 'playersA' : 'playersB';
    setForm((prev) => ({
      ...prev,
      [key]: [...prev[key], createEmptyFootballPlayer()],
    }));
  };

  const updateSub = (
    side: 'A' | 'B',
    idx: number,
    patch: { playerOut?: string; playerIn?: string; minute?: string }
  ) => {
    const key = side === 'A' ? 'subsA' : 'subsB';
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const updatePenalty = (
    side: 'A' | 'B',
    idx: number,
    patch: { shirtNumber?: string; result?: '' | 'O' | 'X' }
  ) => {
    const key = side === 'A' ? 'penaltiesA' : 'penaltiesB';
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };

  const handleSaveToDb = async () => {
    setSaving(true);
    const res = await saveFootballReport(form);
    setSaving(false);
    if (res.ok && res.report) {
      setForm(res.report);
      setSaveNotice('✓ Đã lưu biên bản & ảnh Face ID');
      await loadSaved();
    } else {
      setSaveNotice('⚠ Lưu thất bại, thử lại');
    }
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleDeleteSaved = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Xóa biên bản bóng đá này?')) return;
    await deleteFootballReport(id);
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
    if (form.id === id) {
      setForm((prev) => ({ ...prev, id: undefined }));
    }
  };

  const inputCls =
    'w-full bg-black/45 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400';

  const currentPlayers = activeTeamTab === 'A' ? form.playersA : form.playersB;

  return (
    <div className="min-h-screen bg-[#0b0d14] text-[#eef0f5] font-body flex flex-col">
      {/* Header */}
      <header className="border-b border-[rgba(238,240,245,0.08)] bg-[#0f131d]/95 backdrop-blur px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="h-9 px-3 rounded-lg bg-[#1a1e28] hover:bg-[#232836] border border-[rgba(238,240,245,0.1)] text-xs inline-flex items-center"
          >
            ← Trang chủ
          </Link>
          <div>
            <h1 className="font-display font-bold text-base md:text-lg tracking-wide text-emerald-300">
              ⚽ BIÊN BẢN TRẬN ĐẤU BÓNG ĐÁ · FIT CUP S3
            </h1>
          </div>
        </div>

        {/* Chuyển tab Lập biên bản / Đã lưu */}
        <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setTab('form')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'form'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📝 Lập biên bản
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('saved');
              loadSaved();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === 'saved'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🗂️ Đã lưu ({savedReports.length})
          </button>
        </div>

        {/* Các nút hành động */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(createInitialFootballReport());
              setTab('form');
            }}
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            🆕 Tạo mới
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveToDb}
            className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : saveNotice || '💾 Lưu Database'}
          </button>
          <button
            type="button"
            onClick={() => printFootballReportPdf(form)}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold"
          >
            🖨️ In / PDF
          </button>
          <button
            type="button"
            onClick={() => downloadFootballReportDoc(form)}
            className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold"
          >
            📝 Xuất Word (.doc)
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {tab === 'form' ? (
          <>
            {/* 1. Thông tin trận đấu & Tỷ số */}
            <section className="rounded-xl bg-[#11141c] border border-white/10 p-5 space-y-4">
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-300">
                1. Thông tin trận đấu &amp; Bàn thắng
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Mã trận</label>
                  <input
                    type="text"
                    value={form.matchCode}
                    onChange={(e) => update('matchCode', e.target.value)}
                    placeholder="VD: BD-01"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Bảng</label>
                  <input
                    type="text"
                    value={form.groupName}
                    onChange={(e) => update('groupName', e.target.value)}
                    placeholder="VD: A"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Sân thi đấu</label>
                  <input
                    type="text"
                    value={form.fieldNumber}
                    onChange={(e) => update('fieldNumber', e.target.value)}
                    placeholder="VD: 1"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Ngày giờ</label>
                  <input
                    type="text"
                    value={form.dateTime}
                    onChange={(e) => update('dateTime', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Tổng thời gian</label>
                  <input
                    type="text"
                    value={form.totalDuration}
                    onChange={(e) => update('totalDuration', e.target.value)}
                    placeholder="VD: 50 phút"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Tên 2 đội & Tỉ số H1 / H2 / LL / Chung cuộc */}
              <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-center pt-2 border-t border-white/10">
                {/* Đội A */}
                <div className="lg:col-span-5 rounded-xl bg-black/30 border border-blue-500/30 p-3 space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-blue-300 font-semibold mb-1">
                      Tên Đội 1 (Đội A)
                    </label>
                    <input
                      type="text"
                      value={form.teamAName}
                      onChange={(e) => update('teamAName', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bàn H1</label>
                      <input
                        type="text"
                        value={form.scoreA_H1}
                        onChange={(e) => update('scoreA_H1', e.target.value)}
                        className={`${inputCls} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bàn H2</label>
                      <input
                        type="text"
                        value={form.scoreA_H2}
                        onChange={(e) => update('scoreA_H2', e.target.value)}
                        className={`${inputCls} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bàn LL</label>
                      <input
                        type="text"
                        value={form.scoreA_LL}
                        onChange={(e) => update('scoreA_LL', e.target.value)}
                        className={`${inputCls} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-300 font-bold mb-1">
                        Chung cuộc
                      </label>
                      <input
                        type="text"
                        value={form.scoreA_Total}
                        onChange={(e) => update('scoreA_Total', e.target.value)}
                        className={`${inputCls} text-center font-bold border-amber-400/50`}
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 text-center font-display font-black text-gray-400">
                  VS
                </div>

                {/* Đội B */}
                <div className="lg:col-span-5 rounded-xl bg-black/30 border border-red-500/30 p-3 space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-red-300 font-semibold mb-1">
                      Tên Đội 2 (Đội B)
                    </label>
                    <input
                      type="text"
                      value={form.teamBName}
                      onChange={(e) => update('teamBName', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bàn H1</label>
                      <input
                        type="text"
                        value={form.scoreB_H1}
                        onChange={(e) => update('scoreB_H1', e.target.value)}
                        className={`${inputCls} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bàn H2</label>
                      <input
                        type="text"
                        value={form.scoreB_H2}
                        onChange={(e) => update('scoreB_H2', e.target.value)}
                        className={`${inputCls} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Bàn LL</label>
                      <input
                        type="text"
                        value={form.scoreB_LL}
                        onChange={(e) => update('scoreB_LL', e.target.value)}
                        className={`${inputCls} text-center`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-300 font-bold mb-1">
                        Chung cuộc
                      </label>
                      <input
                        type="text"
                        value={form.scoreB_Total}
                        onChange={(e) => update('scoreB_Total', e.target.value)}
                        className={`${inputCls} text-center font-bold border-amber-400/50`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Chụp ảnh xác nhận Face ID Đội trưởng */}
            <section className="rounded-xl bg-[#11141c] border border-emerald-500/30 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-300">
                    2. Chụp ảnh xác nhận Face ID Đội trưởng (Lưu cùng biên bản vào Database)
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Chụp trực tiếp bằng camera hoặc chọn ảnh để xác nhận danh tính đội trưởng trước khi thi đấu
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CaptainFaceCapture
                  sideLabel={`ĐỘI TRƯỞNG — ${form.teamAName}`}
                  accentColor="#3185FF"
                  captainName={form.captainAName}
                  verified={form.captainAFaceVerified}
                  imageDataUrl={form.captainAFaceImage}
                  capturedTime={form.captainAFaceTime}
                  onChangeName={(v) => update('captainAName', v)}
                  onChangeVerified={(v) => update('captainAFaceVerified', v)}
                  onCapturedImage={(img, timeStr) =>
                    setForm((prev) => ({
                      ...prev,
                      captainAFaceImage: img,
                      captainAFaceTime: timeStr,
                      captainAFaceVerified: true,
                    }))
                  }
                  onClearImage={() =>
                    setForm((prev) => ({
                      ...prev,
                      captainAFaceImage: '',
                      captainAFaceTime: '',
                      captainAFaceVerified: false,
                    }))
                  }
                />

                <CaptainFaceCapture
                  sideLabel={`ĐỘI TRƯỞNG — ${form.teamBName}`}
                  accentColor="#FF4057"
                  captainName={form.captainBName}
                  verified={form.captainBFaceVerified}
                  imageDataUrl={form.captainBFaceImage}
                  capturedTime={form.captainBFaceTime}
                  onChangeName={(v) => update('captainBName', v)}
                  onChangeVerified={(v) => update('captainBFaceVerified', v)}
                  onCapturedImage={(img, timeStr) =>
                    setForm((prev) => ({
                      ...prev,
                      captainBFaceImage: img,
                      captainBFaceTime: timeStr,
                      captainBFaceVerified: true,
                    }))
                  }
                  onClearImage={() =>
                    setForm((prev) => ({
                      ...prev,
                      captainBFaceImage: '',
                      captainBFaceTime: '',
                      captainBFaceVerified: false,
                    }))
                  }
                />
              </div>
            </section>

            {/* 3. Danh sách cầu thủ (TĐ, DB, Thẻ vàng 1/2, Thẻ đỏ, Bàn thắng 1..6) */}
            <section className="rounded-xl bg-[#11141c] border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-300">
                  3. Danh sách cầu thủ, Thẻ phạt &amp; Bàn thắng
                </h2>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTeamTab('A')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTeamTab === 'A'
                        ? 'bg-[#3185FF] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Đội A: {form.teamAName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTeamTab('B')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTeamTab === 'B'
                        ? 'bg-[#FF4057] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Đội B: {form.teamBName}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-black/40 text-gray-300 border-b border-white/10">
                      <th className="p-2 text-left w-16">Số áo</th>
                      <th className="p-2 text-left min-w-[180px]">Họ và tên</th>
                      <th className="p-2 text-center w-10" title="Thi đấu chính">
                        TĐ
                      </th>
                      <th className="p-2 text-center w-10" title="Dự bị">
                        DB
                      </th>
                      <th className="p-2 text-center w-14 text-amber-300">TV (1)</th>
                      <th className="p-2 text-center w-14 text-amber-400">TV (2)</th>
                      <th className="p-2 text-center w-14 text-red-400">Thẻ đỏ</th>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <th key={n} className="p-2 text-center w-12 text-emerald-300">
                          Bàn {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentPlayers.map((p, idx) => (
                      <tr
                        key={`${activeTeamTab}-${idx}`}
                        className="border-b border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="p-1">
                          <input
                            type="text"
                            value={p.shirtNumber}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                shirtNumber: e.target.value,
                              })
                            }
                            placeholder="#"
                            className={`${inputCls} text-center`}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={p.fullName}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                fullName: e.target.value,
                              })
                            }
                            placeholder={`Cầu thủ ${idx + 1}`}
                            className={inputCls}
                          />
                        </td>
                        <td className="p-1 text-center">
                          <input
                            type="checkbox"
                            checked={p.started}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                started: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="p-1 text-center">
                          <input
                            type="checkbox"
                            checked={p.sub}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                sub: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="p-1 text-center">
                          <input
                            type="checkbox"
                            checked={p.yellow1}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                yellow1: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="p-1 text-center">
                          <input
                            type="checkbox"
                            checked={p.yellow2}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                yellow2: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="p-1 text-center">
                          <input
                            type="checkbox"
                            checked={p.redCard}
                            onChange={(e) =>
                              updatePlayer(activeTeamTab, idx, {
                                redCard: e.target.checked,
                              })
                            }
                          />
                        </td>
                        {p.goals.map((gVal, gIdx) => (
                          <td key={gIdx} className="p-1">
                            <input
                              type="text"
                              value={gVal}
                              onChange={(e) =>
                                updatePlayerGoal(
                                  activeTeamTab,
                                  idx,
                                  gIdx,
                                  e.target.value
                                )
                              }
                              placeholder="phút"
                              className={`${inputCls} text-center px-1`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => addPlayerRow(activeTeamTab)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                + Thêm dòng cầu thủ ({activeTeamTab === 'A' ? form.teamAName : form.teamBName})
              </button>
            </section>

            {/* 4. Thay người, Lỗi tổng hợp, Hội ý & Đá luân lưu */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Thay người + Lỗi tổng hợp */}
              <section className="rounded-xl bg-[#11141c] border border-white/10 p-5 space-y-4">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-300">
                  4. Thay người, Lỗi tổng hợp &amp; Hội ý
                </h2>

                {(['A', 'B'] as const).map((side) => {
                  const subs = side === 'A' ? form.subsA : form.subsB;
                  const teamName = side === 'A' ? form.teamAName : form.teamBName;
                  const totalKey = side === 'A' ? 'subsTotalA' : 'subsTotalB';
                  const f1Key = side === 'A' ? 'foulsA_H1' : 'foulsB_H1';
                  const f2Key = side === 'A' ? 'foulsA_H2' : 'foulsB_H2';
                  const toKey = side === 'A' ? 'timeoutA' : 'timeoutB';

                  return (
                    <div
                      key={side}
                      className="rounded-lg bg-black/30 border border-white/10 p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">
                          Đội {side}: {teamName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-gray-400">Tổng thay:</span>
                          <input
                            type="text"
                            value={form[totalKey]}
                            onChange={(e) => update(totalKey, e.target.value)}
                            placeholder="0"
                            className="w-12 bg-black/50 border border-white/15 rounded px-1.5 py-0.5 text-center text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {subs.map((s, idx) => (
                          <div
                            key={idx}
                            className="bg-black/40 border border-white/10 rounded p-1.5 space-y-1"
                          >
                            <input
                              type="text"
                              value={s.playerOut}
                              onChange={(e) =>
                                updateSub(side, idx, { playerOut: e.target.value })
                              }
                              placeholder="Ra (số/tên)"
                              className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[11px]"
                            />
                            <input
                              type="text"
                              value={s.playerIn}
                              onChange={(e) =>
                                updateSub(side, idx, { playerIn: e.target.value })
                              }
                              placeholder="Vào (số/tên)"
                              className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[11px]"
                            />
                            <input
                              type="text"
                              value={s.minute}
                              onChange={(e) =>
                                updateSub(side, idx, { minute: e.target.value })
                              }
                              placeholder="Phút"
                              className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[11px]"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">
                            Lỗi Hiệp 1
                          </label>
                          <input
                            type="text"
                            value={form[f1Key]}
                            onChange={(e) => update(f1Key, e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">
                            Lỗi Hiệp 2
                          </label>
                          <input
                            type="text"
                            value={form[f2Key]}
                            onChange={(e) => update(f2Key, e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">
                            Hội ý (lần)
                          </label>
                          <input
                            type="text"
                            value={form[toKey]}
                            onChange={(e) => update(toKey, e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Đá luân lưu & Chữ ký */}
              <section className="rounded-xl bg-[#11141c] border border-white/10 p-5 space-y-4">
                <h2 className="font-display font-bold text-sm uppercase tracking-wider text-emerald-300">
                  5. Đá luân lưu &amp; Thành phần ký biên bản
                </h2>

                <div className="rounded-lg bg-black/30 border border-white/10 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Loạt sút luân lưu</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-400">Tỉ số LL:</span>
                      <input
                        type="text"
                        value={form.penaltyScoreA}
                        onChange={(e) => update('penaltyScoreA', e.target.value)}
                        placeholder="A"
                        className="w-10 bg-black/50 border border-white/15 rounded px-1.5 py-0.5 text-center"
                      />
                      <span>:</span>
                      <input
                        type="text"
                        value={form.penaltyScoreB}
                        onChange={(e) => update('penaltyScoreB', e.target.value)}
                        placeholder="B"
                        className="w-10 bg-black/50 border border-white/15 rounded px-1.5 py-0.5 text-center"
                      />
                    </div>
                  </div>

                  {(['A', 'B'] as const).map((side) => {
                    const pens = side === 'A' ? form.penaltiesA : form.penaltiesB;
                    return (
                      <div key={side} className="space-y-1">
                        <div className="text-[11px] text-gray-400">
                          Đội {side} ({side === 'A' ? form.teamAName : form.teamBName}):
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {pens.map((pk, idx) => (
                            <div
                              key={idx}
                              className="bg-black/40 border border-white/10 rounded p-1 space-y-1"
                            >
                              <input
                                type="text"
                                value={pk.shirtNumber}
                                onChange={(e) =>
                                  updatePenalty(side, idx, {
                                    shirtNumber: e.target.value,
                                  })
                                }
                                placeholder={`Số #${idx + 1}`}
                                className="w-full bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[11px] text-center"
                              />
                              <select
                                value={pk.result}
                                onChange={(e) =>
                                  updatePenalty(side, idx, {
                                    result: e.target.value as '' | 'O' | 'X',
                                  })
                                }
                                className="w-full bg-black/50 border border-white/10 rounded px-1 py-0.5 text-[11px] text-center"
                              >
                                <option value="">-</option>
                                <option value="O">O (Vào)</option>
                                <option value="X">X (Hỏng)</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ban huấn luyện & Trọng tài */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">HLV Đội A</label>
                    <input
                      type="text"
                      value={form.coachA}
                      onChange={(e) => update('coachA', e.target.value)}
                      placeholder="Họ tên HLV đội A"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">HLV Đội B</label>
                    <input
                      type="text"
                      value={form.coachB}
                      onChange={(e) => update('coachB', e.target.value)}
                      placeholder="Họ tên HLV đội B"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Trọng tài</label>
                    <input
                      type="text"
                      value={form.refereeName}
                      onChange={(e) => update('refereeName', e.target.value)}
                      placeholder="Họ tên trọng tài"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Giám sát trận đấu
                    </label>
                    <input
                      type="text"
                      value={form.supervisorName}
                      onChange={(e) => update('supervisorName', e.target.value)}
                      placeholder="Họ tên giám sát trận đấu"
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          /* Danh sách biên bản bóng đá đã lưu trong Database */
          <section className="space-y-4">
            {loadingSaved ? (
              <div className="py-16 text-center text-sm text-gray-400">
                Đang tải danh sách biên bản...
              </div>
            ) : savedReports.length === 0 ? (
              <div className="rounded-xl bg-[#11141c] border border-white/10 py-16 text-center space-y-2">
                <div className="text-sm text-gray-300">Chưa có biên bản bóng đá nào được lưu</div>
                <p className="text-xs text-gray-500">
                  Điền thông tin biên bản và bấm "💾 Lưu Database" để lưu trữ cả ảnh Face ID đội trưởng
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedReports.map((rep) => (
                  <article
                    key={rep.id}
                    className="rounded-xl bg-[#11141c] border border-white/10 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-emerald-300 font-semibold">
                          {rep.matchCode ? `Mã trận: ${rep.matchCode}` : 'Trận bóng đá'}
                          {rep.groupName ? ` · Bảng ${rep.groupName}` : ''}
                          {rep.fieldNumber ? ` · Sân ${rep.fieldNumber}` : ''}
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {rep.teamAName}{' '}
                          <span className="text-amber-300">
                            {rep.scoreA_Total || '0'} - {rep.scoreB_Total || '0'}
                          </span>{' '}
                          {rep.teamBName}
                        </h3>
                        <div className="text-[11px] text-gray-400">
                          {rep.dateTime}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setForm(rep);
                            setTab('form');
                          }}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
                        >
                          Mở / Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFootballReportDoc(rep)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                        >
                          Xuất .doc
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSaved(rep.id)}
                          className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-xs text-red-300"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    {/* Hiển thị ảnh Face ID 2 đội trưởng đã lưu */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      {[
                        {
                          label: 'Đội trưởng A',
                          name: rep.captainAName,
                          img: rep.captainAFaceImage,
                          ok: rep.captainAFaceVerified,
                        },
                        {
                          label: 'Đội trưởng B',
                          name: rep.captainBName,
                          img: rep.captainBFaceImage,
                          ok: rep.captainBFaceVerified,
                        },
                      ].map((cap, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 bg-black/35 rounded-lg p-2 border border-white/5"
                        >
                          {cap.img ? (
                            <img
                              src={cap.img}
                              alt={cap.label}
                              className="w-11 h-11 rounded-md object-cover border border-white/15 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-gray-500 shrink-0">
                              No img
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold truncate">
                              {cap.name || cap.label}
                            </div>
                            <div
                              className={`text-[10px] ${
                                cap.ok ? 'text-emerald-400' : 'text-gray-500'
                              }`}
                            >
                              {cap.ok ? '✓ Đã xác nhận Face ID' : 'Chưa xác nhận'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
