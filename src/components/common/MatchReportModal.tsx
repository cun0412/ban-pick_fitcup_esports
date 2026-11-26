import { useEffect, useState } from 'react';
import {
  downloadMatchReportDoc,
  printMatchReportPdf,
  type MatchReportData,
  type ReportFormatType,
  type ReportRoundType,
  type ReportVenueMode,
  type ReportWinMode,
} from '../../utils/matchReport';

interface MatchReportModalProps {
  open: boolean;
  initialData: MatchReportData | null;
  onClose: () => void;
}

/**
 * Modal điền thêm thông tin giải đấu và xuất Biên bản trận đấu (Word .doc / In PDF)
 * Hoàn toàn tách biệt, không làm thay đổi trạng thái Ban/Pick hoặc Overlay hiện tại
 */
export default function MatchReportModal({
  open,
  initialData,
  onClose,
}: MatchReportModalProps) {
  const [form, setForm] = useState<MatchReportData | null>(initialData);

  useEffect(() => {
    if (open && initialData) {
      setForm(initialData);
    }
  }, [open, initialData]);

  if (!open || !form) return null;

  const update = <K extends keyof MatchReportData>(key: K, val: MatchReportData[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const updatePlayerRow = (
    side: 'A' | 'B',
    idx: number,
    patch: { fullName?: string; inGameTag?: string }
  ) => {
    const key = side === 'A' ? 'playersA' : 'playersB';
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev[key].map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...prev, [key]: list };
    });
  };

  const addPlayerRow = (side: 'A' | 'B') => {
    const key = side === 'A' ? 'playersA' : 'playersB';
    setForm((prev) =>
      prev ? { ...prev, [key]: [...prev[key], { fullName: '', inGameTag: '' }] } : prev
    );
  };

  const removePlayerRow = (side: 'A' | 'B', idx: number) => {
    const key = side === 'A' ? 'playersA' : 'playersB';
    setForm((prev) =>
      prev ? { ...prev, [key]: prev[key].filter((_, i) => i !== idx) } : prev
    );
  };

  const updateGameRow = (
    idx: number,
    patch: Partial<MatchReportData['games'][number]>
  ) => {
    setForm((prev) => {
      if (!prev) return prev;
      const nextGames = prev.games.map((g, i) => (i === idx ? { ...g, ...patch } : g));
      // Tự động cộng tỉ số chung cuộc theo số ván thắng nếu có chọn đội thắng
      const winsA = nextGames.filter((g) => g.winner === 'A').length;
      const winsB = nextGames.filter((g) => g.winner === 'B').length;
      const hasAnyWinner = winsA > 0 || winsB > 0;
      return {
        ...prev,
        games: nextGames,
        ...(hasAnyWinner
          ? {
              finalScoreA: String(winsA),
              finalScoreB: String(winsB),
              overallWinner:
                winsA > winsB
                  ? prev.teamAName
                  : winsB > winsA
                  ? prev.teamBName
                  : prev.overallWinner,
            }
          : {}),
      };
    });
  };

  const inputCls =
    'w-full bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e1525] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-white shadow-2xl">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0a101d]">
          <div>
            <h2 className="font-display font-bold text-lg text-amber-300">
              XUẤT BIÊN BẢN TRẬN ĐẤU · FIT ESPORT S2 - FIT CUP S3
            </h2>
            <p className="text-xs text-gray-400">
              Dữ liệu Ban/Pick đã được điền sẵn — bổ sung thông tin trận đấu rồi xuất Word hoặc PDF
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Nội dung form cuộn */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* I. Thông tin hành chính & trận đấu */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-sm text-blue-300 uppercase tracking-wider border-b border-white/10 pb-1">
              I. Thông tin trận đấu
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Số biên bản</label>
                <input
                  type="text"
                  value={form.reportNumber}
                  onChange={(e) => update('reportNumber', e.target.value)}
                  placeholder="VD: 01/BB-FC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Trận số</label>
                <input
                  type="text"
                  value={form.matchNumber}
                  onChange={(e) => update('matchNumber', e.target.value)}
                  placeholder="VD: 01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Ngày thi đấu</label>
                <input
                  type="text"
                  value={form.matchDate}
                  onChange={(e) => update('matchDate', e.target.value)}
                  placeholder="dd/mm/2026"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Địa điểm</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="VD: Phòng A2-302 / Online"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Vòng đấu</label>
                <div className="flex gap-1.5">
                  <select
                    value={form.roundType}
                    onChange={(e) => update('roundType', e.target.value as ReportRoundType)}
                    className={inputCls}
                  >
                    <option value="group">Vòng bảng</option>
                    <option value="quarter">Tứ kết</option>
                    <option value="semi">Bán kết</option>
                    <option value="final">Chung kết</option>
                  </select>
                  {form.roundType === 'group' && (
                    <input
                      type="text"
                      value={form.groupName}
                      onChange={(e) => update('groupName', e.target.value)}
                      placeholder="Bảng"
                      className="w-20 bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Thể thức & Hình thức</label>
                <div className="flex gap-1.5">
                  <select
                    value={form.boFormat}
                    onChange={(e) => update('boFormat', e.target.value as ReportFormatType)}
                    className={inputCls}
                  >
                    <option value="BO1">BO1</option>
                    <option value="BO3">BO3</option>
                    <option value="BO5">BO5</option>
                  </select>
                  <select
                    value={form.venueMode}
                    onChange={(e) => update('venueMode', e.target.value as ReportVenueMode)}
                    className={inputCls}
                  >
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Thời gian thi đấu (Từ — Đến)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={form.timeStartHour}
                    onChange={(e) => update('timeStartHour', e.target.value)}
                    placeholder="hh"
                    className="w-12 bg-black/50 border border-white/15 rounded-lg px-1.5 py-1.5 text-center text-white"
                  />
                  <span>h</span>
                  <input
                    type="text"
                    value={form.timeStartMin}
                    onChange={(e) => update('timeStartMin', e.target.value)}
                    placeholder="mm"
                    className="w-12 bg-black/50 border border-white/15 rounded-lg px-1.5 py-1.5 text-center text-white"
                  />
                  <span className="px-1">→</span>
                  <input
                    type="text"
                    value={form.timeEndHour}
                    onChange={(e) => update('timeEndHour', e.target.value)}
                    placeholder="hh"
                    className="w-12 bg-black/50 border border-white/15 rounded-lg px-1.5 py-1.5 text-center text-white"
                  />
                  <span>h</span>
                  <input
                    type="text"
                    value={form.timeEndMin}
                    onChange={(e) => update('timeEndMin', e.target.value)}
                    placeholder="mm"
                    className="w-12 bg-black/50 border border-white/15 rounded-lg px-1.5 py-1.5 text-center text-white"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* II. Các đội tham gia */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-sm text-blue-300 uppercase tracking-wider border-b border-white/10 pb-1">
              II. Các đội tham gia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  {
                    side: 'A',
                    label: 'ĐỘI A',
                    color: 'text-blue-300 border-blue-500/30',
                    nameKey: 'teamAName',
                    capKey: 'captainA',
                    mainKey: 'mainPlayersA',
                    subKey: 'subPlayersA',
                    checkKey: 'checkinOnTimeA',
                    idKey: 'verifiedIdA',
                    devKey: 'deviceApprovedA',
                  },
                  {
                    side: 'B',
                    label: 'ĐỘI B',
                    color: 'text-red-300 border-red-500/30',
                    nameKey: 'teamBName',
                    capKey: 'captainB',
                    mainKey: 'mainPlayersB',
                    subKey: 'subPlayersB',
                    checkKey: 'checkinOnTimeB',
                    idKey: 'verifiedIdB',
                    devKey: 'deviceApprovedB',
                  },
                ] as const
              ).map((t) => (
                <div
                  key={t.side}
                  className={`rounded-xl border bg-black/25 p-3 space-y-2.5 ${t.color}`}
                >
                  <div className="font-display font-bold text-xs">{t.label}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-400 mb-1">Tên đội</label>
                      <input
                        type="text"
                        value={form[t.nameKey]}
                        onChange={(e) => update(t.nameKey, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Đội trưởng</label>
                      <input
                        type="text"
                        value={form[t.capKey]}
                        onChange={(e) => update(t.capKey, e.target.value)}
                        placeholder="Họ tên đội trưởng"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-400 mb-1">Tuyển thủ chính</label>
                      <input
                        type="text"
                        value={form[t.mainKey]}
                        onChange={(e) => update(t.mainKey, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Dự bị</label>
                      <input
                        type="text"
                        value={form[t.subKey]}
                        onChange={(e) => update(t.subKey, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-200">
                      <input
                        type="checkbox"
                        checked={form[t.checkKey]}
                        onChange={(e) => update(t.checkKey, e.target.checked)}
                      />
                      Check-in đúng giờ
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-200">
                      <input
                        type="checkbox"
                        checked={form[t.idKey]}
                        onChange={(e) => update(t.idKey, e.target.checked)}
                      />
                      Xác minh CCCD/Thẻ SV
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-200">
                      <input
                        type="checkbox"
                        checked={form[t.devKey]}
                        onChange={(e) => update(t.devKey, e.target.checked)}
                      />
                      Thiết bị đạt chuẩn
                    </label>
                  </div>

                  {/* Danh sách tuyển thủ: Họ tên & Tên tag game */}
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-300">
                        Thông tin tuyển thủ (Họ tên · Tag game)
                      </span>
                      <button
                        type="button"
                        onClick={() => addPlayerRow(t.side)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-amber-300 font-semibold"
                      >
                        + Thêm dự bị
                      </button>
                    </div>
                    {(t.side === 'A' ? form.playersA : form.playersB).map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-5 text-[10px] text-gray-400 text-center shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={p.fullName}
                          onChange={(e) =>
                            updatePlayerRow(t.side, idx, { fullName: e.target.value })
                          }
                          placeholder={idx < 5 ? 'Họ và tên' : 'Họ tên (Dự bị)'}
                          className={inputCls}
                        />
                        <input
                          type="text"
                          value={p.inGameTag}
                          onChange={(e) =>
                            updatePlayerRow(t.side, idx, { inGameTag: e.target.value })
                          }
                          placeholder="Tag game"
                          className={inputCls}
                        />
                        {idx >= 5 && (
                          <button
                            type="button"
                            onClick={() => removePlayerRow(t.side, idx)}
                            className="px-1.5 py-1 text-red-400 hover:text-red-300 text-[11px]"
                            title="Xóa dòng"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* III. Ban/Pick (tự điền, cho phép chỉnh sửa nếu cần) */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-sm text-blue-300 uppercase tracking-wider border-b border-white/10 pb-1">
              III. Ban / Pick (đã tự động điền)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Đội ban/pick trước (bốc thăm)</label>
                <select
                  value={form.firstBanPickTeam}
                  onChange={(e) =>
                    update('firstBanPickTeam', e.target.value as MatchReportData['firstBanPickTeam'])
                  }
                  className={inputCls}
                >
                  <option value="">-- Chưa chọn --</option>
                  <option value="A">Đội A ({form.teamAName})</option>
                  <option value="B">Đội B ({form.teamBName})</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Đội chọn phe</label>
                <select
                  value={form.sideSelectTeam}
                  onChange={(e) =>
                    update('sideSelectTeam', e.target.value as MatchReportData['sideSelectTeam'])
                  }
                  className={inputCls}
                >
                  <option value="">-- Chưa chọn --</option>
                  <option value="A">Đội A ({form.teamAName})</option>
                  <option value="B">Đội B ({form.teamBName})</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">
                  Đội A — Ban ({form.game === 'lq' ? 'Tướng' : 'Map'})
                </label>
                <input
                  type="text"
                  value={form.bansAText}
                  onChange={(e) => update('bansAText', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">
                  Đội B — Ban ({form.game === 'lq' ? 'Tướng' : 'Map'})
                </label>
                <input
                  type="text"
                  value={form.bansBText}
                  onChange={(e) => update('bansBText', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">
                  Đội A — Pick ({form.game === 'lq' ? 'Tướng' : 'Map'})
                </label>
                <input
                  type="text"
                  value={form.picksAText}
                  onChange={(e) => update('picksAText', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">
                  Đội B — Pick ({form.game === 'lq' ? 'Tướng' : 'Map'})
                </label>
                <input
                  type="text"
                  value={form.picksBText}
                  onChange={(e) => update('picksBText', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* IV. Diễn biến các ván đấu & V. Kết quả chung cuộc */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-sm text-blue-300 uppercase tracking-wider border-b border-white/10 pb-1">
              IV &amp; V. Diễn biến các ván &amp; Kết quả chung cuộc
            </h3>

            <div className="space-y-2">
              {form.games.map((g, idx) => (
                <div
                  key={g.gameNumber}
                  className="grid grid-cols-12 gap-2 items-center bg-black/25 border border-white/10 rounded-lg p-2"
                >
                  <div className="col-span-1 font-bold text-amber-300 text-center">
                    Ván {g.gameNumber}
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={g.mapOrSides}
                      onChange={(e) => updateGameRow(idx, { mapOrSides: e.target.value })}
                      placeholder={
                        form.game === 'valorant' ? 'Tên Map' : 'Phe Xanh - Đỏ'
                      }
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="text"
                      value={g.scoreA}
                      onChange={(e) => updateGameRow(idx, { scoreA: e.target.value })}
                      placeholder="A"
                      className="w-full bg-black/50 border border-white/15 rounded-lg px-1.5 py-1.5 text-center text-white"
                    />
                    <span>-</span>
                    <input
                      type="text"
                      value={g.scoreB}
                      onChange={(e) => updateGameRow(idx, { scoreB: e.target.value })}
                      placeholder="B"
                      className="w-full bg-black/50 border border-white/15 rounded-lg px-1.5 py-1.5 text-center text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={g.winner}
                      onChange={(e) =>
                        updateGameRow(idx, { winner: e.target.value as '' | 'A' | 'B' })
                      }
                      className={inputCls}
                    >
                      <option value="">-- Đội thắng --</option>
                      <option value="A">{form.teamAName}</option>
                      <option value="B">{form.teamBName}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={g.duration}
                      onChange={(e) => updateGameRow(idx, { duration: e.target.value })}
                      placeholder="Thời lượng"
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-gray-400 mb-1">Tỉ số chung cuộc (A - B)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={form.finalScoreA}
                    onChange={(e) => update('finalScoreA', e.target.value)}
                    placeholder="0"
                    className="w-16 bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-center text-white"
                  />
                  <span>-</span>
                  <input
                    type="text"
                    value={form.finalScoreB}
                    onChange={(e) => update('finalScoreB', e.target.value)}
                    placeholder="0"
                    className="w-16 bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-center text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Đội thắng chung cuộc</label>
                <input
                  type="text"
                  value={form.overallWinner}
                  onChange={(e) => update('overallWinner', e.target.value)}
                  placeholder="Tên đội thắng"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Hình thức kết thúc</label>
                <select
                  value={form.winMode}
                  onChange={(e) => update('winMode', e.target.value as ReportWinMode)}
                  className={inputCls}
                >
                  <option value="normal">Thi đấu bình thường</option>
                  <option value="forfeit">Xử thắng/thua</option>
                </select>
              </div>
            </div>

            {form.winMode === 'forfeit' && (
              <div>
                <label className="block text-gray-400 mb-1">Lý do xử thắng/thua</label>
                <input
                  type="text"
                  value={form.forfeitReason}
                  onChange={(e) => update('forfeitReason', e.target.value)}
                  placeholder="Nhập lý do..."
                  className={inputCls}
                />
              </div>
            )}
          </section>

          {/* VI. Tạm dừng, sự cố, khiếu nại */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-sm text-blue-300 uppercase tracking-wider border-b border-white/10 pb-1">
              VI. Tạm dừng, sự cố, khiếu nại
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Timeout Đội A (lần)</label>
                <input
                  type="text"
                  value={form.timeoutA}
                  onChange={(e) => update('timeoutA', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Timeout Đội B (lần)</label>
                <input
                  type="text"
                  value={form.timeoutB}
                  onChange={(e) => update('timeoutB', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-200">
                  <input
                    type="checkbox"
                    checked={form.hasComplaint}
                    onChange={(e) => update('hasComplaint', e.target.checked)}
                  />
                  Có khiếu nại (trong 15 phút sau trận)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Sự cố kỹ thuật / vi phạm (nếu có)</label>
                <textarea
                  rows={2}
                  value={form.technicalIssues}
                  onChange={(e) => update('technicalIssues', e.target.value)}
                  placeholder="Để trống nếu không có"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Nội dung khiếu nại &amp; hướng xử lý</label>
                <textarea
                  rows={2}
                  disabled={!form.hasComplaint}
                  value={form.complaintDetails}
                  onChange={(e) => update('complaintDetails', e.target.value)}
                  placeholder={form.hasComplaint ? 'Nhập nội dung khiếu nại...' : 'Không có'}
                  className={`${inputCls} disabled:opacity-40`}
                />
              </div>
            </div>
          </section>

          {/* VII. Đại diện ký xác nhận */}
          <section className="space-y-3">
            <h3 className="font-display font-bold text-sm text-blue-300 uppercase tracking-wider border-b border-white/10 pb-1">
              VII. Trọng tài &amp; Giám sát BTC (ghi rõ họ tên dưới phần ký)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Họ tên Trọng tài</label>
                <input
                  type="text"
                  value={form.refereeName}
                  onChange={(e) => update('refereeName', e.target.value)}
                  placeholder="Nhập họ tên trọng tài..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Họ tên Giám sát BTC</label>
                <input
                  type="text"
                  value={form.supervisorName}
                  onChange={(e) => update('supervisorName', e.target.value)}
                  placeholder="Nhập họ tên giám sát BTC..."
                  className={inputCls}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer nút xuất */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0a101d] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
          >
            Đóng
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => printMatchReportPdf(form)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-display font-bold"
            >
              🖨️ In / Lưu PDF
            </button>
            <button
              type="button"
              onClick={() => downloadMatchReportDoc(form)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-display font-bold shadow-lg"
            >
              📝 Tải file Word (.doc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
