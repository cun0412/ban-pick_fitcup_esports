import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
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
 * Xoay trực tiếp qua DOM ref (không re-render React 60fps, không bị giật lúc dừng)
 */
function SpinWheelInner({
  maps,
  targetMapId,
  isSpinning,
  duration,
  triggerId,
  onTick,
  onFinish,
  size = 460,
}: SpinWheelProps) {
  const uid = useId().replace(/:/g, '');
  const [fallbackSplashIds, setFallbackSplashIds] = useState<Record<string, boolean>>({});
  const rotatorRef = useRef<HTMLDivElement | null>(null);
  const rotRef = useRef(0);
  const mapsRef = useRef(maps);
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);
  mapsRef.current = maps;
  onTickRef.current = onTick;
  onFinishRef.current = onFinish;

  // Giữ transform khớp rotRef khi mount lần đầu
  useEffect(() => {
    if (rotatorRef.current) {
      rotatorRef.current.style.transform = `rotate(${rotRef.current}deg) translateZ(0)`;
    }
  }, []);

  useEffect(() => {
    const currentMaps = mapsRef.current;
    if (!isSpinning || !targetMapId || currentMaps.length === 0) return;

    const targetIndex = currentMaps.findIndex((m) => m.id === targetMapId);
    if (targetIndex < 0) return;

    const sliceAngle = 360 / currentMaps.length;
    const centerAngle = targetIndex * sliceAngle + sliceAngle / 2;
    const desiredMod = (360 - centerAngle + 360) % 360;

    const startRot = rotRef.current;
    const currentMod = ((startRot % 360) + 360) % 360;
    const deltaMod = (desiredMod - currentMod + 360) % 360;

    const extraSpins = Math.max(5, Math.round(duration * 1.2)) * 360;
    const totalDelta = extraSpins + deltaMod;

    const durationMs = Math.max(1000, duration * 1000);
    const startTime = performance.now();
    let lastSliceBoundary = Math.floor(startRot / sliceAngle);
    let rafId = 0;

    const applyRotation = (deg: number) => {
      rotRef.current = deg;
      if (rotatorRef.current) {
        rotatorRef.current.style.transform = `rotate(${deg}deg) translateZ(0)`;
      }
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Easing giảm tốc tự nhiên (cubic-quartic blend mượt đến cuối)
      const eased = 1 - Math.pow(1 - t, 4);
      const currentRot = startRot + totalDelta * eased;

      applyRotation(currentRot);

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
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isSpinning, targetMapId, triggerId, duration]);

  const wheelSvg = useMemo(() => {
    const radius = size / 2;
    const outerRadius = radius - 8;
    const sliceDeg = maps.length > 0 ? 360 / maps.length : 360;

    const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
      const rad = ((angleDeg - 90) * Math.PI) / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const describeSlice = (startAngle: number, endAngle: number) => {
      const start = polarToCartesian(radius, radius, outerRadius, endAngle);
      const end = polarToCartesian(radius, radius, outerRadius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
      return [
        'M',
        radius,
        radius,
        'L',
        start.x,
        start.y,
        'A',
        outerRadius,
        outerRadius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y,
        'Z',
      ].join(' ');
    };

    const sliceImgWidth =
      maps.length <= 2
        ? size
        : Math.max(
            outerRadius * 1.18,
            2 * outerRadius * Math.sin((sliceDeg * Math.PI) / 360) + 16
          );
    const sliceImgHeight = maps.length === 1 ? size : outerRadius + 8;

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block rounded-full bg-[#0f1923]"
      >
        <defs>
          <radialGradient id={`${uid}-vignette`} cx="50%" cy="50%" r="50%">
            <stop offset="15%" stopColor="#070b14" stopOpacity="0.88" />
            <stop offset="68%" stopColor="#070b14" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#070b14" stopOpacity="0.22" />
          </radialGradient>

          {maps.map((m, i) => {
            const startAngle = i * sliceDeg;
            const endAngle = (i + 1) * sliceDeg;
            return (
              <clipPath key={`clip-${m.id}`} id={`${uid}-slice-${i}`}>
                {maps.length === 1 ? (
                  <circle cx={radius} cy={radius} r={outerRadius} />
                ) : (
                  <path d={describeSlice(startAngle, endAngle)} />
                )}
              </clipPath>
            );
          })}
        </defs>

        {maps.map((m, i) => {
          const startAngle = i * sliceDeg;
          const endAngle = (i + 1) * sliceDeg;
          const midAngle = startAngle + sliceDeg / 2;
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          const useRemoteFallback = fallbackSplashIds[m.id];
          const imgSrc = useRemoteFallback ? m.splash : m.localSplash || m.splash;

          return (
            <g key={m.id}>
              {maps.length === 1 ? (
                <circle cx={radius} cy={radius} r={outerRadius} fill={color} />
              ) : (
                <path d={describeSlice(startAngle, endAngle)} fill={color} />
              )}

              {imgSrc && (
                <g clipPath={`url(#${uid}-slice-${i})`}>
                  <image
                    href={imgSrc}
                    x={maps.length === 1 ? 0 : radius - sliceImgWidth / 2}
                    y={maps.length === 1 ? 0 : 4}
                    width={sliceImgWidth}
                    height={sliceImgHeight}
                    preserveAspectRatio="xMidYMid slice"
                    transform={
                      maps.length === 1
                        ? undefined
                        : `rotate(${midAngle}, ${radius}, ${radius})`
                    }
                    onError={() => {
                      if (!useRemoteFallback && m.splash && m.localSplash) {
                        setFallbackSplashIds((prev) => ({
                          ...prev,
                          [m.id]: true,
                        }));
                      }
                    }}
                  />
                  <circle
                    cx={radius}
                    cy={radius}
                    r={outerRadius}
                    fill={`url(#${uid}-vignette)`}
                  />
                </g>
              )}

              {maps.length === 1 ? (
                <circle
                  cx={radius}
                  cy={radius}
                  r={outerRadius}
                  fill="none"
                  stroke="#ece8e1"
                  strokeWidth="2.5"
                />
              ) : (
                <path
                  d={describeSlice(startAngle, endAngle)}
                  fill="none"
                  stroke="#ece8e1"
                  strokeOpacity="0.85"
                  strokeWidth="2.5"
                />
              )}

              <text
                x={radius}
                y={radius - outerRadius * 0.64}
                fill="#ffffff"
                stroke="rgba(7, 11, 20, 0.94)"
                strokeWidth="5"
                strokeLinejoin="round"
                paintOrder="stroke fill"
                fontSize={maps.length > 9 ? 14 : size >= 440 ? 19 : 16}
                fontWeight="800"
                letterSpacing="0.06em"
                fontFamily="'Chakra Petch', 'Be Vietnam Pro', sans-serif"
                textAnchor="middle"
                transform={`rotate(${midAngle}, ${radius}, ${radius})`}
              >
                {m.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        <circle
          cx={radius}
          cy={radius}
          r={size * 0.085}
          fill="#0f1923"
          stroke="#fbbf24"
          strokeWidth="4"
        />
        <circle cx={radius} cy={radius} r={size * 0.035} fill="#ff4655" />
      </svg>
    );
  }, [maps, size, uid, fallbackSplashIds]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Kim chỉ ở đỉnh 12 giờ */}
      <div
        className="z-20 -mb-4 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]"
      />

      {/* Bánh xe: điều khiển góc xoay qua DOM ref trực tiếp để không giật khi re-render */}
      <div
        className="rounded-full p-2 bg-gradient-to-br from-[#ff4655] via-amber-400 to-[#ff4655] shadow-[0_0_50px_rgba(255,70,85,0.4)]"
        style={{ width: size + 16, height: size + 16 }}
      >
        <div
          ref={rotatorRef}
          style={{
            width: size,
            height: size,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          {wheelSvg}
        </div>
      </div>
    </div>
  );
}

const SpinWheel = memo(SpinWheelInner);
export default SpinWheel;
