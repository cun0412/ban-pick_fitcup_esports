import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SpinCelebrationProps {
  active: boolean;
}

/**
 * Hiệu ứng pháo sáng, sóng xung kích và tia hạt khi quay xong map
 */
export default function SpinCelebration({ active }: SpinCelebrationProps) {
  const particles = useMemo(() => {
    const colors = ['#ff4655', '#fbbf24', '#ffffff', '#38bdf8', '#fb7185'];
    return Array.from({ length: 32 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2 + (i % 3) * 0.12;
      const dist = 220 + (i % 5) * 95;
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        size: 6 + (i % 4) * 4,
        color: colors[i % colors.length],
        delay: (i % 4) * 0.03,
      };
    });
  }, []);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      {/* Vòng shockwave bung ra từ tâm */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0.95 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="absolute w-72 h-72 rounded-full border-4 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.9)]"
      />
      <motion.div
        initial={{ scale: 0.15, opacity: 0.9 }}
        animate={{ scale: 3.1, opacity: 0 }}
        transition={{ duration: 1.15, ease: 'easeOut', delay: 0.08 }}
        className="absolute w-72 h-72 rounded-full border-4 border-[#ff4655] shadow-[0_0_60px_rgba(255,70,85,0.85)]"
      />

      {/* Flash sáng trung tâm */}
      <motion.div
        initial={{ opacity: 0.85, scale: 0.5 }}
        animate={{ opacity: 0, scale: 1.8 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="absolute w-96 h-96 rounded-full bg-gradient-radial from-amber-300/60 via-[#ff4655]/30 to-transparent blur-xl"
      />

      {/* Các tia pháo sáng bay tỏa ra */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
          animate={{
            x: p.tx,
            y: p.ty,
            scale: 0,
            opacity: 0,
            rotate: 180,
          }}
          transition={{
            duration: 1.1,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
