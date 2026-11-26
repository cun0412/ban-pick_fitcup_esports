import type { HeroRole } from '../../types';

interface HeroRoleBadgeProps {
  role?: HeroRole;
  accentColor: string;
  size?: number;
}

/**
 * Icon vai trò Liên Quân Mobile (SVG sắc nét chuẩn HUD broadcast)
 */
export default function HeroRoleBadge({
  role,
  accentColor,
  size = 28,
}: HeroRoleBadgeProps) {
  const renderIcon = () => {
    switch (role) {
      case 'Đấu sĩ':
        // Kiếm chéo (Solo / Fighter)
        return (
          <path
            d="M18.5 3.5L15 4.2l-5.6 5.6-2-2-1.4 1.4 2 2L4.2 15 3.5 18.5l3.5-.7 3.8-3.8 2 2 1.4-1.4-2-2 5.6-5.6.7-3.5z"
            fill="currentColor"
          />
        );
      case 'Pháp sư':
        // Tia ma pháp / tinh thể (Mid / Mage)
        return (
          <path
            d="M11 2l2.1 5.9L19 10l-5.9 2.1L11 18l-2.1-5.9L3 10l5.9-2.1L11 2zm6 12l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1 1-2.6z"
            fill="currentColor"
          />
        );
      case 'Xạ thủ':
        // Mục tiêu / cung (AD / Marksman)
        return (
          <>
            <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <circle cx="11" cy="11" r="2.2" fill="currentColor" />
            <path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        );
      case 'Sát thủ':
        // Song đao / mũi nhọn (Jungle / Assassin)
        return (
          <path
            d="M17.8 3.2L10.6 10.4 8.2 8 6.8 9.4l2.4 2.4-5.4 5.4 1 1 5.4-5.4 2.4 2.4 1.4-1.4-2.4-2.4 7.2-7.2-.9-.9zM4.4 3.2l4.4 4.4-1.4 1.4L3.5 4.1l.9-.9z"
            fill="currentColor"
          />
        );
      case 'Đỡ đòn':
        // Khiên giáp (Tank)
        return (
          <path
            d="M11 2.5L4 5.5v5.2c0 4.6 3 8.8 7 10 4-1.2 7-5.4 7-10V5.5l-7-3zm0 4.2l3.8 1.6v2.7c0 2.7-1.6 5.2-3.8 6.1-2.2-.9-3.8-3.4-3.8-6.1V8.3L11 6.7z"
            fill="currentColor"
          />
        );
      case 'Trợ thủ':
        // Khiên đôi cánh (Support)
        return (
          <path
            d="M11 3L5 5.6v4.6c0 4 2.6 7.6 6 8.8 3.4-1.2 6-4.8 6-8.8V5.6L11 3zm1 4.5v2.2h2.2v1.8H12v2.2h-1.8v-2.2H8V9.7h2.2V7.5H12z"
            fill="currentColor"
          />
        );
      default:
        // Kim cương Liên Quân mặc định
        return (
          <path
            d="M11 2.5L17.5 11 11 19.5 4.5 11 11 2.5zm0 4L7.8 11 11 15.5 14.2 11 11 6.5z"
            fill="currentColor"
          />
        );
    }
  };

  return (
    <div
      className="flex items-center justify-center border border-white/25 text-white shadow-md"
      style={{
        width: size,
        height: size,
        backgroundColor: accentColor,
        boxShadow: `0 0 12px ${accentColor}88`,
      }}
      title={role || 'Tướng'}
    >
      <svg viewBox="0 0 22 22" className="w-[68%] h-[68%]">
        {renderIcon()}
      </svg>
    </div>
  );
}
