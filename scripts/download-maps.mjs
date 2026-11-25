import fs from 'fs';
import path from 'path';

const API_URL = 'https://valorant-api.com/v1/maps';
const OUT_DIR = path.resolve('public/maps');
const DATA_FILE = path.resolve('src/data/valorant-maps.json');

const DEFAULT_ENABLED_MAPS = [
  'Summit',
  'Abyss',
  'Sunset',
  'Lotus',
  'Corrode',
  'Haven',
  'Bind',
];

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('📡 Đang lấy danh sách map từ Valorant API...');

  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API trả về lỗi HTTP ${res.status}`);
  const { data } = await res.json();

  // Chỉ giữ map thi đấu 5v5 (có tacticalDescription không rỗng)
  const maps = data.filter(
    (m) => m.tacticalDescription && m.tacticalDescription.trim() !== ''
  );

  // Loại trùng theo displayName nếu API có nhiều bản
  const uniqueMaps = [];
  const seen = new Set();
  for (const m of maps) {
    if (!seen.has(m.displayName)) {
      seen.add(m.displayName);
      uniqueMaps.push(m);
    }
  }

  console.log(`🗺️  Tìm thấy ${uniqueMaps.length} map 5v5.`);
  const result = [];

  for (const m of uniqueMaps) {
    const id = m.uuid;
    const name = m.displayName;
    console.log(`⬇️  Đang tải ảnh cho map: ${name}...`);

    const localSplash = `/maps/${id}-splash.png`;
    const localIcon = `/maps/${id}-icon.png`;
    const localMinimap = `/maps/${id}-minimap.png`;

    if (m.splash) {
      try {
        await downloadFile(m.splash, path.join(OUT_DIR, `${id}-splash.png`));
      } catch (e) {
        console.warn(`   ⚠️ Lỗi tải splash (${name}): ${e.message}`);
      }
    }

    if (m.listViewIconTall) {
      try {
        await downloadFile(m.listViewIconTall, path.join(OUT_DIR, `${id}-icon.png`));
      } catch (e) {
        console.warn(`   ⚠️ Lỗi tải listViewIconTall (${name}): ${e.message}`);
      }
    }

    if (m.displayIcon) {
      try {
        await downloadFile(m.displayIcon, path.join(OUT_DIR, `${id}-minimap.png`));
      } catch (e) {
        console.warn(`   ⚠️ Lỗi tải minimap (${name}): ${e.message}`);
      }
    }

    result.push({
      id,
      name,
      splash: m.splash || '',
      listViewIcon: m.listViewIconTall || m.listViewIcon || m.splash || '',
      minimap: m.displayIcon || '',
      enabled: DEFAULT_ENABLED_MAPS.includes(name),
      localSplash,
      localIcon,
    });
  }

  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n✅ Đã lưu ${result.length} map vào ${DATA_FILE}`);
}

main().catch((err) => {
  console.error('❌ Lỗi tải map:', err);
  process.exit(1);
});
