'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceOverlayProps {
  result: [number, number];
  onComplete: () => void;
}

const DICE_FACES: Record<number, string[][]> = {
  1: [
    ['  ', '  ', '  '],
    ['  ', '●', '  '],
    ['  ', '  ', '  '],
  ],
  2: [
    ['  ', '  ', '●'],
    ['  ', '  ', '  '],
    ['●', '  ', '  '],
  ],
  3: [
    ['  ', '  ', '●'],
    ['  ', '●', '  '],
    ['●', '  ', '  '],
  ],
  4: [
    ['●', '  ', '●'],
    ['  ', '  ', '  '],
    ['●', '  ', '●'],
  ],
  5: [
    ['●', '  ', '●'],
    ['  ', '●', '  '],
    ['●', '  ', '●'],
  ],
  6: [
    ['●', '  ', '●'],
    ['●', '  ', '●'],
    ['●', '  ', '●'],
  ],
};

function DiceFace({ value, rolling, delay }: { value: number; rolling: boolean; delay: number }) {
  const [displayValue, setDisplayValue] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (rolling) {
      let count = 0;
      const maxFlips = 12;
      const startDelay = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          count++;
          setDisplayValue(Math.floor(Math.random() * 6) + 1);
          if (count >= maxFlips) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setDisplayValue(value);
          }
        }, 80);
      }, delay);
      return () => {
        clearTimeout(startDelay);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setDisplayValue(value);
    }
  }, [rolling, value, delay]);

  const dots = DICE_FACES[displayValue] || DICE_FACES[1];

  return (
    <motion.div
      className="relative w-20 h-20 sm:w-24 sm:h-24"
      animate={
        rolling
          ? {
              rotateX: [0, 360, 720, 1080],
              rotateZ: [0, -15, 15, 0],
              y: [0, -30, 0, -15, 0],
            }
          : { rotateX: 0, rotateZ: 0, y: 0 }
      }
      transition={
        rolling
          ? { duration: 1.2, ease: 'easeOut', delay: delay / 1000 }
          : { type: 'spring', stiffness: 400, damping: 15 }
      }
      style={{ perspective: 600 }}
    >
      <div
        className={`w-full h-full rounded-xl shadow-2xl flex flex-col items-center justify-center gap-1 p-2
          ${
            !rolling
              ? 'bg-gradient-to-br from-white to-gray-100 border-2 border-yellow-400 shadow-yellow-400/30'
              : 'bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300'
          }`}
      >
        {dots.map((row, ri) => (
          <div key={ri} className="flex gap-1 sm:gap-1.5 w-full justify-center">
            {row.map((dot, ci) => (
              <div
                key={ci}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center"
              >
                {dot === '●' && (
                  <motion.div
                    className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${
                      !rolling
                        ? 'bg-gray-900 shadow-md'
                        : 'bg-gray-600'
                    }`}
                    animate={!rolling ? { scale: [0.5, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DiceOverlay({ result, onComplete }: DiceOverlayProps) {
  const [rolling, setRolling] = useState(true);
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);

  useEffect(() => {
    // Dice settle after ~1.4s
    const settleTimer = setTimeout(() => {
      setRolling(false);
    }, 1400);

    // Show final result for a moment, then dismiss
    const dismissTimer = setTimeout(() => {
      setVisible(false);
    }, 2400);

    // Fire onComplete after fade-out
    const completeTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 2700);

    return () => {
      clearTimeout(settleTimer);
      clearTimeout(dismissTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const total = result[0] + result[1];
  const isDoubles = result[0] === result[1];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop blur */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <div className="relative flex flex-col items-center gap-4">
            {/* Dice */}
            <div className="flex gap-6">
              <DiceFace value={result[0]} rolling={rolling} delay={0} />
              <DiceFace value={result[1]} rolling={rolling} delay={100} />
            </div>

            {/* Total display */}
            <AnimatePresence>
              {!rolling && (
                <motion.div
                  className="flex flex-col items-center gap-1"
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
                    {total}
                  </div>
                  {isDoubles && (
                    <motion.div
                      className="text-yellow-400 font-bold text-lg tracking-wider"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                    >
                      ✨ DOUBLES! ✨
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
