'use client';
import { useEffect, useState, useRef } from 'react';
import { GameState, GameEventEntry } from '@/lib/engine/types';
import { SYNERGIES } from '@/lib/engine/charms-data';
import { motion, AnimatePresence } from 'framer-motion';

interface SynergyNotificationProps {
  state: GameState;
}

export default function SynergyNotification({ state }: SynergyNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [synergy, setSynergy] = useState<{ name: string; icon: string; description: string } | null>(null);
  const lastLogLength = useRef(0);

  useEffect(() => {
    const log = state?.eventLog ?? [];
    if (log.length <= lastLogLength.current) {
      lastLogLength.current = log.length;
      return;
    }

    // Check new entries for synergy
    const newEntries = log.slice(lastLogLength.current);
    lastLogLength.current = log.length;

    const synergyEntry = newEntries.find((e: GameEventEntry) => e?.type === 'SYNERGY');
    if (synergyEntry) {
      // Extract synergy info from message
      const syn = SYNERGIES.find((s: any) => synergyEntry?.message?.includes(s.name));
      if (syn) {
        setSynergy({ name: syn.name, icon: syn.icon, description: syn.description });
        setVisible(true);
        setTimeout(() => setVisible(false), 4000);
      }
    }
  }, [state?.eventLog?.length]);

  return (
    <AnimatePresence>
      {visible && synergy && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="bg-gradient-to-r from-yellow-900/90 via-amber-900/90 to-yellow-900/90 backdrop-blur border border-yellow-500/50 rounded-xl px-8 py-4 text-center shadow-2xl shadow-yellow-500/20">
            <div className="text-3xl mb-1">{synergy.icon}</div>
            <div className="font-display font-bold text-yellow-300 text-lg tracking-tight">
              ✨ SYNERGY DISCOVERED ✨
            </div>
            <div className="text-yellow-200 font-bold mt-1">{synergy.name}</div>
            <div className="text-yellow-100/70 text-xs mt-1 max-w-[300px]">{synergy.description}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
