import fs from 'fs';
import path from 'path';

// Tìm file heroes.json ở Hero/heroes.json, public/heroes/heroes.json hoặc ./heroes.json
const candidatePaths = [
  path.resolve('public/heroes/heroes.json'),
  path.resolve('Hero/heroes.json'),
  path.resolve('heroes.json'),
];

const heroesJsonPath = candidatePaths.find((p) => fs.existsSync(p));
if (!heroesJsonPath) {
  console.error('❌ Không tìm thấy heroes.json ở public/heroes/, Hero/, hoặc thư mục gốc.');
  process.exit(1);
}

console.log(`📖 Đang đọc dữ liệu từ: ${heroesJsonPath}`);
const heroesRaw = JSON.parse(fs.readFileSync(heroesJsonPath, 'utf8'));

// Liệt kê file ảnh trong public/heroes/
const heroesDir = path.resolve('public/heroes');
if (!fs.existsSync(heroesDir)) {
  fs.mkdirSync(heroesDir, { recursive: true });
}

const imageFiles = fs
  .readdirSync(heroesDir)
  .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

// Map slug (tên file không đuôi) -> tên file đầy đủ
const imageMap = new Map();
for (const f of imageFiles) {
  const slug = path.parse(f).name;
  imageMap.set(slug, f);
}

const outPath = path.resolve('src/data/lq-heroes.json');

// Đọc lại lq-heroes.json hiện có (nếu có) để không làm mất vai trò/visible đã gán
const existingMap = new Map();
if (fs.existsSync(outPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    for (const item of prev) {
      existingMap.set(item.id, item);
    }
  } catch {}
}

const result = [];
const missingImages = [];
const extraImages = new Set(imageMap.keys());
const nameGroups = new Map();

for (const hero of heroesRaw) {
  const slug = hero.slug;
  extraImages.delete(slug);

  if (!nameGroups.has(hero.name)) {
    nameGroups.set(hero.name, []);
  }
  nameGroups.get(hero.name).push(slug);

  const matchedFile = imageMap.get(slug);
  if (!matchedFile) {
    missingImages.push({ slug, name: hero.name });
  }

  const prevHero = existingMap.get(slug);

  // Bỏ qua trường src gốc, dùng ảnh local /heroes/<slug>.<ext>
  result.push({
    id: slug,
    name: hero.name,
    role: prevHero?.role ?? '',
    image: matchedFile ? `/heroes/${matchedFile}` : `/heroes/${slug}.png`,
    visible: prevHero?.visible ?? true,
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

console.log(`✅ Đã sinh ${outPath} với ${result.length} tướng.`);
console.log(`🖼️  Tổng số ảnh trong public/heroes/: ${imageFiles.length}`);

// Báo cáo chi tiết
console.log('\n========== BÁO CÁO ĐỐI CHIẾU ==========');

if (missingImages.length > 0) {
  console.log(`\n⚠️  Slug có trong JSON nhưng THIẾU ẢNH (${missingImages.length}):`);
  missingImages.forEach((h) => console.log(`   - ${h.slug} (${h.name})`));
} else {
  console.log('\n✅ Không có tướng nào thiếu ảnh.');
}

if (extraImages.size > 0) {
  console.log(`\n📁 Ảnh THỪA không có trong JSON (${extraImages.size}):`);
  [...extraImages].forEach((slug) => console.log(`   - ${imageMap.get(slug)}`));
} else {
  console.log('\n✅ Không có ảnh thừa ngoài JSON.');
}

const duplicates = [...nameGroups.entries()].filter(([, slugs]) => slugs.length > 1);
if (duplicates.length > 0) {
  console.log(`\n🔄 Danh sách TÊN TRÙNG NHAU (${duplicates.length}):`);
  duplicates.forEach(([name, slugs]) => {
    console.log(`   - "${name}" (${slugs.length} slug): ${slugs.join(', ')}`);
  });
} else {
  console.log('\n✅ Không có tên tướng trùng nhau.');
}

console.log('\n=======================================\n');
