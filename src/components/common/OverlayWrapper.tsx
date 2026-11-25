import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';

interface OverlayWrapperProps {
  children: React.ReactNode;
  bgOverride?: 'transparent' | 'chroma' | 'dark';
  className?: string;
}

/**
 * Wrapper cho các trang Overlay (1920x1080)
 * Tự động scale theo kích thước cửa sổ OBS/trình duyệt và hỗ trợ chọn nền qua ?bg=
 */
export default function OverlayWrapper({
  children,
  bgOverride,
  className = '',
}: OverlayWrapperProps) {
  const [searchParams] = useSearchParams();
  const storeBg = useSettingsStore((s) => s.overlayBg);
  const [scale, setScale] = useState(1);

  const bgParam = searchParams.get('bg') as 'transparent' | 'chroma' | 'dark' | null;
  const bgMode = bgParam || bgOverride || storeBg || 'dark';

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Cập nhật màu nền body để khi dùng transparent/chroma trong OBS không bị nền mặc định che
  useEffect(() => {
    const prevClass = document.body.className;
    if (bgMode === 'transparent') {
      document.body.style.background = 'transparent';
    } else if (bgMode === 'chroma') {
      document.body.style.background = '#00ff00';
    } else {
      document.body.style.background = '#0a0e1a';
    }
    return () => {
      document.body.className = prevClass;
      document.body.style.background = '';
    };
  }, [bgMode]);

  const bgClass =
    bgMode === 'transparent'
      ? 'overlay-transparent'
      : bgMode === 'chroma'
      ? 'overlay-chroma'
      : 'overlay-dark';

  return (
    <div className={`w-screen h-screen overflow-hidden relative ${bgClass}`}>
      <div
        className={`overlay-container relative overflow-hidden ${className}`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}
