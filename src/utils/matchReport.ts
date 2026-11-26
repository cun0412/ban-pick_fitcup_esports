import type {
  BPPhase,
  BPSlot,
  BoType,
  LQHero,
  SpinResult,
  TeamConfig,
  TeamSide,
  ValorantMap,
  VetoEntry,
  VetoPhase,
} from '../types';
import type { SavedMatchRecord } from '../lib/api';
import type { PreSpinBan } from '../stores/valorantStore';

export type ReportGameType = 'valorant' | 'lq';
export type ReportRoundType = 'group' | 'quarter' | 'semi' | 'final';
export type ReportFormatType = 'BO1' | 'BO3' | 'BO5';
export type ReportVenueMode = 'offline' | 'online';
export type ReportWinMode = 'normal' | 'forfeit';

export interface ReportGameRow {
  gameNumber: number;
  mapOrSides: string;
  scoreA: string;
  scoreB: string;
  winner: '' | 'A' | 'B';
  duration: string;
}

export interface ReportPlayerInfo {
  fullName: string;
  inGameTag: string;
}

export interface MatchReportData {
  // Header
  reportNumber: string;
  day: string;
  month: string;
  year: string;

  // I. Thông tin trận đấu
  game: ReportGameType;
  matchNumber: string;
  roundType: ReportRoundType;
  groupName: string;
  boFormat: ReportFormatType;
  venueMode: ReportVenueMode;
  matchDate: string;
  timeStartHour: string;
  timeStartMin: string;
  timeEndHour: string;
  timeEndMin: string;
  location: string;

  // II. Các đội tham gia
  teamAName: string;
  teamBName: string;
  captainA: string;
  captainB: string;
  mainPlayersA: string;
  subPlayersA: string;
  mainPlayersB: string;
  subPlayersB: string;
  checkinOnTimeA: boolean;
  checkinOnTimeB: boolean;
  verifiedIdA: boolean;
  verifiedIdB: boolean;
  deviceApprovedA: boolean;
  deviceApprovedB: boolean;
  playersA: ReportPlayerInfo[];
  playersB: ReportPlayerInfo[];

  // III. Ban/Pick
  firstBanPickTeam: '' | TeamSide;
  bansAText: string;
  bansBText: string;
  picksAText: string;
  picksBText: string;
  sideSelectTeam: '' | TeamSide;

  // IV. Diễn biến các ván đấu
  games: ReportGameRow[];

  // V. Kết quả chung cuộc
  finalScoreA: string;
  finalScoreB: string;
  overallWinner: string;
  winMode: ReportWinMode;
  forfeitReason: string;

  // VI. Tạm dừng, sự cố, khiếu nại
  timeoutA: string;
  timeoutB: string;
  technicalIssues: string;
  hasComplaint: boolean;
  complaintDetails: string;

  // Đại diện ký xác nhận
  refereeName: string;
  supervisorName: string;
}

function detectRoundFromName(roundName: string): {
  roundType: ReportRoundType;
  groupName: string;
} {
  const lower = (roundName || '').toLowerCase();
  if (lower.includes('chung kết') || lower.includes('final')) {
    return { roundType: 'final', groupName: '' };
  }
  if (lower.includes('bán kết') || lower.includes('semi')) {
    return { roundType: 'semi', groupName: '' };
  }
  if (lower.includes('tứ kết') || lower.includes('quarter')) {
    return { roundType: 'quarter', groupName: '' };
  }
  const groupMatch = roundName.match(/bảng\s*([a-z0-9]+)/i);
  return {
    roundType: 'group',
    groupName: groupMatch ? groupMatch[1].toUpperCase() : '',
  };
}

function makeBaseReport(
  game: ReportGameType,
  teamAName: string,
  teamBName: string,
  roundName: string,
  boType?: BoType,
  createdAt?: string
): MatchReportData {
  const d = createdAt ? new Date(createdAt) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  const { roundType, groupName } = detectRoundFromName(roundName);

  const boFormat: ReportFormatType =
    boType === 'bo5' ? 'BO5' : boType === 'bo3' ? 'BO3' : 'BO1';

  return {
    reportNumber: '',
    day,
    month,
    year,
    game,
    matchNumber: '',
    roundType,
    groupName,
    boFormat,
    venueMode: 'offline',
    matchDate: `${day}/${month}/${year}`,
    timeStartHour: '',
    timeStartMin: '',
    timeEndHour: '',
    timeEndMin: '',
    location: '',
    teamAName: teamAName || 'Đội A',
    teamBName: teamBName || 'Đội B',
    captainA: '',
    captainB: '',
    mainPlayersA: '5',
    subPlayersA: '0',
    mainPlayersB: '5',
    subPlayersB: '0',
    checkinOnTimeA: true,
    checkinOnTimeB: true,
    verifiedIdA: true,
    verifiedIdB: true,
    deviceApprovedA: true,
    deviceApprovedB: true,
    playersA: Array.from({ length: 5 }, () => ({ fullName: '', inGameTag: '' })),
    playersB: Array.from({ length: 5 }, () => ({ fullName: '', inGameTag: '' })),
    firstBanPickTeam: '',
    bansAText: '',
    bansBText: '',
    picksAText: '',
    picksBText: '',
    sideSelectTeam: '',
    games: [
      { gameNumber: 1, mapOrSides: '', scoreA: '', scoreB: '', winner: '', duration: '' },
      { gameNumber: 2, mapOrSides: '', scoreA: '', scoreB: '', winner: '', duration: '' },
      { gameNumber: 3, mapOrSides: '', scoreA: '', scoreB: '', winner: '', duration: '' },
    ],
    finalScoreA: '',
    finalScoreB: '',
    overallWinner: '',
    winMode: 'normal',
    forfeitReason: '',
    timeoutA: '0',
    timeoutB: '0',
    technicalIssues: '',
    hasComplaint: false,
    complaintDetails: '',
    refereeName: '',
    supervisorName: '',
  };
}

export function buildLQReportInitial(params: {
  bansA: BPSlot[];
  bansB: BPSlot[];
  picksA: BPSlot[];
  picksB: BPSlot[];
  phases: BPPhase[];
  heroes: LQHero[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  roundName: string;
  createdAt?: string;
}): MatchReportData {
  const heroMap = new Map<string, string>();
  params.heroes.forEach((h) => heroMap.set(h.id, h.name));

  const formatSlots = (slots: BPSlot[], withPlayer = false) =>
    slots
      .map((s) => {
        if (!s.heroId) return null;
        const name = heroMap.get(s.heroId) || s.heroId;
        return withPlayer && s.playerName ? `${name} (${s.playerName})` : name;
      })
      .filter(Boolean)
      .join(', ');

  const base = makeBaseReport(
    'lq',
    params.teamA.name,
    params.teamB.name,
    params.roundName,
    'bo1',
    params.createdAt
  );

  base.firstBanPickTeam = params.phases[0]?.team || 'A';
  base.bansAText = formatSlots(params.bansA);
  base.bansBText = formatSlots(params.bansB);
  base.picksAText = formatSlots(params.picksA, true);
  base.picksBText = formatSlots(params.picksB, true);

  // Ghi sẵn phe xanh - đỏ cho ván 1
  base.games[0].mapOrSides = `Xanh: ${base.teamAName} / Đỏ: ${base.teamBName}`;
  // Gợi ý đội trưởng & tag game từ slot người chơi nếu đã nhập trên bảng Ban/Pick
  base.playersA = Array.from({ length: 5 }, (_, idx) => ({
    fullName: '',
    inGameTag: params.picksA[idx]?.playerName?.trim() || '',
  }));
  base.playersB = Array.from({ length: 5 }, (_, idx) => ({
    fullName: '',
    inGameTag: params.picksB[idx]?.playerName?.trim() || '',
  }));
  const firstPlayerA = params.picksA.find((p) => p.playerName?.trim())?.playerName;
  const firstPlayerB = params.picksB.find((p) => p.playerName?.trim())?.playerName;
  if (firstPlayerA) base.captainA = firstPlayerA;
  if (firstPlayerB) base.captainB = firstPlayerB;

  return base;
}

export function buildValorantReportInitial(params: {
  mode: 'veto' | 'spin';
  boType: BoType;
  spinBoType?: BoType;
  maps: ValorantMap[];
  vetoPhases: VetoPhase[];
  vetoHistory: VetoEntry[];
  spinResults: SpinResult[];
  preSpinBans: PreSpinBan[];
  teamA: TeamConfig;
  teamB: TeamConfig;
  roundName: string;
  createdAt?: string;
}): MatchReportData {
  const mapLookup = new Map<string, string>();
  params.maps.forEach((m) => mapLookup.set(m.id, m.name));

  const effectiveBo = params.mode === 'spin' ? params.spinBoType || params.boType : params.boType;
  const base = makeBaseReport(
    'valorant',
    params.teamA.name,
    params.teamB.name,
    params.roundName,
    effectiveBo,
    params.createdAt
  );

  if (params.mode === 'veto') {
    base.firstBanPickTeam = params.vetoPhases[0]?.team || 'A';

    const bansA: string[] = [];
    const bansB: string[] = [];
    const picksA: string[] = [];
    const picksB: string[] = [];
    const playedMaps: Array<{ label: string }> = [];

    let sideTeam: '' | TeamSide = '';

    for (const entry of params.vetoHistory) {
      const mName = mapLookup.get(entry.mapId) || entry.mapId;
      if (entry.action === 'ban') {
        if (entry.team === 'A') bansA.push(mName);
        else bansB.push(mName);
      } else if (entry.action === 'pick' || entry.action === 'decider') {
        const sideNote = entry.side
          ? ` (${entry.side === 'attack' ? 'ATK' : 'DEF'})`
          : '';
        const text = entry.action === 'decider' ? `${mName} [Decider]${sideNote}` : `${mName}${sideNote}`;
        if (entry.action === 'pick') {
          if (entry.team === 'A') picksA.push(mName);
          else picksB.push(mName);
        } else {
          // Ghi decider vào cả 2 hoặc ghi chú ở Pick
          picksA.push(`${mName} (Decider)`);
        }
        playedMaps.push({ label: text });
        if (!sideTeam && entry.sideTeam) {
          sideTeam = entry.sideTeam;
        }
      }
    }

    base.bansAText = bansA.join(', ');
    base.bansBText = bansB.join(', ');
    base.picksAText = picksA.join(', ');
    base.picksBText = picksB.join(', ');
    base.sideSelectTeam = sideTeam;

    playedMaps.slice(0, 3).forEach((pm, idx) => {
      base.games[idx].mapOrSides = pm.label;
    });
  } else {
    // Chế độ Quay Map
    const bansA: string[] = [];
    const bansB: string[] = [];
    for (const b of params.preSpinBans || []) {
      const mName = mapLookup.get(b.mapId) || b.mapId;
      if (b.team === 'A') bansA.push(mName);
      else bansB.push(mName);
    }
    base.bansAText = bansA.join(', ');
    base.bansBText = bansB.join(', ');

    const spinList = (params.spinResults || []).map((r) => {
      const mName = mapLookup.get(r.mapId) || r.mapId;
      const sideText = r.side?.side
        ? ` (${r.side.team === 'A' ? base.teamAName : base.teamBName}: ${
            r.side.side === 'attack' ? 'Attack' : 'Defense'
          })`
        : '';
      return {
        num: r.mapNumber,
        name: mName,
        label: `${mName}${sideText}`,
        sideTeam: r.side?.team || '',
      };
    });

    const spinSummary = spinList.map((s) => `M${s.num}: ${s.name}`).join(', ');
    base.picksAText = spinSummary;
    base.picksBText = spinSummary;
    base.sideSelectTeam = (spinList.find((s) => s.sideTeam)?.sideTeam as TeamSide) || '';

    spinList.slice(0, 3).forEach((s, idx) => {
      base.games[idx].mapOrSides = s.label;
    });
  }

  return base;
}

export function buildReportFromSavedMatch(
  match: SavedMatchRecord,
  heroes: LQHero[],
  maps: ValorantMap[]
): MatchReportData {
  if (match.game === 'lq') {
    return buildLQReportInitial({
      bansA: match.result?.bansA || [],
      bansB: match.result?.bansB || [],
      picksA: match.result?.picksA || [],
      picksB: match.result?.picksB || [],
      phases: [],
      heroes,
      teamA: match.team_a,
      teamB: match.team_b,
      roundName: match.round_name,
      createdAt: match.created_at,
    });
  }

  return buildValorantReportInitial({
    mode: match.mode === 'spin' ? 'spin' : 'veto',
    boType: (match.result?.boType || 'bo1') as BoType,
    spinBoType: (match.result?.boType || 'bo1') as BoType,
    maps,
    vetoPhases: [],
    vetoHistory: match.result?.vetoHistory || [],
    spinResults: match.result?.spinResults || [],
    preSpinBans: match.result?.preSpinBans || [],
    teamA: match.team_a,
    teamB: match.team_b,
    roundName: match.round_name,
    createdAt: match.created_at,
  });
}

function esc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function box(checked: boolean): string {
  return checked ? '&#9745;' : '&#9744;';
}

function valOrDots(val: string, dots = '..............'): string {
  const trimmed = (val || '').trim();
  return trimmed ? `<strong>${esc(trimmed)}</strong>` : dots;
}

/**
 * Tạo HTML chuẩn A4 (Times New Roman) theo đúng mẫu Biên bản FIT ESPORT S2 - FIT CUP S3
 * Dùng chung cho cả xuất file Word (.doc) và In / Xuất PDF
 */
export function buildMatchReportDocumentHtml(data: MatchReportData): string {
  const isVal = data.game === 'valorant';
  const isLq = data.game === 'lq';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Biên bản trận đấu - ${esc(data.teamAName)} vs ${esc(data.teamBName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 15mm 14mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11.5pt;
      line-height: 1.38;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .page {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-table td {
      border: none;
      vertical-align: top;
      text-align: center;
      padding: 0 4pt;
    }
    .title-block {
      text-align: center;
      margin: 12pt 0 10pt;
    }
    .title-main {
      font-size: 14.5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3pt;
    }
    .title-sub {
      font-size: 11.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 2pt;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 9pt 0 4pt;
    }
    .note-italic {
      font-style: italic;
      font-size: 10.5pt;
      margin-bottom: 4pt;
    }
    table.grid th,
    table.grid td {
      border: 1px solid #000000;
      padding: 4pt 6pt;
      vertical-align: middle;
      font-size: 11pt;
    }
    table.grid th {
      font-weight: bold;
      text-align: center;
      background: #f5f5f5;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .lbl { width: 34%; font-weight: bold; }
    .paragraph {
      margin: 3pt 0;
      font-size: 11pt;
    }
    .sign-table {
      margin-top: 10pt;
    }
    .sign-table td {
      border: none;
      width: 25%;
      text-align: center;
      vertical-align: top;
      padding: 4pt;
      font-size: 10.5pt;
    }
    .sign-space {
      height: 52pt;
    }
    .cb {
      font-family: "Segoe UI Symbol", "DejaVu Sans", "Times New Roman", serif;
      font-size: 11.5pt;
    }
    @media print {
      body { margin: 0; }
      .page { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Quốc hiệu & Đơn vị -->
    <table class="header-table">
      <tr>
        <td style="width: 46%;">
          <div style="font-weight: bold; font-size: 11pt;">ĐẠI HỌC KINH TẾ QUỐC DÂN</div>
          <div style="font-weight: bold; font-size: 11pt;">KHOA CÔNG NGHỆ THÔNG TIN</div>
          <div style="margin: 2pt 0;">____________________</div>
          <div style="margin-top: 4pt;">Số: ${valOrDots(data.reportNumber, '...........................')}</div>
        </td>
        <td style="width: 54%;">
          <div style="font-weight: bold; font-size: 11pt;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div style="font-weight: bold; font-size: 11pt;">Độc lập - Tự do - Hạnh phúc</div>
          <div style="margin: 2pt 0;">______________</div>
          <div style="font-style: italic; margin-top: 4pt;">
            Hà Nội, ngày ${valOrDots(data.day, '.....')} tháng ${valOrDots(data.month, '.....')} năm ${valOrDots(data.year, '2026')}
          </div>
        </td>
      </tr>
    </table>

    <!-- Tiêu đề -->
    <div class="title-block">
      <div class="title-main">BIÊN BẢN TRẬN ĐẤU</div>
      <div class="title-sub">GIẢI THỂ THAO ĐIỆN TỬ FIT ESPORT S2 - FIT CUP S3</div>
    </div>

    <!-- I. THÔNG TIN TRẬN ĐẤU -->
    <div class="section-title">I. THÔNG TIN TRẬN ĐẤU</div>
    <table class="grid">
      <tr>
        <td style="width: 20%; font-weight: bold;">Môn thi đấu</td>
        <td style="width: 38%;">
          <span class="cb">${box(isVal)}</span> Valorant &nbsp;&nbsp;&nbsp;
          <span class="cb">${box(isLq)}</span> Liên Quân Mobile
        </td>
        <td style="width: 17%; font-weight: bold;">Trận số</td>
        <td style="width: 25%;">${valOrDots(data.matchNumber, '..............')}</td>
      </tr>
      <tr>
        <td class="bold">Vòng đấu</td>
        <td colspan="3">
          <span class="cb">${box(data.roundType === 'group')}</span> Vòng bảng (Bảng: ${valOrDots(data.groupName, '......')}) &nbsp;&nbsp;
          <span class="cb">${box(data.roundType === 'quarter')}</span> Tứ kết &nbsp;&nbsp;
          <span class="cb">${box(data.roundType === 'semi')}</span> Bán kết &nbsp;&nbsp;
          <span class="cb">${box(data.roundType === 'final')}</span> Chung kết
        </td>
      </tr>
      <tr>
        <td class="bold">Thể thức</td>
        <td>
          <span class="cb">${box(data.boFormat === 'BO1')}</span> BO1 &nbsp;&nbsp;&nbsp;
          <span class="cb">${box(data.boFormat === 'BO3')}</span> BO3
          ${data.boFormat === 'BO5' ? `&nbsp;&nbsp;&nbsp;<span class="cb">&#9745;</span> BO5` : ''}
        </td>
        <td class="bold">Hình thức</td>
        <td>
          <span class="cb">${box(data.venueMode === 'offline')}</span> Offline &nbsp;&nbsp;
          <span class="cb">${box(data.venueMode === 'online')}</span> Online
        </td>
      </tr>
      <tr>
        <td class="bold">Ngày thi đấu</td>
        <td>${valOrDots(data.matchDate, '....../....../2026')}</td>
        <td class="bold">Thời gian</td>
        <td>
          Từ ${valOrDots(data.timeStartHour, '....')}h${valOrDots(data.timeStartMin, '....')} đến ${valOrDots(data.timeEndHour, '....')}h${valOrDots(data.timeEndMin, '....')}
        </td>
      </tr>
      <tr>
        <td class="bold">Địa điểm</td>
        <td colspan="3">${valOrDots(data.location, '...............................................................')}</td>
      </tr>
    </table>

    <!-- II. CÁC ĐỘI THAM GIA -->
    <div class="section-title">II. CÁC ĐỘI THAM GIA</div>
    <table class="grid">
      <tr>
        <th style="width: 38%;">Nội dung</th>
        <th style="width: 31%;">ĐỘI A</th>
        <th style="width: 31%;">ĐỘI B</th>
      </tr>
      <tr>
        <td class="bold">Tên đội</td>
        <td class="center bold">${esc(data.teamAName)}</td>
        <td class="center bold">${esc(data.teamBName)}</td>
      </tr>
      <tr>
        <td class="bold">Đội trưởng</td>
        <td class="center">${esc(data.captainA)}</td>
        <td class="center">${esc(data.captainB)}</td>
      </tr>
      <tr>
        <td class="bold">Số tuyển thủ có mặt (chính / dự bị)</td>
        <td class="center">${valOrDots(data.mainPlayersA, '......')} / ${valOrDots(data.subPlayersA, '......')}</td>
        <td class="center">${valOrDots(data.mainPlayersB, '......')} / ${valOrDots(data.subPlayersB, '......')}</td>
      </tr>
      <tr>
        <td class="bold">Check-in đúng giờ</td>
        <td class="center"><span class="cb">${box(data.checkinOnTimeA)}</span> Có &nbsp;&nbsp;&nbsp; <span class="cb">${box(!data.checkinOnTimeA)}</span> Không</td>
        <td class="center"><span class="cb">${box(data.checkinOnTimeB)}</span> Có &nbsp;&nbsp;&nbsp; <span class="cb">${box(!data.checkinOnTimeB)}</span> Không</td>
      </tr>
      <tr>
        <td class="bold">Đã xác minh CCCD / thẻ sinh viên</td>
        <td class="center"><span class="cb">${box(data.verifiedIdA)}</span> Có &nbsp;&nbsp;&nbsp; <span class="cb">${box(!data.verifiedIdA)}</span> Không</td>
        <td class="center"><span class="cb">${box(data.verifiedIdB)}</span> Có &nbsp;&nbsp;&nbsp; <span class="cb">${box(!data.verifiedIdB)}</span> Không</td>
      </tr>
      <tr>
        <td class="bold">Thiết bị đã được BTC phê duyệt</td>
        <td class="center"><span class="cb">${box(data.deviceApprovedA)}</span> Có &nbsp;&nbsp;&nbsp; <span class="cb">${box(!data.deviceApprovedA)}</span> Không</td>
        <td class="center"><span class="cb">${box(data.deviceApprovedB)}</span> Có &nbsp;&nbsp;&nbsp; <span class="cb">${box(!data.deviceApprovedB)}</span> Không</td>
      </tr>
    </table>

    <!-- Danh sách tuyển thủ tham gia -->
    <div style="font-weight: bold; font-size: 11pt; margin: 7pt 0 3pt;">Danh sách tuyển thủ tham gia:</div>
    <table class="grid">
      <tr>
        <th style="width: 6%;">STT</th>
        <th style="width: 26%;">Họ và tên (${esc(data.teamAName)})</th>
        <th style="width: 21%;">Tag game (Đội A)</th>
        <th style="width: 26%;">Họ và tên (${esc(data.teamBName)})</th>
        <th style="width: 21%;">Tag game (Đội B)</th>
      </tr>
      ${Array.from(
        { length: Math.max(5, data.playersA.length, data.playersB.length) },
        (_, i) => {
          const pA = data.playersA[i] || { fullName: '', inGameTag: '' };
          const pB = data.playersB[i] || { fullName: '', inGameTag: '' };
          return `<tr>
        <td class="center">${i + 1}</td>
        <td>${esc(pA.fullName)}</td>
        <td>${esc(pA.inGameTag)}</td>
        <td>${esc(pB.fullName)}</td>
        <td>${esc(pB.inGameTag)}</td>
      </tr>`;
        }
      ).join('\n      ')}
    </table>

    <!-- III. BAN/PICK -->
    <div class="section-title" style="margin-bottom: 1pt;">III. BAN/PICK</div>
    <div class="note-italic">(Valorant: ghi map; Liên Quân Mobile: ghi tướng)</div>
    <table class="grid">
      <tr>
        <th style="width: 38%;">Nội dung</th>
        <th style="width: 31%;">ĐỘI A</th>
        <th style="width: 31%;">ĐỘI B</th>
      </tr>
      <tr>
        <td class="bold">Đội ban/pick trước (bốc thăm)</td>
        <td class="center"><span class="cb">${box(data.firstBanPickTeam === 'A')}</span></td>
        <td class="center"><span class="cb">${box(data.firstBanPickTeam === 'B')}</span></td>
      </tr>
      <tr>
        <td class="bold">Map / tướng bị ban</td>
        <td>${esc(data.bansAText)}</td>
        <td>${esc(data.bansBText)}</td>
      </tr>
      <tr>
        <td class="bold">Map / tướng được chọn (pick)</td>
        <td>${esc(data.picksAText)}</td>
        <td>${esc(data.picksBText)}</td>
      </tr>
      <tr>
        <td class="bold">Đội chọn phe</td>
        <td class="center"><span class="cb">${box(data.sideSelectTeam === 'A')}</span></td>
        <td class="center"><span class="cb">${box(data.sideSelectTeam === 'B')}</span></td>
      </tr>
    </table>

    <!-- IV. DIỄN BIẾN CÁC VÁN ĐẤU -->
    <div class="section-title">IV. DIỄN BIẾN CÁC VÁN ĐẤU</div>
    <table class="grid">
      <tr>
        <th style="width: 8%;">Ván</th>
        <th style="width: 37%;">Map (Valorant) / Phe xanh - đỏ (Liên Quân)</th>
        <th style="width: 18%;">Tỉ số ván</th>
        <th style="width: 22%;">Đội thắng</th>
        <th style="width: 15%;">Thời lượng</th>
      </tr>
      ${data.games
        .map((g) => {
          const winnerName =
            g.winner === 'A'
              ? data.teamAName
              : g.winner === 'B'
              ? data.teamBName
              : '';
          const scoreText =
            g.scoreA || g.scoreB
              ? `${esc(g.scoreA || '0')} - ${esc(g.scoreB || '0')}`
              : '...... - ......';
          return `<tr>
        <td class="center bold">${g.gameNumber}</td>
        <td>${esc(g.mapOrSides)}</td>
        <td class="center">${scoreText}</td>
        <td class="center">${esc(winnerName)}</td>
        <td class="center">${esc(g.duration)}</td>
      </tr>`;
        })
        .join('\n      ')}
    </table>

    <!-- V. KẾT QUẢ CHUNG CUỘC -->
    <div class="section-title">V. KẾT QUẢ CHUNG CUỘC</div>
    <div class="paragraph">
      Tỉ số chung cuộc (số ván thắng): Đội A ${valOrDots(data.finalScoreA, '........')} - ${valOrDots(data.finalScoreB, '........')} Đội B
    </div>
    <div class="paragraph">
      Đội thắng chung cuộc: ${valOrDots(data.overallWinner, '................................................................')}
    </div>
    <div class="paragraph">
      Hình thức:
      <span class="cb">${box(data.winMode === 'normal')}</span> Thi đấu bình thường &nbsp;&nbsp;&nbsp;
      <span class="cb">${box(data.winMode === 'forfeit')}</span> Xử thắng/thua (lý do: ${valOrDots(data.forfeitReason, '..............................')})
    </div>

    <!-- VI. TẠM DỪNG, SỰ CỐ, KHIẾU NẠI -->
    <div class="section-title">VI. TẠM DỪNG, SỰ CỐ, KHIẾU NẠI</div>
    <div class="paragraph">
      Số lần timeout: Đội A ${valOrDots(data.timeoutA, '......')} lần; Đội B ${valOrDots(data.timeoutB, '......')} lần (tối đa 2 lần/đội).
    </div>
    <div class="paragraph">
      Sự cố kỹ thuật / vi phạm (nếu có): ${valOrDots(data.technicalIssues, '...................................................')}
    </div>
    <div class="paragraph">
      Khiếu nại (trong 15 phút sau trận):
      <span class="cb">${box(!data.hasComplaint)}</span> Không có &nbsp;&nbsp;&nbsp;
      <span class="cb">${box(data.hasComplaint)}</span> Có, nội dung và hướng xử lý: ${valOrDots(data.complaintDetails, '.................................................................')}
    </div>

    <div class="paragraph" style="font-style: italic; margin-top: 8pt;">
      Biên bản được lập thành 02 bản có giá trị như nhau, các bên đã đọc lại và thống nhất với nội dung trên.
    </div>

    <!-- Chữ ký -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="bold">ĐỘI TRƯỞNG ĐỘI A</div>
          <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space"></div>
          ${data.captainA ? `<div class="bold">${esc(data.captainA)}</div>` : ''}
        </td>
        <td>
          <div class="bold">ĐỘI TRƯỞNG ĐỘI B</div>
          <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space"></div>
          ${data.captainB ? `<div class="bold">${esc(data.captainB)}</div>` : ''}
        </td>
        <td>
          <div class="bold">TRỌNG TÀI</div>
          <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space"></div>
          ${data.refereeName ? `<div class="bold">${esc(data.refereeName)}</div>` : ''}
        </td>
        <td>
          <div class="bold">GIÁM SÁT BTC</div>
          <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space"></div>
          ${data.supervisorName ? `<div class="bold">${esc(data.supervisorName)}</div>` : ''}
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export function downloadMatchReportDoc(data: MatchReportData) {
  const html = buildMatchReportDocumentHtml(data);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const safeSlug = `${data.game}_${data.teamAName}_vs_${data.teamBName}`
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .slice(0, 60);
  const fileName = `BienBan_FITCUP_${safeSlug || 'TranDau'}.doc`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function printMatchReportPdf(data: MatchReportData) {
  const html = buildMatchReportDocumentHtml(data);
  const win = window.open('', '_blank', 'width=960,height=1100');
  if (!win) {
    alert('Trình duyệt đang chặn cửa sổ mới. Vui lòng cho phép popup để in / lưu PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}
