'use client';

import { useEffect, useRef, useState } from 'react';
import { CharmDefinition } from '@/lib/engine/types';
import { RARITY_COLORS } from '@/lib/engine/charms-data';
import { motion } from 'framer-motion';

interface CharmDrawOverlayProps {
  def: CharmDefinition;
  onComplete: () => void;
}

export default function CharmDrawOverlay({ def, onComplete }: CharmDrawOverlayProps) {
  const [revealed, setRevealed] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const color = RARITY_COLORS[def.rarity] ?? '#facc15';

  useEffect(() => {
    const revealTimer = setTimeout(() => setRevealed(true), 700);
    const completeTimer = setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    }, 2200);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-gray-950/95 p-8 text-center shadow-2xl"
      >
        <div className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
          Lucky Space Draw
        </div>
        {!revealed ? (
          <div className="relative mx-auto h-32 w-48">
            {[-1, 0, 1].map((offset) => (
              <motion.div
                key={offset}
                className="absolute left-1/2 top-1/2 h-28 w-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-yellow-400/50 bg-gradient-to-br from-emerald-700 to-purple-800 shadow-xl"
                animate={{ x: offset * 42, rotate: offset * 12, y: [0, -10, 0] }}
                transition={{ duration: 0.55, repeat: 2, delay: (offset + 1) * 0.08 }}
              >
                <div className="flex h-full items-center justify-center text-3xl">🍀</div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl text-6xl"
            style={{ border: `2px solid ${color}`, backgroundColor: `${color}1a`, boxShadow: `0 0 42px ${color}66` }}
          >
            {def.icon}
          </motion.div>
        )}
        <div className="mt-5 text-sm text-gray-400">
          {revealed ? `${def.name} discovered!` : 'Shuffling the charms...'}
        </div>
      </motion.div>
    </div>
  );
}
