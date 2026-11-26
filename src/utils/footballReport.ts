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

  // Xác nhận Face ID đội trưởng (ảnh chụp lưu DB, biên bản xuất chỉ hiện chữ)
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
    playersA: Array.from({ length: 14 }, createEmptyFootballPlayer),
    playersB: Array.from({ length: 14 }, createEmptyFootballPlayer),
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

function cellVal(str: string): string {
  const escaped = esc(str).trim();
  return escaped || '&nbsp;';
}

function cb(checked: boolean): string {
  return checked ? '[X]' : '[ ]';
}

function cbSymbol(checked: boolean): string {
  return checked ? '&#9745;' : '&#9744;';
}

function mark(checked: boolean): string {
  return checked ? 'X' : '&nbsp;';
}

function makeReportSlug(data: FootballReportData): string {
  return `${data.matchCode || 'Tran'}_${data.teamAName}_vs_${data.teamBName}`
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .slice(0, 60);
}

/**
 * Tạo file Word (.doc) chuẩn A4 ngang theo đúng mẫu FIT CUP S3
 * Dùng CSS đơn giản + thuộc tính font Times New Roman trực tiếp trên table/td/th
 * để Word và WPS Office hiển thị đúng 100% font chữ và đường kẻ đều tất cả 20 dòng cầu thủ.
 */
export function buildFootballReportDocumentHtml(data: FootballReportData): string {
  const rowCount = Math.max(data.playersA.length, data.playersB.length, 20);
  const penCount = Math.max(data.penaltiesA.length, data.penaltiesB.length, 5);
  const subCount = Math.max(data.subsA.length, data.subsB.length, 4);

  const subTotalA =
    data.subsTotalA ||
    String(data.subsA.filter((s) => s.playerOut.trim() || s.playerIn.trim()).length);
  const subTotalB =
    data.subsTotalB ||
    String(data.subsB.filter((s) => s.playerOut.trim() || s.playerIn.trim()).length);

  const f = `font-family:'Times New Roman',Times,serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';mso-bidi-font-family:'Times New Roman';`;
  const cellBorder = `border:1pt solid #000000;${f}`;

  const subW = (32 / subCount).toFixed(2);
  const penW = (34 / penCount).toFixed(2);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40"
      lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Biên bản bóng đá FIT CUP S3 - ${esc(data.teamAName)} vs ${esc(data.teamBName)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 297mm 210mm;
      mso-page-orientation: landscape;
      margin: 7mm 8mm 7mm 8mm;
    }
    div.WordSection1 { page: WordSection1; }
    body, table, thead, tbody, tr, th, td, p, div, span {
      font-family: "Times New Roman", Times, serif;
      mso-ascii-font-family: "Times New Roman";
      mso-fareast-font-family: "Times New Roman";
      mso-hansi-font-family: "Times New Roman";
      mso-bidi-font-family: "Times New Roman";
      color: #000000;
    }
    body { margin: 0; padding: 0; font-size: 8.5pt; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 3pt; }
    th, td {
      border: 1pt solid #000000;
      padding: 1pt 3pt;
      vertical-align: middle;
      font-size: 8pt;
    }
    th { background: #f2f2f2; font-weight: bold; text-align: center; }
    .prow td { height: 13.2pt; line-height: 11pt; }
    .sep { background: #dcdcdc; padding: 0; }
    .sign td { border: none; text-align: center; vertical-align: top; font-size: 8.5pt; padding: 2pt; }
  </style>
</head>
<body>
<div class="WordSection1">
  <div style="${f} text-align:center; font-size:9pt; font-weight:bold;">ĐẠI HỌC KINH TẾ QUỐC DÂN - KHOA CÔNG NGHỆ THÔNG TIN</div>
  <div style="${f} text-align:center; font-size:13pt; font-weight:bold; margin:2pt 0 5pt 0;">BIÊN BẢN TRẬN ĐẤU FIT CUP S3</div>

  <!-- Thông tin chung & Bàn thắng -->
  <table cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-bottom:4pt;">
    <colgroup>
      <col style="width:17%" /><col style="width:8%" /><col style="width:6%" /><col style="width:6%" /><col style="width:6%" />
      <col style="width:14%" />
      <col style="width:17%" /><col style="width:8%" /><col style="width:6%" /><col style="width:6%" /><col style="width:6%" />
    </colgroup>
    <tr>
      <td colspan="3" style="${cellBorder}"><b>Mã trận:</b> ${esc(data.matchCode)} - <b>Bảng:</b> ${esc(data.groupName)}</td>
      <td colspan="3" style="${cellBorder}"><b>Sân thi đấu:</b> Sân ${esc(data.fieldNumber)}</td>
      <td colspan="3" style="${cellBorder}"><b>Ngày giờ:</b> ${esc(data.dateTime)}</td>
      <td colspan="2" style="${cellBorder}"><b>Tổng thời gian:</b> ${esc(data.totalDuration)}</td>
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">Đội A: ${esc(data.teamAName)}</td>
      <td style="${cellBorder} text-align:center; font-weight:bold;">BÀN THẮNG</td>
      <td style="${cellBorder} text-align:center;"><b>H1:</b> ${esc(data.scoreA_H1)}</td>
      <td style="${cellBorder} text-align:center;"><b>H2:</b> ${esc(data.scoreA_H2)}</td>
      <td style="${cellBorder} text-align:center;"><b>LL:</b> ${esc(data.scoreA_LL)}</td>
      <td style="${cellBorder} text-align:center; font-weight:bold; background:#f8f8f8;">Chung cuộc: ${esc(data.scoreA_Total || '0')} - ${esc(data.scoreB_Total || '0')}</td>
      <td style="${cellBorder} font-weight:bold;">Đội B: ${esc(data.teamBName)}</td>
      <td style="${cellBorder} text-align:center; font-weight:bold;">BÀN THẮNG</td>
      <td style="${cellBorder} text-align:center;"><b>H1:</b> ${esc(data.scoreB_H1)}</td>
      <td style="${cellBorder} text-align:center;"><b>H2:</b> ${esc(data.scoreB_H2)}</td>
      <td style="${cellBorder} text-align:center;"><b>LL:</b> ${esc(data.scoreB_LL)}</td>
    </tr>
  </table>

  <!-- Bảng cầu thủ 20 dòng đều nhau -->
  <table cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-bottom:4pt;">
    <colgroup>
      <col style="width:3.8%" /><col style="width:14.2%" /><col style="width:2.6%" /><col style="width:2.6%" /><col style="width:3.6%" /><col style="width:3.6%" /><col style="width:3.1%" /><col style="width:2.66%" /><col style="width:2.66%" /><col style="width:2.66%" /><col style="width:2.66%" /><col style="width:2.68%" /><col style="width:2.68%" />
      <col style="width:1%" />
      <col style="width:3.8%" /><col style="width:14.2%" /><col style="width:2.6%" /><col style="width:2.6%" /><col style="width:3.6%" /><col style="width:3.6%" /><col style="width:3.1%" /><col style="width:2.66%" /><col style="width:2.66%" /><col style="width:2.66%" /><col style="width:2.66%" /><col style="width:2.68%" /><col style="width:2.68%" />
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2" style="${cellBorder}">Số áo</th>
        <th rowspan="2" style="${cellBorder}">HỌ TÊN (${esc(data.teamAName)})</th>
        <th rowspan="2" style="${cellBorder}">TĐ</th>
        <th rowspan="2" style="${cellBorder}">DB</th>
        <th rowspan="2" style="${cellBorder}">Thẻ vàng (1)</th>
        <th rowspan="2" style="${cellBorder}">Thẻ vàng (2)</th>
        <th rowspan="2" style="${cellBorder}">Thẻ đỏ</th>
        <th colspan="6" style="${cellBorder}">BÀN THẮNG</th>
        <th rowspan="2" class="sep" style="${cellBorder} background:#dcdcdc;">&nbsp;</th>
        <th rowspan="2" style="${cellBorder}">Số áo</th>
        <th rowspan="2" style="${cellBorder}">HỌ TÊN (${esc(data.teamBName)})</th>
        <th rowspan="2" style="${cellBorder}">TĐ</th>
        <th rowspan="2" style="${cellBorder}">DB</th>
        <th rowspan="2" style="${cellBorder}">Thẻ vàng (1)</th>
        <th rowspan="2" style="${cellBorder}">Thẻ vàng (2)</th>
        <th rowspan="2" style="${cellBorder}">Thẻ đỏ</th>
        <th colspan="6" style="${cellBorder}">BÀN THẮNG</th>
      </tr>
      <tr>
        <th style="${cellBorder}">1</th><th style="${cellBorder}">2</th><th style="${cellBorder}">3</th><th style="${cellBorder}">4</th><th style="${cellBorder}">5</th><th style="${cellBorder}">6</th>
        <th style="${cellBorder}">1</th><th style="${cellBorder}">2</th><th style="${cellBorder}">3</th><th style="${cellBorder}">4</th><th style="${cellBorder}">5</th><th style="${cellBorder}">6</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from({ length: rowCount }, (_, i) => {
        const a = data.playersA[i] || createEmptyFootballPlayer();
        const b = data.playersB[i] || createEmptyFootballPlayer();
        const tdS = `${cellBorder} height:13.2pt; text-align:center;`;
        const tdName = `${cellBorder} height:13.2pt; text-align:left;`;
        return `<tr class="prow" style="height:13.2pt;">
          <td style="${tdS}">${cellVal(a.shirtNumber)}</td>
          <td style="${tdName}">${cellVal(a.fullName)}</td>
          <td style="${tdS}">${mark(a.started)}</td>
          <td style="${tdS}">${mark(a.sub)}</td>
          <td style="${tdS}">${mark(a.yellow1)}</td>
          <td style="${tdS}">${mark(a.yellow2)}</td>
          <td style="${tdS}">${mark(a.redCard)}</td>
          ${a.goals.map((g) => `<td style="${tdS}">${cellVal(g)}</td>`).join('')}
          <td style="${cellBorder} height:13.2pt; background:#dcdcdc;">&nbsp;</td>
          <td style="${tdS}">${cellVal(b.shirtNumber)}</td>
          <td style="${tdName}">${cellVal(b.fullName)}</td>
          <td style="${tdS}">${mark(b.started)}</td>
          <td style="${tdS}">${mark(b.sub)}</td>
          <td style="${tdS}">${mark(b.yellow1)}</td>
          <td style="${tdS}">${mark(b.yellow2)}</td>
          <td style="${tdS}">${mark(b.redCard)}</td>
          ${b.goals.map((g) => `<td style="${tdS}">${cellVal(g)}</td>`).join('')}
        </tr>`;
      }).join('\n      ')}
    </tbody>
  </table>

  <!-- THAY NGƯỜI -->
  <table cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-bottom:4pt;">
    <colgroup>
      <col style="width:9%" />
      ${Array.from({ length: subCount }, () => `<col style="width:${subW}%" />`).join('')}
      <col style="width:8.5%" /><col style="width:1%" /><col style="width:9%" />
      ${Array.from({ length: subCount }, () => `<col style="width:${subW}%" />`).join('')}
      <col style="width:8.5%" />
    </colgroup>
    <tr>
      <th colspan="${subCount + 2}" style="${cellBorder}">THAY NGƯỜI (${esc(data.teamAName)})</th>
      <th rowspan="4" style="${cellBorder} background:#dcdcdc;">&nbsp;</th>
      <th colspan="${subCount + 2}" style="${cellBorder}">THAY NGƯỜI (${esc(data.teamBName)})</th>
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">VĐV ra</td>
      ${Array.from({ length: subCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.subsA[i]?.playerOut || '')}</td>`).join('')}
      <td rowspan="3" style="${cellBorder} text-align:center;"><b>Tổng:</b><br/>${esc(subTotalA)}</td>
      <td style="${cellBorder} font-weight:bold;">VĐV ra</td>
      ${Array.from({ length: subCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.subsB[i]?.playerOut || '')}</td>`).join('')}
      <td rowspan="3" style="${cellBorder} text-align:center;"><b>Tổng:</b><br/>${esc(subTotalB)}</td>
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">VĐV vào</td>
      ${Array.from({ length: subCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.subsA[i]?.playerIn || '')}</td>`).join('')}
      <td style="${cellBorder} font-weight:bold;">VĐV vào</td>
      ${Array.from({ length: subCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.subsB[i]?.playerIn || '')}</td>`).join('')}
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">Thời gian</td>
      ${Array.from({ length: subCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.subsA[i]?.minute || '')}</td>`).join('')}
      <td style="${cellBorder} font-weight:bold;">Thời gian</td>
      ${Array.from({ length: subCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.subsB[i]?.minute || '')}</td>`).join('')}
    </tr>
  </table>

  <!-- LỖI TỔNG HỢP & HỘI Ý -->
  <table cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-bottom:4pt;">
    <colgroup>
      <col style="width:24%" /><col style="width:12.75%" /><col style="width:12.75%" />
      <col style="width:1%" />
      <col style="width:24%" /><col style="width:12.75%" /><col style="width:12.75%" />
    </colgroup>
    <tr>
      <th colspan="2" style="${cellBorder}">LỖI TỔNG HỢP (${esc(data.teamAName)})</th>
      <th style="${cellBorder}">Hội ý</th>
      <th rowspan="3" style="${cellBorder} background:#dcdcdc;">&nbsp;</th>
      <th colspan="2" style="${cellBorder}">LỖI TỔNG HỢP (${esc(data.teamBName)})</th>
      <th style="${cellBorder}">Hội ý</th>
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">Hiệp 1</td>
      <td style="${cellBorder} text-align:center;">${cellVal(data.foulsA_H1 || '0')}</td>
      <td rowspan="2" style="${cellBorder} text-align:center; font-weight:bold;">${esc(data.timeoutA || '0')} lần</td>
      <td style="${cellBorder} font-weight:bold;">Hiệp 1</td>
      <td style="${cellBorder} text-align:center;">${cellVal(data.foulsB_H1 || '0')}</td>
      <td rowspan="2" style="${cellBorder} text-align:center; font-weight:bold;">${esc(data.timeoutB || '0')} lần</td>
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">Hiệp 2</td>
      <td style="${cellBorder} text-align:center;">${cellVal(data.foulsA_H2 || '0')}</td>
      <td style="${cellBorder} font-weight:bold;">Hiệp 2</td>
      <td style="${cellBorder} text-align:center;">${cellVal(data.foulsB_H2 || '0')}</td>
    </tr>
  </table>

  <!-- ĐÁ LUÂN LƯU -->
  <table cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-bottom:4pt;">
    <colgroup>
      <col style="width:8%" />
      ${Array.from({ length: penCount }, () => `<col style="width:${penW}%" />`).join('')}
      <col style="width:16%" /><col style="width:8%" />
      ${Array.from({ length: penCount }, () => `<col style="width:${penW}%" />`).join('')}
    </colgroup>
    <tr>
      <th colspan="${penCount + 1}" style="${cellBorder}">ĐÁ LUÂN LƯU (${esc(data.teamAName)})</th>
      <th style="${cellBorder}">Tỷ số luân lưu</th>
      <th colspan="${penCount + 1}" style="${cellBorder}">ĐÁ LUÂN LƯU (${esc(data.teamBName)})</th>
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">Số áo</td>
      ${Array.from({ length: penCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.penaltiesA[i]?.shirtNumber || '')}</td>`).join('')}
      <td rowspan="2" style="${cellBorder} text-align:center; font-weight:bold; font-size:10pt;">${esc(data.penaltyScoreA || '-')} : ${esc(data.penaltyScoreB || '-')}</td>
      <td style="${cellBorder} font-weight:bold;">Số áo</td>
      ${Array.from({ length: penCount }, (_, i) => `<td style="${cellBorder} text-align:center;">${cellVal(data.penaltiesB[i]?.shirtNumber || '')}</td>`).join('')}
    </tr>
    <tr>
      <td style="${cellBorder} font-weight:bold;">Kết quả</td>
      ${Array.from({ length: penCount }, (_, i) => `<td style="${cellBorder} text-align:center; font-weight:bold;">${cellVal(data.penaltiesA[i]?.result || '')}</td>`).join('')}
      <td style="${cellBorder} font-weight:bold;">Kết quả</td>
      ${Array.from({ length: penCount }, (_, i) => `<td style="${cellBorder} text-align:center; font-weight:bold;">${cellVal(data.penaltiesB[i]?.result || '')}</td>`).join('')}
    </tr>
  </table>

  <!-- XÁC NHẬN FACE ID (CHỈ HIỆN CHỮ) -->
  <table cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-bottom:4pt;">
    <colgroup><col style="width:50%" /><col style="width:50%" /></colgroup>
    <tr><th colspan="2" style="${cellBorder}">XÁC NHẬN FACE ID ĐỘI TRƯỞNG HAI ĐỘI</th></tr>
    <tr>
      <td style="${cellBorder} padding:4pt 6pt;">
        <b>ĐỘI TRƯỞNG ĐỘI A (${esc(data.teamAName)}):</b> ${esc(data.captainAName || '....................')}<br/>
        <b>${cb(data.captainAFaceVerified)} Đội trưởng đã xác nhận Face ID</b>${data.captainAFaceTime ? ` (${esc(data.captainAFaceTime)})` : ''}
      </td>
      <td style="${cellBorder} padding:4pt 6pt;">
        <b>ĐỘI TRƯỞNG ĐỘI B (${esc(data.teamBName)}):</b> ${esc(data.captainBName || '....................')}<br/>
        <b>${cb(data.captainBFaceVerified)} Đội trưởng đã xác nhận Face ID</b>${data.captainBFaceTime ? ` (${esc(data.captainBFaceTime)})` : ''}
      </td>
    </tr>
  </table>

  <!-- CHỮ KÝ -->
  <table class="sign" cellspacing="0" cellpadding="0" style="${f} width:100%; border-collapse:collapse; margin-top:4pt;">
    <colgroup><col style="width:25%" /><col style="width:25%" /><col style="width:25%" /><col style="width:25%" /></colgroup>
    <tr>
      <td style="${f} border:none; text-align:center; vertical-align:top;"><b>HLV đội A</b><br/><i>(Ký, ghi rõ họ tên)</i><br/><br/><br/><b>${esc(data.coachA)}</b></td>
      <td style="${f} border:none; text-align:center; vertical-align:top;"><b>Trọng tài</b><br/><i>(Ký, ghi rõ họ tên)</i><br/><br/><br/><b>${esc(data.refereeName)}</b></td>
      <td style="${f} border:none; text-align:center; vertical-align:top;"><b>HLV đội B</b><br/><i>(Ký, ghi rõ họ tên)</i><br/><br/><br/><b>${esc(data.coachB)}</b></td>
      <td style="${f} border:none; text-align:center; vertical-align:top;"><b>Giám sát trận đấu</b><br/><i>(Ký, ghi rõ họ tên)</i><br/><br/><br/><b>${esc(data.supervisorName)}</b></td>
    </tr>
  </table>
</div>
</body>
</html>`;
}

export function downloadFootballReportDoc(data: FootballReportData) {
  const html = buildFootballReportDocumentHtml(data);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BienBan_BongDa_FITCUP_${makeReportSlug(data)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Dựng giao diện Flexbox với kích thước px cố định (1160px) cho riêng html2canvas -> PDF
 * Không dùng <table>/<colgroup> trong DOM PDF để tránh hoàn toàn lỗi dồn/lệch cột của html2canvas.
 */
function buildPdfFlexSheetHtml(data: FootballReportData): string {
  const rowCount = Math.max(data.playersA.length, data.playersB.length, 20);
  const penCount = Math.max(data.penaltiesA.length, data.penaltiesB.length, 5);
  const subCount = Math.max(data.subsA.length, data.subsB.length, 4);

  const subTotalA =
    data.subsTotalA ||
    String(data.subsA.filter((s) => s.playerOut.trim() || s.playerIn.trim()).length);
  const subTotalB =
    data.subsTotalB ||
    String(data.subsB.filter((s) => s.playerOut.trim() || s.playerIn.trim()).length);

  const B = '1px solid #000000';
  const F = `'Times New Roman', Times, serif`;

  // Hàm tạo ô flex căn giữa/trái chuẩn Times New Roman & bù baseline cho html2canvas
  const cell = (
    w: number,
    content: string,
    opts: {
      h?: number;
      align?: 'center' | 'left';
      bold?: boolean;
      bg?: string;
      fs?: number;
    } = {}
  ) => {
    const h = opts.h ?? 23;
    const align = opts.align ?? 'center';
    const bold = opts.bold ? 'font-weight:700;' : '';
    const bg = opts.bg ? `background:${opts.bg};` : '';
    const fs = opts.fs ?? 11.5;
    const jc = align === 'left' ? 'flex-start' : 'center';
    const pad = align === 'left' ? 'padding:0 6px 3px 6px;' : 'padding:0 2px 3px 2px;';
    return `<div style="width:${w}px;height:${h}px;border-right:${B};border-bottom:${B};display:flex;align-items:center;justify-content:${jc};text-align:${align};${pad}font-size:${fs}px;line-height:1.25;overflow:hidden;box-sizing:border-box;font-family:${F};${bold}${bg}">${content}</div>`;
  };

  // Tổng chiều ngang bảng = 1160px (574px Đội A + 12px ngăn + 574px Đội B)
  // 13 cột mỗi đội = 42 + 164 + 30 + 30 + 44 + 44 + 40 + 6*30(180) = 574px
  const renderPlayerSideHeader = (teamName: string) => `
    <div style="width:574px;display:flex;align-items:stretch;">
      ${cell(42, 'Số áo', { h: 42, bold: true, bg: '#f2f2f2' })}
      ${cell(164, `HỌ TÊN (${esc(teamName)})`, { h: 42, bold: true, bg: '#f2f2f2' })}
      ${cell(30, 'TĐ', { h: 42, bold: true, bg: '#f2f2f2' })}
      ${cell(30, 'DB', { h: 42, bold: true, bg: '#f2f2f2' })}
      ${cell(44, 'Thẻ<br/>vàng (1)', { h: 42, bold: true, bg: '#f2f2f2', fs: 10 })}
      ${cell(44, 'Thẻ<br/>vàng (2)', { h: 42, bold: true, bg: '#f2f2f2', fs: 10 })}
      ${cell(40, 'Thẻ<br/>đỏ', { h: 42, bold: true, bg: '#f2f2f2', fs: 10 })}
      <div style="width:180px;">
        ${cell(180, 'BÀN THẮNG', { h: 21, bold: true, bg: '#f2f2f2' })}
        <div style="display:flex;">
          ${[1, 2, 3, 4, 5, 6].map((n) => cell(30, String(n), { h: 21, bold: true, bg: '#f2f2f2' })).join('')}
        </div>
      </div>
    </div>`;

  const renderPlayerSideRow = (row: FootballPlayerRow) => `
    <div style="width:574px;display:flex;">
      ${cell(42, cellVal(row.shirtNumber), { h: 22 })}
      ${cell(164, cellVal(row.fullName), { h: 22, align: 'left' })}
      ${cell(30, mark(row.started), { h: 22 })}
      ${cell(30, mark(row.sub), { h: 22 })}
      ${cell(44, mark(row.yellow1), { h: 22 })}
      ${cell(44, mark(row.yellow2), { h: 22 })}
      ${cell(40, mark(row.redCard), { h: 22 })}
      ${row.goals.map((g) => cell(30, cellVal(g), { h: 22 })).join('')}
    </div>`;

  // Bảng thay người: mỗi đội 574px = label 94 + subCols 396 + tổng 84
  const subColW = Math.floor(396 / subCount);
  const subTotalColW = 574 - 94 - subColW * subCount;
  const renderSubSide = (
    teamName: string,
    subs: FootballSubRow[],
    totalStr: string
  ) => `
    <div style="width:574px;">
      ${cell(574, `THAY NGƯỜI (${esc(teamName)})`, { h: 22, bold: true, bg: '#f2f2f2' })}
      <div style="display:flex;">
        <div style="width:${94 + subColW * subCount}px;">
          <div style="display:flex;">
            ${cell(94, 'VĐV ra', { h: 21, align: 'left', bold: true })}
            ${Array.from({ length: subCount }, (_, i) => cell(subColW, cellVal(subs[i]?.playerOut || ''), { h: 21 })).join('')}
          </div>
          <div style="display:flex;">
            ${cell(94, 'VĐV vào', { h: 21, align: 'left', bold: true })}
            ${Array.from({ length: subCount }, (_, i) => cell(subColW, cellVal(subs[i]?.playerIn || ''), { h: 21 })).join('')}
          </div>
          <div style="display:flex;">
            ${cell(94, 'Thời gian', { h: 21, align: 'left', bold: true })}
            ${Array.from({ length: subCount }, (_, i) => cell(subColW, cellVal(subs[i]?.minute || ''), { h: 21 })).join('')}
          </div>
        </div>
        ${cell(subTotalColW, `<div><b>Tổng:</b><br/>${esc(totalStr)}</div>`, { h: 63 })}
      </div>
    </div>`;

  // Bảng lỗi tổng hợp: mỗi đội 574px = label 254 + value 180 + hội ý 140
  const renderFoulSide = (
    teamName: string,
    h1: string,
    h2: string,
    to: string
  ) => `
    <div style="width:574px;">
      <div style="display:flex;">
        ${cell(434, `LỖI TỔNG HỢP (${esc(teamName)})`, { h: 22, bold: true, bg: '#f2f2f2' })}
        ${cell(140, 'Hội ý', { h: 22, bold: true, bg: '#f2f2f2' })}
      </div>
      <div style="display:flex;">
        <div style="width:434px;">
          <div style="display:flex;">
            ${cell(254, 'Hiệp 1', { h: 21, align: 'left', bold: true })}
            ${cell(180, cellVal(h1 || '0'), { h: 21 })}
          </div>
          <div style="display:flex;">
            ${cell(254, 'Hiệp 2', { h: 21, align: 'left', bold: true })}
            ${cell(180, cellVal(h2 || '0'), { h: 21 })}
          </div>
        </div>
        ${cell(140, `${esc(to || '0')} lần`, { h: 42, bold: true })}
      </div>
    </div>`;

  // Bảng đá luân lưu: Đội A 490px + Tỷ số 180px + Đội B 490px = 1160px
  const penColW = Math.floor(410 / penCount);
  const penLblW = 490 - penColW * penCount;
  const renderPenSide = (teamName: string, kicks: FootballPenaltyKick[]) => `
    <div style="width:490px;">
      ${cell(490, `ĐÁ LUÂN LƯU (${esc(teamName)})`, { h: 22, bold: true, bg: '#f2f2f2' })}
      <div style="display:flex;">
        ${cell(penLblW, 'Số áo', { h: 21, align: 'left', bold: true })}
        ${Array.from({ length: penCount }, (_, i) => cell(penColW, cellVal(kicks[i]?.shirtNumber || ''), { h: 21 })).join('')}
      </div>
      <div style="display:flex;">
        ${cell(penLblW, 'Kết quả', { h: 21, align: 'left', bold: true })}
        ${Array.from({ length: penCount }, (_, i) => cell(penColW, cellVal(kicks[i]?.result || ''), { h: 21, bold: true })).join('')}
      </div>
    </div>`;

  return `
  <div style="width:1160px;font-family:${F};color:#000000;background:#ffffff;">
    <div style="text-align:center;font-size:12px;font-weight:700;margin-bottom:2px;">ĐẠI HỌC KINH TẾ QUỐC DÂN · KHOA CÔNG NGHỆ THÔNG TIN</div>
    <div style="text-align:center;font-size:18px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">BIÊN BẢN TRẬN ĐẤU FIT CUP S3</div>

    <!-- Khối 1: Thông tin trận & Bàn thắng (1160px) -->
    <div style="width:1160px;border-top:${B};border-left:${B};margin-bottom:6px;box-sizing:content-box;">
      <div style="display:flex;">
        ${cell(310, `<span><b>Mã trận:</b> ${esc(data.matchCode)} &nbsp;-&nbsp; <b>Bảng:</b> ${esc(data.groupName)}</span>`, { h: 24, align: 'left' })}
        ${cell(270, `<span><b>Sân thi đấu:</b> Sân ${esc(data.fieldNumber)}</span>`, { h: 24, align: 'left' })}
        ${cell(310, `<span><b>Ngày giờ:</b> ${esc(data.dateTime)}</span>`, { h: 24, align: 'left' })}
        ${cell(270, `<span><b>Tổng thời gian:</b> ${esc(data.totalDuration)}</span>`, { h: 24, align: 'left' })}
      </div>
      <div style="display:flex;">
        ${cell(220, `Đội A: ${esc(data.teamAName)}`, { h: 26, align: 'left', bold: true })}
        ${cell(90, 'BÀN THẮNG', { h: 26, bold: true, bg: '#f5f5f5' })}
        ${cell(60, `<span><b>H1:</b> ${esc(data.scoreA_H1)}</span>`, { h: 26 })}
        ${cell(60, `<span><b>H2:</b> ${esc(data.scoreA_H2)}</span>`, { h: 26 })}
        ${cell(60, `<span><b>LL:</b> ${esc(data.scoreA_LL)}</span>`, { h: 26 })}
        ${cell(180, `Chung cuộc: ${esc(data.scoreA_Total || '0')} - ${esc(data.scoreB_Total || '0')}`, { h: 26, bold: true, bg: '#fafafa', fs: 12.5 })}
        ${cell(220, `Đội B: ${esc(data.teamBName)}`, { h: 26, align: 'left', bold: true })}
        ${cell(90, 'BÀN THẮNG', { h: 26, bold: true, bg: '#f5f5f5' })}
        ${cell(60, `<span><b>H1:</b> ${esc(data.scoreB_H1)}</span>`, { h: 26 })}
        ${cell(60, `<span><b>H2:</b> ${esc(data.scoreB_H2)}</span>`, { h: 26 })}
        ${cell(60, `<span><b>LL:</b> ${esc(data.scoreB_LL)}</span>`, { h: 26 })}
      </div>
    </div>

    <!-- Khối 2: Bảng cầu thủ 20 dòng đều nhau (1160px) -->
    <div style="width:1160px;border-top:${B};border-left:${B};margin-bottom:6px;box-sizing:content-box;">
      <div style="display:flex;">
        ${renderPlayerSideHeader(data.teamAName)}
        ${cell(12, '&nbsp;', { h: 42, bg: '#dcdcdc' })}
        ${renderPlayerSideHeader(data.teamBName)}
      </div>
      ${Array.from({ length: rowCount }, (_, i) => {
        const a = data.playersA[i] || createEmptyFootballPlayer();
        const b = data.playersB[i] || createEmptyFootballPlayer();
        return `<div style="display:flex;">
          ${renderPlayerSideRow(a)}
          ${cell(12, '&nbsp;', { h: 22, bg: '#dcdcdc' })}
          ${renderPlayerSideRow(b)}
        </div>`;
      }).join('\n      ')}
    </div>

    <!-- Khối 3: Thay người (1160px) -->
    <div style="width:1160px;border-top:${B};border-left:${B};margin-bottom:6px;display:flex;box-sizing:content-box;">
      ${renderSubSide(data.teamAName, data.subsA, subTotalA)}
      ${cell(12, '&nbsp;', { h: 85, bg: '#dcdcdc' })}
      ${renderSubSide(data.teamBName, data.subsB, subTotalB)}
    </div>

    <!-- Khối 4: Lỗi tổng hợp & Hội ý (1160px) -->
    <div style="width:1160px;border-top:${B};border-left:${B};margin-bottom:6px;display:flex;box-sizing:content-box;">
      ${renderFoulSide(data.teamAName, data.foulsA_H1, data.foulsA_H2, data.timeoutA)}
      ${cell(12, '&nbsp;', { h: 64, bg: '#dcdcdc' })}
      ${renderFoulSide(data.teamBName, data.foulsB_H1, data.foulsB_H2, data.timeoutB)}
    </div>

    <!-- Khối 5: Đá luân lưu (1160px) -->
    <div style="width:1160px;border-top:${B};border-left:${B};margin-bottom:6px;display:flex;box-sizing:content-box;">
      ${renderPenSide(data.teamAName, data.penaltiesA)}
      <div style="width:180px;">
        ${cell(180, 'Tỷ số luân lưu', { h: 22, bold: true, bg: '#f2f2f2' })}
        ${cell(180, `${esc(data.penaltyScoreA || '-')} : ${esc(data.penaltyScoreB || '-')}`, { h: 42, bold: true, fs: 13 })}
      </div>
      ${renderPenSide(data.teamBName, data.penaltiesB)}
    </div>

    <!-- Khối 6: Xác nhận Face ID (1160px, chỉ chữ) -->
    <div style="width:1160px;border-top:${B};border-left:${B};margin-bottom:10px;box-sizing:content-box;">
      ${cell(1160, 'XÁC NHẬN FACE ID ĐỘI TRƯỞNG HAI ĐỘI', { h: 22, bold: true, bg: '#f2f2f2' })}
      <div style="display:flex;">
        ${cell(
          580,
          `<div style="line-height:1.45;">
            <div><b>ĐỘI TRƯỞNG ĐỘI A (${esc(data.teamAName)}):</b> ${esc(data.captainAName || '....................')}</div>
            <div><span style="font-family:'Segoe UI Symbol',sans-serif;">${cbSymbol(data.captainAFaceVerified)}</span> <b>Đội trưởng đã xác nhận Face ID</b>${data.captainAFaceTime ? ` (${esc(data.captainAFaceTime)})` : ''}</div>
          </div>`,
          { h: 44, align: 'left' }
        )}
        ${cell(
          580,
          `<div style="line-height:1.45;">
            <div><b>ĐỘI TRƯỞNG ĐỘI B (${esc(data.teamBName)}):</b> ${esc(data.captainBName || '....................')}</div>
            <div><span style="font-family:'Segoe UI Symbol',sans-serif;">${cbSymbol(data.captainBFaceVerified)}</span> <b>Đội trưởng đã xác nhận Face ID</b>${data.captainBFaceTime ? ` (${esc(data.captainBFaceTime)})` : ''}</div>
          </div>`,
          { h: 44, align: 'left' }
        )}
      </div>
    </div>

    <!-- Khối 7: Chữ ký 4 cột (1160px) -->
    <div style="width:1160px;display:flex;font-size:12px;">
      ${[
        { title: 'HLV đội A', name: data.coachA },
        { title: 'Trọng tài', name: data.refereeName },
        { title: 'HLV đội B', name: data.coachB },
        { title: 'Giám sát trận đấu', name: data.supervisorName },
      ]
        .map(
          (s) => `
        <div style="width:290px;text-align:center;line-height:1.4;">
          <div style="font-weight:700;">${s.title}</div>
          <div style="font-style:italic;font-size:11px;">(Ký, ghi rõ họ tên)</div>
          <div style="height:44px;"></div>
          <div style="font-weight:700;">${esc(s.name)}</div>
        </div>`
        )
        .join('')}
    </div>
  </div>`;
}

/**
 * Xuất trực tiếp thành file .pdf tải về máy (dùng Flexbox px cố định để 100% thẳng hàng trên A4 ngang)
 */
export async function downloadFootballReportPdf(data: FootballReportData): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '1216px';
  host.style.padding = '22px 28px';
  host.style.background = '#ffffff';
  host.style.color = '#000000';
  host.style.boxSizing = 'border-box';
  host.style.zIndex = '-1';
  host.innerHTML = buildPdfFlexSheetHtml(data);
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    const canvas = await html2canvas(host, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 1216,
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;

    const ratio = Math.min(availW / canvas.width, availH / canvas.height);
    const renderW = canvas.width * ratio;
    const renderH = canvas.height * ratio;
    const offsetX = (pageW - renderW) / 2;
    const offsetY = (pageH - renderH) / 2;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
    pdf.save(`BienBan_BongDa_FITCUP_${makeReportSlug(data)}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
