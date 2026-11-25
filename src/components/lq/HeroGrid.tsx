import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import HeroAvatar from './HeroAvatar';
import type { HeroRole, LQHero } from '../../types';

const ROLES: Array<HeroRole | 'all' | 'none'> = [
  'all',
  'Đấu sĩ',
  'Đỡ đòn',
  'Pháp sư',
  'Sát thủ',
  'Trợ thủ',
  'Xạ thủ',
  'none',
];

/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm không phân biệt dấu
 */
export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

interface HeroGridProps {
  heroes: LQHero[];
  bannedIds: Set<string>;
  pickedIds: Set<string>;
  selectedHeroId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

/**
 * Lưới chọn tướng Liên Quân Mobile với tìm kiếm không dấu & lọc theo vai trò
 */
export default function HeroGrid({
  heroes,
  bannedIds,
  pickedIds,
  selectedHeroId,
  onSelect,
  disabled = false,
}: HeroGridProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<HeroRole | 'all' | 'none'>('all');

  const filteredHeroes = useMemo(() => {
    const q = normalizeText(search);
    return heroes.filter((h) => {
      if (!h.visible) return false;
      if (roleFilter === 'none' && h.role !== '') return false;
      if (roleFilter !== 'all' && roleFilter !== 'none' && h.role !== roleFilter) {
        return false;
      }
      if (q && !normalizeText(h.name).includes(q) && !normalizeText(h.id).includes(q)) {
        return false;
      }
      return true;
    });
  }, [heroes, search, roleFilter]);

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      {/* Thanh tìm kiếm & lọc vai trò */}
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tướng (không cần gõ dấu)..."
            className="w-full bg-black/50 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400/60"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Bộ lọc vai trò */}
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => {
            const label =
              r === 'all' ? 'Tất cả' : r === 'none' ? 'Chưa gán' : r;
            const active = roleFilter === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-amber-500 text-white shadow'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lưới tướng */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-12 gap-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredHeroes.map((hero) => {
          const isBanned = bannedIds.has(hero.id);
          const isPicked = pickedIds.has(hero.id);
          const isUsed = isBanned || isPicked;
          const isSelected = selectedHeroId === hero.id;

          return (
            <motion.button
              key={hero.id}
              type="button"
              whileHover={!isUsed && !disabled ? { scale: 1.05 } : undefined}
              whileTap={!isUsed && !disabled ? { scale: 0.96 } : undefined}
              disabled={isUsed || disabled}
              onClick={() => !isUsed && !disabled && onSelect(hero.id)}
              className={`group relative flex flex-col items-center rounded-xl p-1 transition border ${
                isSelected
                  ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                  : isUsed
                  ? 'border-white/5 bg-black/40 hero-disabled'
                  : 'border-white/10 bg-black/30 hover:border-blue-400/60 hover:bg-blue-500/10'
              }`}
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-900">
                <HeroAvatar hero={hero} textSize="text-base" />

                {/* Overlay icon nếu đã Ban hoặc Pick */}
                {isBanned && (
                  <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center">
                    <span className="text-red-400 font-display font-black text-xl drop-shadow">
                      ✕
                    </span>
                  </div>
                )}
                {isPicked && (
                  <div className="absolute inset-0 bg-emerald-950/65 flex items-center justify-center">
                    <span className="text-emerald-400 font-display font-black text-xl drop-shadow">
                      ✓
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`mt-1 text-[11px] font-semibold truncate w-full text-center ${
                  isSelected ? 'text-amber-300' : 'text-gray-200'
                }`}
              >
                {hero.name}
              </span>
            </motion.button>
          );
        })}

        {filteredHeroes.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-500 text-sm">
            Không tìm thấy tướng phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}
