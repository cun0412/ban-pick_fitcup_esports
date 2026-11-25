import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroAvatar from '../../components/lq/HeroAvatar';
import { normalizeText } from '../../components/lq/HeroGrid';
import {
  fetchHeroOverrides,
  saveHeroOverrides,
  type HeroOverridePayload,
} from '../../lib/api';
import {
  buildMergedHeroes,
  useLQStore,
  type HeroOverride,
} from '../../stores/lqStore';
import type { HeroRole, LQHero } from '../../types';

const ROLE_OPTIONS: HeroRole[] = [
  'Đấu sĩ',
  'Đỡ đòn',
  'Pháp sư',
  'Sát thủ',
  'Trợ thủ',
  'Xạ thủ',
  '',
];

/**
 * Trang quản trị dữ liệu tướng Liên Quân (lưu trực tiếp qua Backend API /api/heroes)
 */
export default function LQAdmin() {
  const refreshStore = useLQStore((s) => s.refreshHeroes);
  const [overrides, setOverrides] = useState<Record<string, HeroOverride>>({});
  const [heroes, setHeroes] = useState<LQHero[]>(() => buildMergedHeroes());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchRole, setBatchRole] = useState<HeroRole>('Đấu sĩ');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const applyLocalOverrides = (nextOv: Record<string, HeroOverride>) => {
    setOverrides(nextOv);
    setHeroes(buildMergedHeroes(nextOv));
    refreshStore();
  };

  useEffect(() => {
    fetchHeroOverrides().then((cloudOv) => {
      applyLocalOverrides(cloudOv);
    });
  }, []);

  const saveSingleOverride = async (id: string, patch: HeroOverride) => {
    const heroBase = heroes.find((h) => h.id === id);
    const prev = overrides[id] || {};
    const nextEntry: HeroOverride = {
      role: patch.role !== undefined ? patch.role : prev.role ?? heroBase?.role ?? '',
      visible:
        patch.visible !== undefined
          ? patch.visible
          : prev.visible ?? heroBase?.visible ?? true,
      image: patch.image !== undefined ? patch.image : prev.image,
    };
    const nextOv = { ...overrides, [id]: nextEntry };
    applyLocalOverrides(nextOv);

    await saveHeroOverrides([
      {
        hero_id: id,
        role: (nextEntry.role ?? '') as HeroRole,
        visible: nextEntry.visible ?? true,
        ...(nextEntry.image ? { image: nextEntry.image } : {}),
      },
    ]);
  };

  const handleBatchAssign = async () => {
    if (selectedIds.size === 0) return;
    const nextOv = { ...overrides };
    const batchItems: HeroOverridePayload[] = [];

    selectedIds.forEach((id) => {
      const heroBase = heroes.find((h) => h.id === id);
      const prev = nextOv[id] || {};
      const nextEntry: HeroOverride = {
        ...prev,
        role: batchRole,
        visible: prev.visible ?? heroBase?.visible ?? true,
      };
      nextOv[id] = nextEntry;
      batchItems.push({
        hero_id: id,
        role: batchRole,
        visible: nextEntry.visible ?? true,
      });
    });

    applyLocalOverrides(nextOv);
    setSelectedIds(new Set());
    await saveHeroOverrides(batchItems);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUploadImage = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        setBrokenImages((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await saveSingleOverride(id, { image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(overrides, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lq-role-overrides.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (typeof parsed === 'object' && parsed !== null) {
          const items: HeroOverridePayload[] = Object.entries(parsed).map(
            ([hero_id, val]: [string, any]) => ({
              hero_id,
              role: (val?.role ?? '') as HeroRole,
              visible: val?.visible ?? true,
              ...(val?.image ? { image: val.image } : {}),
            })
          );
          await saveHeroOverrides(items);
          applyLocalOverrides(parsed);
          alert('Đã nhập và lưu dữ liệu thành công!');
        }
      } catch {
        alert('File JSON không hợp lệ.');
      }
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => {
    const q = normalizeText(search);
    return heroes.filter((h) => {
      if (filterRole === 'none' && h.role !== '') return false;
      if (filterRole === 'hidden' && h.visible) return false;
      if (
        filterRole !== 'all' &&
        filterRole !== 'none' &&
        filterRole !== 'hidden' &&
        h.role !== filterRole
      ) {
        return false;
      }
      if (q && !normalizeText(h.name).includes(q) && !normalizeText(h.id).includes(q)) {
        return false;
      }
      return true;
    });
  }, [heroes, search, filterRole]);

  const duplicateNames = useMemo(() => {
    const map = new Map<string, LQHero[]>();
    heroes.forEach((h) => {
      const list = map.get(h.name) || [];
      list.push(h);
      map.set(h.name, list);
    });
    return [...map.entries()].filter(([, list]) => list.length > 1);
  }, [heroes]);

  const unassignedCount = heroes.filter((h) => !h.role).length;

  return (
    <div className="min-h-screen bg-[#070b14] text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              to="/lq/control"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              ← Về Ban/Pick
            </Link>
            <div>
              <h1 className="font-display font-bold text-xl text-amber-300">
                QUẢN TRỊ TƯỚNG LIÊN QUÂN ({heroes.length})
              </h1>
              <p className="text-xs text-gray-400">
                Chưa gán vai trò: <strong className="text-white">{unassignedCount}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold"
            >
              ⬇️ Export JSON
            </button>
            <label className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold cursor-pointer">
              ⬆️ Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </header>

        {(duplicateNames.length > 0 || brokenImages.size > 0) && (
          <div className="glass rounded-xl p-4 border border-amber-500/30 space-y-2 text-xs">
            <div className="font-display font-bold text-amber-300">
              📋 BÁO CÁO DỮ LIỆU TƯỚNG
            </div>
            {duplicateNames.length > 0 && (
              <div>
                <span className="text-gray-300 font-semibold">Tên trùng nhau: </span>
                {duplicateNames.map(([name, list]) => (
                  <span
                    key={name}
                    className="inline-block mr-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-200"
                  >
                    {name} ({list.map((x) => x.id).join(', ')})
                  </span>
                ))}
              </div>
            )}
            {brokenImages.size > 0 && (
              <div className="text-red-300">
                Thiếu/lỗi ảnh ({brokenImages.size}): {[...brokenImages].join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên / slug..."
              className="bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:border-amber-400"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="none">Chưa gán vai trò</option>
              <option value="hidden">Đang bị ẩn</option>
              {ROLE_OPTIONS.filter(Boolean).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                else setSelectedIds(new Set(filtered.map((h) => h.id)));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              {selectedIds.size === filtered.length && filtered.length > 0
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả đang lọc'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300">
              Đã chọn: <strong>{selectedIds.size}</strong>
            </span>
            <select
              value={batchRole}
              onChange={(e) => setBatchRole(e.target.value as HeroRole)}
              className="bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r || 'empty'} value={r}>
                  {r || '(Xóa vai trò)'}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleBatchAssign}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs disabled:opacity-40"
            >
              Gán hàng loạt
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((hero) => {
            const checked = selectedIds.has(hero.id);
            return (
              <div
                key={hero.id}
                className={`rounded-xl p-2.5 border transition flex flex-col gap-2 ${
                  checked
                    ? 'border-amber-400 bg-amber-500/15'
                    : hero.visible
                    ? 'border-white/10 bg-white/[0.03]'
                    : 'border-red-500/30 bg-red-950/20 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold truncate">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleSelect(hero.id)}
                    />
                    <span className="truncate">{hero.name}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => saveSingleOverride(hero.id, { visible: !hero.visible })}
                    title={hero.visible ? 'Ẩn tướng' : 'Hiện tướng'}
                    className="text-xs px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20"
                  >
                    {hero.visible ? '👁️' : '🙈'}
                  </button>
                </div>

                <label className="relative aspect-square rounded-lg overflow-hidden bg-slate-900 cursor-pointer group">
                  <HeroAvatar hero={hero} textSize="text-2xl" />
                  <img
                    src={hero.image}
                    alt=""
                    className="hidden"
                    onError={() =>
                      setBrokenImages((prev) => new Set(prev).add(hero.id))
                    }
                  />
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold transition">
                    📷 Đổi ảnh
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadImage(hero.id, e)}
                    className="hidden"
                  />
                </label>

                <div className="text-[10px] text-gray-500 truncate">{hero.id}</div>

                <select
                  value={hero.role}
                  onChange={(e) =>
                    saveSingleOverride(hero.id, { role: e.target.value as HeroRole })
                  }
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-white"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r || 'empty'} value={r}>
                      {r || '-- Chưa gán --'}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
