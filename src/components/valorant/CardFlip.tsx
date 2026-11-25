import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ValorantMap } from '../../types';

interface CardFlipProps {
  maps: ValorantMap[];
  targetMapId: string | null;
  isSpinning: boolean;
  duration: number;
  triggerId: number;
  onTick?: () => void;
  onFinish?: () => void;
}

/**
 * Kiểu 3: Lật thẻ / nhảy sáng (Card Highlight)
 * Đèn highlight nhảy lần lượt qua các thẻ map, chậm dần rồi lật + phóng to ở map trúng
 */
export default function CardFlip({
  maps,
  targetMapId,
  isSpinning,
  duration,
  triggerId,
  onTick,
  onFinish,
}: CardFlipProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [lockedIndex, setLockedIndex] = useState<number>(-1);
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);
  onTickRef.current = onTick;
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (!isSpinning || !targetMapId || maps.length === 0) return;

    const targetIdx = maps.findIndex((m) => m.id === targetMapId);
    if (targetIdx < 0) return;

    setLockedIndex(-1);

    // Tổng số bước nhảy (ít nhất 3 vòng + dừng đúng targetIdx)
    const totalSteps = Math.max(20, maps.length * 4) + targetIdx;
    const durationMs = Math.max(1000, duration * 1000);
    const startTime = performance.now();
    let prevStep = -1;
    let rafId = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Nghịch đảo ease-out để bước nhảy thưa dần về cuối
      const eased = 1 - Math.pow(1 - t, 3.2);
      const currentStep = Math.min(totalSteps, Math.floor(eased * totalSteps));

      if (currentStep !== prevStep) {
        prevStep = currentStep;
        setActiveIndex(currentStep % maps.length);
        onTickRef.current?.();
      }

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setActiveIndex(targetIdx);
        setLockedIndex(targetIdx);
        onFinishRef.current?.();
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isSpinning, targetMapId, triggerId, duration, maps]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl mx-auto">
      {maps.map((m, idx) => {
        const isHighlighted = idx === activeIndex;
        const isLocked = idx === lockedIndex;

        return (
          <motion.div
            key={m.id}
            animate={
              isLocked
                ? { scale: 1.12, rotateY: [0, 360] }
                : isHighlighted
                ? { scale: 1.06 }
                : { scale: 1 }
            }
            transition={{ duration: isLocked ? 0.6 : 0.1 }}
            className={`relative w-44 h-28 rounded-xl overflow-hidden border-2 transition ${
              isLocked
                ? 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.8)] z-10'
                : isHighlighted
                ? 'border-[#ff4655] shadow-[0_0_25px_rgba(255,70,85,0.85)]'
                : 'border-white/15 opacity-55'
            }`}
          >
            <img
              src={m.localSplash || m.splash}
              alt={m.name}
              onError={(e) => {
                if (m.splash) e.currentTarget.src = m.splash;
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            {(isHighlighted || isLocked) && (
              <div className="absolute inset-0 border-2 border-white/60 rounded-xl pointer-events-none" />
            )}
            <div className="absolute bottom-2 inset-x-2 flex items-center justify-between">
              <span className="font-display font-black text-sm uppercase text-white tracking-wider">
                {m.name}
              </span>
              {isLocked && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black">
                  TRÚNG
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
