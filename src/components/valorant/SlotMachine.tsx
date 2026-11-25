import { useEffect, useMemo, useRef, useState } from 'react';
import type { ValorantMap } from '../../types';

interface SlotMachineProps {
  maps: ValorantMap[];
  targetMapId: string | null;
  isSpinning: boolean;
  duration: number;
  triggerId: number;
  onTick?: () => void;
  onFinish?: () => void;
  itemHeight?: number;
  width?: number;
}

/**
 * Kiểu 2: Slot machine / cuộn dọc 60fps
 * Ảnh map chạy nhanh theo chiều dọc rồi chậm dần và dừng chính xác giữa khung ngắm
 */
export default function SlotMachine({
  maps,
  targetMapId,
  isSpinning,
  duration,
  triggerId,
  onTick,
  onFinish,
  itemHeight = 140,
  width = 480,
}: SlotMachineProps) {
  // Tạo dải lặp dài để cuộn mượt
  const loops = 10;
  const reel = useMemo(() => {
    const arr: ValorantMap[] = [];
    for (let l = 0; l < loops; l++) {
      arr.push(...maps);
    }
    return arr;
  }, [maps]);

  const [offsetY, setOffsetY] = useState(0);
  const [speedBlur, setSpeedBlur] = useState(false);
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);
  onTickRef.current = onTick;
  onFinishRef.current = onFinish;

  const viewportHeight = itemHeight * 3;
  const centerOffset = itemHeight; // Item thứ 2 nằm chính giữa viewport 3 ô

  useEffect(() => {
    if (!isSpinning || !targetMapId || maps.length === 0) return;

    const targetIdx = maps.findIndex((m) => m.id === targetMapId);
    if (targetIdx < 0) return;

    // Dừng ở vòng gần cuối (loop thứ 8)
    const targetReelIndex = (loops - 2) * maps.length + targetIdx;
    const endY = targetReelIndex * itemHeight - centerOffset;
    const startY = 0;
    const totalDist = endY - startY;

    const durationMs = Math.max(1000, duration * 1000);
    const startTime = performance.now();
    let lastItemBoundary = 0;
    let rafId = 0;

    setSpeedBlur(true);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 4);
      const currentY = startY + totalDist * eased;

      setOffsetY(currentY);
      setSpeedBlur(t < 0.65);

      const step = Math.floor(currentY / itemHeight);
      if (step !== lastItemBoundary) {
        lastItemBoundary = step;
        onTickRef.current?.();
      }

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setSpeedBlur(false);
        onFinishRef.current?.();
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isSpinning, targetMapId, triggerId, duration, maps, itemHeight, centerOffset]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2 border-[#ff4655] bg-[#0f1923] shadow-[0_0_45px_rgba(255,70,85,0.35)] mx-auto"
      style={{ width, height: viewportHeight }}
    >
      {/* Dải cuộn */}
      <div
        style={{
          transform: `translate3d(0, -${offsetY}px, 0)`,
          filter: speedBlur ? 'blur(1.5px)' : 'none',
        }}
        className="will-change-transform"
      >
        {reel.map((m, idx) => (
          <div
            key={`${m.id}-${idx}`}
            style={{ height: itemHeight }}
            className="relative border-b border-white/10 overflow-hidden flex items-center justify-center"
          >
            <img
              src={m.localSplash || m.splash}
              alt={m.name}
              onError={(e) => {
                if (m.splash) e.currentTarget.src = m.splash;
              }}
              className="absolute inset-0 w-full h-full object-cover brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-transparent to-black/75" />
            <span className="relative z-10 font-display font-black text-3xl tracking-widest text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
              {m.name}
            </span>
          </div>
        ))}
      </div>

      {/* Khung ngắm trung tâm */}
      <div
        className="pointer-events-none absolute inset-x-0 border-y-4 border-amber-400 bg-amber-400/5 shadow-[inset_0_0_30px_rgba(251,191,36,0.3)]"
        style={{ top: centerOffset, height: itemHeight }}
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-400 text-2xl">
          ▶
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 text-2xl">
          ◀
        </div>
      </div>

      {/* Che tối trên/dưới */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  );
}
