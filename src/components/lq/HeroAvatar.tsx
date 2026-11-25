import { useState, useEffect } from 'react';
import type { HeroRole, LQHero } from '../../types';

// Màu placeholder theo vai trò
const ROLE_COLORS: Record<HeroRole, string> = {
  'Đấu sĩ': 'from-orange-600 to-amber-700',
  'Đỡ đòn': 'from-blue-600 to-indigo-800',
  'Pháp sư': 'from-purple-600 to-fuchsia-800',
  'Sát thủ': 'from-red-600 to-rose-900',
  'Trợ thủ': 'from-emerald-600 to-teal-800',
  'Xạ thủ': 'from-yellow-500 to-amber-700',
  '': 'from-slate-600 to-slate-800',
};

interface HeroAvatarProps {
  hero?: LQHero | null;
  className?: string;
  imgClassName?: string;
  textSize?: string;
  eager?: boolean;
}

/**
 * Hiển thị ảnh tướng; nếu ảnh lỗi hoặc thiếu thì hiện placeholder chữ cái đầu + màu theo vai trò
 */
export default function HeroAvatar({
  hero,
  className = 'w-full h-full',
  imgClassName = 'w-full h-full object-cover',
  textSize = 'text-lg',
  eager = false,
}: HeroAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [hero?.image, hero?.id]);

  if (!hero) {
    return (
      <div className={`${className} bg-slate-900/60 flex items-center justify-center`} />
    );
  }

  const gradient = ROLE_COLORS[hero.role || ''] || ROLE_COLORS[''];
  const initials = hero.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  if (hasError || !hero.image) {
    return (
      <div
        className={`${className} bg-gradient-to-br ${gradient} flex items-center justify-center font-display font-bold text-white select-none`}
      >
        <span className={textSize}>{initials || '?'}</span>
      </div>
    );
  }

  return (
    <img
      src={hero.image}
      alt={hero.name}
      className={`${className} ${imgClassName}`}
      onError={() => setHasError(true)}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
