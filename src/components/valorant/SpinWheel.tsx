import { useEffect, useRef, useState } from 'react';
import type { ValorantMap } from '../../types';

const SLICE_COLORS = [
  '#ff4655',
  '#1f2937',
  '#dc2626',
  '#111827',
  '#e11d48',
  '#334155',
  '#b91c1c',
  '#0f172a',
];

interface SpinWheelProps {
  maps: ValorantMap[];
  targetMapId: string | null;
  isSpinning: boolean;
  duration: number; // giây (3-10)
  triggerId: number;
  onTick?: () => void;
  onFinish?: () => void;
  size?: number;
}

/**
 * Kiểu 1: Vòng quay may mắn (Wheel) 60fps bằng SVG + requestAnimationFrame
 * Kết quả đã được quyết định trước qua targetMapId, wheel quay và dừng đúng kim chỉ trên đỉnh
 */
export default function SpinWheel({
  maps,
  targetMapId,
  isSpinning,
  duration,
  triggerId,
  onTick,
  onFinish,
  size = 460,
}: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const rotRef = useRef(0);
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);
  onTickRef.current = onTick;
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (!isSpinning || !targetMapId || maps.length === 0) return;

    const targetIndex = maps.findIndex((m) => m.id === targetMapId);
    if (targetIndex < 0) return;

    const sliceAngle = 360 / maps.length;
    // Tâm của múi targetIndex tính từ góc 0 ở đỉnh (12 giờ):
    // Múi i chiếm [i * sliceAngle, (i+1) * sliceAngle] theo chiều kim đồng hồ
    // Để đưa tâm múi targetIndex lên đỉnh (0 độ), wheel cần xoay góc (360 - centerAngle) mod 360
    const centerAngle = targetIndex * sliceAngle + sliceAngle / 2;
    const desiredMod = (360 - centerAngle + 360) % 360;

    const startRot = rotRef.current;
    const currentMod = ((startRot % 360) + 360) % 360;
    const deltaMod = (desiredMod - currentMod + 360) % 360;

    // Số vòng quay thêm dựa trên duration (5 - 10 vòng)
    const extraSpins = Math.max(5, Math.round(duration * 1.2)) * 360;
    // Thêm chút lệch ngẫu nhiên trong phạm vi ±30% múi cho tự nhiên nhưng vẫn trúng chắc chắn
    const totalDelta = extraSpins + deltaMod;
    const endRot = startRot + totalDelta;

    const durationMs = Math.max(1000, duration * 1000);
    const startTime = performance.now();
    let lastSliceBoundary = Math.floor(startRot / sliceAngle);
    let rafId = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Easing giảm tốc tự nhiên (quartic ease-out)
      const eased = 1 - Math.pow(1 - t, 4);
      const currentRot = startRot + totalDelta * eased;

      rotRef.current = currentRot;
      setRotation(currentRot);

      const sliceStep = Math.floor(currentRot / sliceAngle);
      if (sliceStep !== lastSliceBoundary) {
        lastSliceBoundary = sliceStep;
        onTickRef.current?.();
      }

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        onFinishRef.current?.();
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isSpinning, targetMapId, triggerId, duration, maps]);

  const radius = size / 2;
  const sliceDeg = maps.length > 0 ? 360 / maps.length : 360;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeSlice = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(radius, radius, radius - 8, endAngle);
    const end = polarToCartesian(radius, radius, radius - 8, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M',
      radius,
      radius,
      'L',
      start.x,
      start.y,
      'A',
      radius - 8,
      radius - 8,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      'Z',
    ].join(' ');
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Kim chỉ ở đỉnh 12 giờ */}
      <div
        className="z-20 -mb-4 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]"
      />

      {/* Bánh xe */}
      <div
        className="rounded-full p-2 bg-gradient-to-br from-[#ff4655] via-amber-400 to-[#ff4655] shadow-[0_0_50px_rgba(255,70,85,0.4)]"
        style={{ width: size + 16, height: size + 16 }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: `rotate(${rotation}deg)` }}
          className="rounded-full bg-[#0f1923]"
        >
          {maps.map((m, i) => {
            const startAngle = i * sliceDeg;
            const endAngle = (i + 1) * sliceDeg;
            const midAngle = startAngle + sliceDeg / 2;
            const color = SLICE_COLORS[i % SLICE_COLORS.length];

            return (
              <g key={m.id}>
                <path
                  d={describeSlice(startAngle, endAngle)}
                  fill={color}
                  stroke="#ece8e1"
                  strokeWidth="2"
                />
                <text
                  x={radius}
                  y={radius - radius * 0.62}
                  fill="#ffffff"
                  fontSize={maps.length > 9 ? 14 : 17}
                  fontWeight="800"
                  fontFamily="'Chakra Petch', 'Be Vietnam Pro', sans-serif"
                  textAnchor="middle"
                  transform={`rotate(${midAngle}, ${radius}, ${radius})`}
                >
                  {m.name.toUpperCase()}
                </text>
              </g>
            );
          })}
          {/* Tâm bánh xe */}
          <circle
            cx={radius}
            cy={radius}
            r={size * 0.08}
            fill="#0f1923"
            stroke="#fbbf24"
            strokeWidth="4"
          />
        </svg>
      </div>
    </div>
  );
}
