'use client';

import { useEffect, useRef, useState } from 'react';
import { GameEventEntry, GameState } from '@/lib/engine/types';
import { AnimatePresence, motion } from 'framer-motion';

interface Moment {
  icon: string;
  title: string;
  message: string;
  color: string;
}

function getMoment(entry: GameEventEntry): Moment | null {
  const message = entry.message ?? '';

  if (entry.type === 'BANKRUPTCY') {
    return { icon: '💣', title: 'BANKRUPTCY', message, color: '#f87171' };
  }
  if (/legendary/i.test(message)) {
    return { icon: '🌈', title: 'LEGENDARY CHARM', message, color: '#fbbf24' };
  }
  if (/jackpot|won \d+|windfall|bonus \d+|golden hour/i.test(message)) {
    return { icon: '✨', title: 'LUCKY BREAK', message, color: '#facc15' };
  }
  return null;
}

export default function MomentOverlay({ state }: { state: GameState }) {
  const [moment, setMoment] = useState<Moment | null>(null);
  const lastEntryId = useRef<string | null>(null);

  useEffect(() => {
    const latest = state.eventLog?.[state.eventLog.length - 1];
    if (!latest || latest.id === lastEntryId.current) return;
    lastEntryId.current = latest.id;

    const nextMoment = getMoment(latest);
    if (!nextMoment) return;
    setMoment(nextMoment);
    const timer = window.setTimeout(() => setMoment(null), 2800);
    return () => window.clearTimeout(timer);
  }, [state.eventLog]);

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -15 }}
          className="pointer-events-none fixed inset-x-0 bottom-8 z-[105] flex justify-center px-4"
        >
          <div
            className="relative max-w-md rounded-2xl border bg-gray-950/95 px-6 py-4 text-center shadow-2xl backdrop-blur"
            style={{ borderColor: `${moment.color}99`, boxShadow: `0 0 40px ${moment.color}33` }}
          >
            <div className="absolute inset-0 animate-pulse rounded-2xl" style={{ boxShadow: `inset 0 0 24px ${moment.color}18` }} />
            <div className="relative text-3xl">{moment.icon}</div>
            <div className="relative mt-1 font-display font-bold tracking-widest" style={{ color: moment.color }}>
              {moment.title}
            </div>
            <div className="relative mt-1 text-xs text-gray-300">{moment.message}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
