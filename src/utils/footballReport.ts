export interface FootballPlayerRow {
  shirtNumber: string;
  fullName: string;
  started: boolean;
  sub: boolean;
  yellow1: boolean;
  yellow2: boolean;
  redCard: boolean;
  goals: [string, string, string, string, string, string];
}

export interface FootballSubRow {
  playerOut: string;
  playerIn: string;
  minute: string;
}

export interface FootballPenaltyKick {
  shirtNumber: string;
  result: '' | 'O' | 'X';
}

export interface FootballReportData {
  id?: string;
  created_at?: string;
  updated_at?: string;

  // Thông tin trận đấu
  matchCode: string;
  groupName: string;
  fieldNumber: string;
  dateTime: string;
  totalDuration: string;

  // Tên đội & tỷ số bàn thắng
  teamAName: string;
  teamBName: string;
  scoreA_H1: string;
  scoreA_H2: string;
  scoreA_LL: string;
  scoreA_Total: string;
  scoreB_H1: string;
  scoreB_H2: string;
  scoreB_LL: string;
  scoreB_Total: string;

  // Danh sách cầu thủ
  playersA: FootballPlayerRow[];
  playersB: FootballPlayerRow[];

  // Thay người
  subsA: FootballSubRow[];
  subsTotalA: string;
  subsB: FootballSubRow[];
  subsTotalB: string;

  // Lỗi tổng hợp & Hội ý
  foulsA_H1: string;
  foulsA_H2: string;
  timeoutA: string;
  foulsB_H1: string;
  foulsB_H2: string;
  timeoutB: string;

  // Đá luân lưu
  penaltiesA: FootballPenaltyKick[];
  penaltiesB: FootballPenaltyKick[];
  penaltyScoreA: string;
  penaltyScoreB: string;

  // Xác nhận Face ID đội trưởng (kèm ảnh chụp lưu DB)
  captainAName: string;
  captainAFaceVerified: boolean;
  captainAFaceImage: string;
  captainAFaceTime: string;
  captainBName: string;
  captainBFaceVerified: boolean;
  captainBFaceImage: string;
  captainBFaceTime: string;

  // Ban huấn luyện & Trọng tài
  coachA: string;
  coachB: string;
  refereeName: string;
  supervisorName: string;
}

export function createEmptyFootballPlayer(): FootballPlayerRow {
  return {
    shirtNumber: '',
    fullName: '',
    started: false,
    sub: false,
    yellow1: false,
    yellow2: false,
    redCard: false,
    goals: ['', '', '', '', '', ''],
  };
}

export function createInitialFootballReport(): FootballReportData {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  return {
    matchCode: '',
    groupName: '',
    fieldNumber: '',
    dateTime: `${dd}/${mm}/${yyyy} ${hh}:${min}`,
    totalDuration: '',
    teamAName: 'Đội A',
    teamBName: 'Đội B',
    scoreA_H1: '',
    scoreA_H2: '',
    scoreA_LL: '',
    scoreA_Total: '',
    scoreB_H1: '',
    scoreB_H2: '',
    scoreB_LL: '',
    scoreB_Total: '',
    playersA: Array.from({ length: 12 }, createEmptyFootballPlayer),
    playersB: Array.from({ length: 12 }, createEmptyFootballPlayer),
    subsA: Array.from({ length: 4 }, () => ({ playerOut: '', playerIn: '', minute: '' })),
    subsTotalA: '',
    subsB: Array.from({ length: 4 }, () => ({ playerOut: '', playerIn: '', minute: '' })),
    subsTotalB: '',
    foulsA_H1: '0',
    foulsA_H2: '0',
    timeoutA: '0',
    foulsB_H1: '0',
    foulsB_H2: '0',
    timeoutB: '0',
    penaltiesA: Array.from({ length: 5 }, () => ({ shirtNumber: '', result: '' })),
    penaltiesB: Array.from({ length: 5 }, () => ({ shirtNumber: '', result: '' })),
    penaltyScoreA: '',
    penaltyScoreB: '',
    captainAName: '',
    captainAFaceVerified: false,
    captainAFaceImage: '',
    captainAFaceTime: '',
    captainBName: '',
    captainBFaceVerified: false,
    captainBFaceImage: '',
    captainBFaceTime: '',
    coachA: '',
    coachB: '',
    refereeName: '',
    supervisorName: '',
  };
}

function esc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cb(checked: boolean): string {
  return checked ? '&#9745;' : '&#9744;';
}

function mark(checked: boolean): string {
  return checked ? 'X' : '';
}

/**
 * Tạo HTML chuẩn A4 ngang theo đúng mẫu BIÊN BẢN TRẬN ĐẤU FIT CUP S3 (Bóng đá)
 * Bao gồm ảnh chụp Face ID xác nhận của 2 đội trưởng
 */
export function buildFootballReportDocumentHtml(data: FootballReportData): string {
  const rowCount = Math.max(data.playersA.length, data.playersB.length, 10);
  const penCount = Math.max(data.penaltiesA.length, data.penaltiesB.length, 5);
  const subCount = Math.max(data.subsA.length, data.subsB.length, 4);

  const renderCaptainBox = (
    label: string,
    teamName: string,
    captainName: string,
    verified: boolean,
    timeStr: string
  ) => `
    <td style="width: 50%; vertical-align: top; padding: 5pt 6pt;">
      <div style="font-weight: bold; margin-bottom: 2pt;">${esc(label)}: ${esc(teamName)}</div>
      <div style="font-size: 9pt; line-height: 1.4;">
        <div>Đội trưởng: <strong>${esc(captainName || '........................')}</strong></div>
        <div>
          <span class="cb">${cb(verified)}</span> <strong>Đội trưởng đã xác nhận Face ID</strong>
        </div>
        ${timeStr ? `<div style="font-size: 8.5pt; color: #333;">Thời gian xác nhận: ${esc(timeStr)}</div>` : ''}
      </div>
    </td>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Biên bản bóng đá FIT CUP S3 - ${esc(data.teamAName)} vs ${esc(data.teamBName)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 9mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 9.5pt;
      line-height: 1.25;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table.grid th,
    table.grid td {
      border: 1px solid #000;
      padding: 2pt 3pt;
      vertical-align: middle;
      font-size: 8.5pt;
    }
    table.grid th {
      background: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .cb {
      font-family: "Segoe UI Symbol", "DejaVu Sans", "Times New Roman", serif;
      font-size: 10pt;
    }
    .title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4pt;
    }
    .sub-header {
      text-align: center;
      font-size: 9pt;
      margin-bottom: 4pt;
    }
    .sep-col {
      background: #e5e5e5;
      width: 4pt;
      padding: 0 !important;
    }
    .sign-table td {
      border: none;
      width: 25%;
      text-align: center;
      vertical-align: top;
      padding: 4pt;
      font-size: 9.5pt;
    }
    .sign-space { height: 40pt; }
  </style>
</head>
<body>
  <div class="sub-header">
    <strong>ĐẠI HỌC KINH TẾ QUỐC DÂN · KHOA CÔNG NGHỆ THÔNG TIN</strong>
  </div>
  <div class="title">BIÊN BẢN TRẬN ĐẤU FIT CUP S3 (BÓNG ĐÁ)</div>

  <!-- Thông tin chung & Bảng tỉ số -->
  <table class="grid" style="margin-bottom: 5pt;">
    <tr>
      <td colspan="4"><strong>Mã trận:</strong> ${esc(data.matchCode)} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Bảng:</strong> ${esc(data.groupName)}</td>
      <td colspan="3"><strong>Sân thi đấu:</strong> Sân ${esc(data.fieldNumber)}</td>
      <td colspan="3"><strong>Ngày giờ:</strong> ${esc(data.dateTime)}</td>
      <td colspan="3"><strong>Tổng thời gian:</strong> ${esc(data.totalDuration)}</td>
    </tr>
    <tr>
      <td colspan="3" class="bold" style="width: 26%;">ĐỘI A: ${esc(data.teamAName)}</td>
      <td class="center"><strong>BÀN THẮNG</strong></td>
      <td class="center"><strong>H1:</strong> ${esc(data.scoreA_H1)}</td>
      <td class="center"><strong>H2:</strong> ${esc(data.scoreA_H2)}</td>
      <td class="center"><strong>LL:</strong> ${esc(data.scoreA_LL)}</td>
      <td rowspan="2" class="center bold" style="font-size: 11pt; background: #fafafa;">
        CHUNG CUỘC<br/>
        ${esc(data.scoreA_Total || '0')} - ${esc(data.scoreB_Total || '0')}
      </td>
      <td colspan="2" class="bold" style="width: 22%;">ĐỘI B: ${esc(data.teamBName)}</td>
      <td class="center"><strong>H1:</strong> ${esc(data.scoreB_H1)}</td>
      <td class="center"><strong>H2:</strong> ${esc(data.scoreB_H2)}</td>
      <td class="center"><strong>LL:</strong> ${esc(data.scoreB_LL)}</td>
    </tr>
    <tr>
      <td colspan="7" style="font-size: 8.5pt;">
        <strong>Lỗi tổng hợp:</strong> Hiệp 1: ${esc(data.foulsA_H1 || '0')} · Hiệp 2: ${esc(data.foulsA_H2 || '0')} &nbsp;|&nbsp;
        <strong>Hội ý:</strong> ${esc(data.timeoutA || '0')} lần
      </td>
      <td colspan="5" style="font-size: 8.5pt;">
        <strong>Lỗi tổng hợp:</strong> Hiệp 1: ${esc(data.foulsB_H1 || '0')} · Hiệp 2: ${esc(data.foulsB_H2 || '0')} &nbsp;|&nbsp;
        <strong>Hội ý:</strong> ${esc(data.timeoutB || '0')} lần
      </td>
    </tr>
  </table>

  <!-- Bảng cầu thủ 2 đội song song giống mẫu -->
  <table class="grid" style="margin-bottom: 5pt;">
    <tr>
      <th rowspan="2" style="width: 3.5%;">Số áo</th>
      <th rowspan="2" style="width: 14%;">HỌ TÊN (${esc(data.teamAName)})</th>
      <th rowspan="2" style="width: 2.5%;">TĐ</th>
      <th rowspan="2" style="width: 2.5%;">DB</th>
      <th rowspan="2" style="width: 3.5%;">Thẻ vàng (1)</th>
      <th rowspan="2" style="width: 3.5%;">Thẻ vàng (2)</th>
      <th rowspan="2" style="width: 3%;">Thẻ đỏ</th>
      <th colspan="6">BÀN THẮNG</th>
      <th rowspan="2" class="sep-col"></th>
      <th rowspan="2" style="width: 3.5%;">Số áo</th>
      <th rowspan="2" style="width: 14%;">HỌ TÊN (${esc(data.teamBName)})</th>
      <th rowspan="2" style="width: 2.5%;">TĐ</th>
      <th rowspan="2" style="width: 2.5%;">DB</th>
      <th rowspan="2" style="width: 3.5%;">Thẻ vàng (1)</th>
      <th rowspan="2" style="width: 3.5%;">Thẻ vàng (2)</th>
      <th rowspan="2" style="width: 3%;">Thẻ đỏ</th>
      <th colspan="6">BÀN THẮNG</th>
    </tr>
    <tr>
      <th style="width: 2.5%;">1</th>
      <th style="width: 2.5%;">2</th>
      <th style="width: 2.5%;">3</th>
      <th style="width: 2.5%;">4</th>
      <th style="width: 2.5%;">5</th>
      <th style="width: 2.5%;">6</th>
      <th style="width: 2.5%;">1</th>
      <th style="width: 2.5%;">2</th>
      <th style="width: 2.5%;">3</th>
      <th style="width: 2.5%;">4</th>
      <th style="width: 2.5%;">5</th>
      <th style="width: 2.5%;">6</th>
    </tr>
    ${Array.from({ length: rowCount }, (_, i) => {
      const a = data.playersA[i] || createEmptyFootballPlayer();
      const b = data.playersB[i] || createEmptyFootballPlayer();
      return `<tr>
        <td class="center">${esc(a.shirtNumber)}</td>
        <td>${esc(a.fullName)}</td>
        <td class="center">${mark(a.started)}</td>
        <td class="center">${mark(a.sub)}</td>
        <td class="center">${mark(a.yellow1)}</td>
        <td class="center">${mark(a.yellow2)}</td>
        <td class="center">${mark(a.redCard)}</td>
        ${a.goals.map((g) => `<td class="center">${esc(g)}</td>`).join('')}
        <td class="sep-col"></td>
        <td class="center">${esc(b.shirtNumber)}</td>
        <td>${esc(b.fullName)}</td>
        <td class="center">${mark(b.started)}</td>
        <td class="center">${mark(b.sub)}</td>
        <td class="center">${mark(b.yellow1)}</td>
        <td class="center">${mark(b.yellow2)}</td>
        <td class="center">${mark(b.redCard)}</td>
        ${b.goals.map((g) => `<td class="center">${esc(g)}</td>`).join('')}
      </tr>`;
    }).join('\n    ')}
  </table>

  <!-- Thay người & Đá luân lưu -->
  <table class="grid" style="margin-bottom: 5pt;">
    <tr>
      <th colspan="${subCount + 2}">THAY NGƯỜI — ĐỘI A (Tổng: ${esc(data.subsTotalA || String(data.subsA.filter((s) => s.playerOut || s.playerIn).length))})</th>
      <th colspan="${subCount + 2}">THAY NGƯỜI — ĐỘI B (Tổng: ${esc(data.subsTotalB || String(data.subsB.filter((s) => s.playerOut || s.playerIn).length))})</th>
    </tr>
    <tr>
      <td class="bold" style="width: 10%;">VĐV ra</td>
      ${Array.from({ length: subCount }, (_, i) => `<td class="center">${esc(data.subsA[i]?.playerOut || '')}</td>`).join('')}
      <td rowspan="3" style="width: 4pt;" class="sep-col"></td>
      <td class="bold" style="width: 10%;">VĐV ra</td>
      ${Array.from({ length: subCount }, (_, i) => `<td class="center">${esc(data.subsB[i]?.playerOut || '')}</td>`).join('')}
    </tr>
    <tr>
      <td class="bold">VĐV vào</td>
      ${Array.from({ length: subCount }, (_, i) => `<td class="center">${esc(data.subsA[i]?.playerIn || '')}</td>`).join('')}
      <td class="bold">VĐV vào</td>
      ${Array.from({ length: subCount }, (_, i) => `<td class="center">${esc(data.subsB[i]?.playerIn || '')}</td>`).join('')}
    </tr>
    <tr>
      <td class="bold">Thời gian</td>
      ${Array.from({ length: subCount }, (_, i) => `<td class="center">${esc(data.subsA[i]?.minute || '')}</td>`).join('')}
      <td class="bold">Thời gian</td>
      ${Array.from({ length: subCount }, (_, i) => `<td class="center">${esc(data.subsB[i]?.minute || '')}</td>`).join('')}
    </tr>
  </table>

  <table class="grid" style="margin-bottom: 5pt;">
    <tr>
      <th colspan="${penCount + 1}">ĐÁ LUÂN LƯU — ĐỘI A</th>
      <th style="width: 16%;">Tỷ số luân lưu</th>
      <th colspan="${penCount + 1}">ĐÁ LUÂN LƯU — ĐỘI B</th>
    </tr>
    <tr>
      <td class="bold" style="width: 9%;">Số áo</td>
      ${Array.from({ length: penCount }, (_, i) => `<td class="center">${esc(data.penaltiesA[i]?.shirtNumber || '')}</td>`).join('')}
      <td rowspan="2" class="center bold" style="font-size: 10.5pt;">
        ${esc(data.penaltyScoreA || '-')} : ${esc(data.penaltyScoreB || '-')}
      </td>
      <td class="bold" style="width: 9%;">Số áo</td>
      ${Array.from({ length: penCount }, (_, i) => `<td class="center">${esc(data.penaltiesB[i]?.shirtNumber || '')}</td>`).join('')}
    </tr>
    <tr>
      <td class="bold">Kết quả</td>
      ${Array.from({ length: penCount }, (_, i) => `<td class="center bold">${esc(data.penaltiesA[i]?.result || '')}</td>`).join('')}
      <td class="bold">Kết quả</td>
      ${Array.from({ length: penCount }, (_, i) => `<td class="center bold">${esc(data.penaltiesB[i]?.result || '')}</td>`).join('')}
    </tr>
  </table>

  <!-- Xác nhận Face ID Đội trưởng (chỉ hiển thị thông tin chữ, ảnh được lưu trên Database) -->
  <table class="grid" style="margin-bottom: 6pt;">
    <tr>
      <th colspan="2">XÁC NHẬN FACE ID ĐỘI TRƯỞNG HAI ĐỘI</th>
    </tr>
    <tr>
      ${renderCaptainBox(
        'ĐỘI TRƯỞNG ĐỘI A',
        data.teamAName,
        data.captainAName,
        data.captainAFaceVerified,
        data.captainAFaceTime
      )}
      ${renderCaptainBox(
        'ĐỘI TRƯỞNG ĐỘI B',
        data.teamBName,
        data.captainBName,
        data.captainBFaceVerified,
        data.captainBFaceTime
      )}
    </tr>
  </table>

  <!-- Chữ ký 4 cột đúng mẫu -->
  <table class="sign-table">
    <tr>
      <td>
        <div class="bold">HLV ĐỘI A</div>
        <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        ${data.coachA ? `<div class="bold">${esc(data.coachA)}</div>` : ''}
      </td>
      <td>
        <div class="bold">TRỌNG TÀI</div>
        <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        ${data.refereeName ? `<div class="bold">${esc(data.refereeName)}</div>` : ''}
      </td>
      <td>
        <div class="bold">HLV ĐỘI B</div>
        <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        ${data.coachB ? `<div class="bold">${esc(data.coachB)}</div>` : ''}
      </td>
      <td>
        <div class="bold">GIÁM SÁT TRẬN ĐẤU</div>
        <div style="font-style: italic;">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        ${data.supervisorName ? `<div class="bold">${esc(data.supervisorName)}</div>` : ''}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function downloadFootballReportDoc(data: FootballReportData) {
  const html = buildFootballReportDocumentHtml(data);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const slug = `${data.matchCode || 'Tran'}_${data.teamAName}_vs_${data.teamBName}`
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .slice(0, 60);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BienBan_BongDa_FITCUP_${slug}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printFootballReportPdf(data: FootballReportData) {
  const html = buildFootballReportDocumentHtml(data);
  const win = window.open('', '_blank', 'width=1200,height=850');
  if (!win) {
    alert('Trình duyệt đang chặn popup. Vui lòng cho phép để In / Lưu PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}
