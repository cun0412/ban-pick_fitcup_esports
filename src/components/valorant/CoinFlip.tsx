import { useState } from 'react';
import { motion } from 'framer-motion';
import { cryptoRandomIndex } from '../../stores/valorantStore';
import { useAudio } from '../../hooks/useAudio';

interface CoinFlipProps {
  leftLabel: string;
  rightLabel: string;
  leftColor?: string;
  rightColor?: string;
  title?: string;
  onResult?: (winner: 'left' | 'right', label: string) => void;
  onClose?: () => void;
}

/**
 * Mini-tool Tung đồng xu / Quay 2 ô để chọn đội đi trước hoặc chọn bên Attack/Defense
 */
export default function CoinFlip({
  leftLabel,
  rightLabel,
  leftColor = '#3b82f6',
  rightColor = '#ff4655',
  title = 'QUAY CHỌN NGẪU NHIÊN',
  onResult,
  onClose,
}: CoinFlipProps) {
  const [flipping, setFlipping] = useState(false);
  const [highlight, setHighlight] = useState<'left' | 'right' | null>(null);
  const [winner, setWinner] = useState<'left' | 'right' | null>(null);
  const { playTick, playFanfare } = useAudio();

  const handleFlip = () => {
    if (flipping) return;
    setFlipping(true);
    setWinner(null);

    // Quyết định kết quả trước bằng crypto.getRandomValues
    const winSide: 'left' | 'right' = cryptoRandomIndex(2) === 0 ? 'left' : 'right';
    const totalTicks = 15 + (winSide === 'left' ? 0 : 1);
    let step = 0;

    const runStep = () => {
      step++;
      setHighlight(step % 2 === 0 ? 'left' : 'right');
      playTick();

      if (step < totalTicks) {
        const delay = 60 + Math.pow(step / totalTicks, 2) * 260;
        setTimeout(runStep, delay);
      } else {
        setHighlight(winSide);
        setWinner(winSide);
        setFlipping(false);
        playFanfare();
        onResult?.(winSide, winSide === 'left' ? leftLabel : rightLabel);
      }
    };

    runStep();
  };

  return (
    <div className="bg-[#0f1923] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-black text-base tracking-wider text-amber-300">
          🪙 {title}
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          animate={{ scale: highlight === 'left' ? 1.06 : 1 }}
          className={`rounded-xl p-5 text-center border-2 transition ${
            highlight === 'left'
              ? 'border-amber-400 bg-white/10 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
              : 'border-white/10 bg-black/40 opacity-70'
          }`}
        >
          <div className="font-display font-black text-lg" style={{ color: leftColor }}>
            {leftLabel}
          </div>
          {winner === 'left' && (
            <div className="mt-2 inline-block px-2 py-0.5 rounded bg-amber-400 text-black text-xs font-black">
              THẮNG!
            </div>
          )}
        </motion.div>

        <motion.div
          animate={{ scale: highlight === 'right' ? 1.06 : 1 }}
          className={`rounded-xl p-5 text-center border-2 transition ${
            highlight === 'right'
              ? 'border-amber-400 bg-white/10 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
              : 'border-white/10 bg-black/40 opacity-70'
          }`}
        >
          <div className="font-display font-black text-lg" style={{ color: rightColor }}>
            {rightLabel}
          </div>
          {winner === 'right' && (
            <div className="mt-2 inline-block px-2 py-0.5 rounded bg-amber-400 text-black text-xs font-black">
              THẮNG!
            </div>
          )}
        </motion.div>
      </div>

      <button
        type="button"
        disabled={flipping}
        onClick={handleFlip}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff4655] to-amber-500 hover:from-rose-500 hover:to-amber-400 font-display font-black text-sm tracking-wider text-white disabled:opacity-50"
      >
        {flipping ? 'ĐANG QUAY...' : 'TUNG ĐỒNG XU / QUAY CHỌN'}
      </button>
    </div>
  );
}
