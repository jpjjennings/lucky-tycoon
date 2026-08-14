'use client';
import { useRef, useEffect } from 'react';
import { GameEventEntry } from '@/lib/engine/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EventFeedProps {
  entries: GameEventEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  DICE: 'text-blue-400',
  MOVE: 'text-gray-400',
  RENT: 'text-red-400',
  TAX: 'text-orange-400',
  BUY: 'text-emerald-400',
  SELL: 'text-yellow-400',
  UPGRADE: 'text-green-400',
  CHARM: 'text-purple-400',
  CHARM_EFFECT: 'text-violet-400',
  SYNERGY: 'text-yellow-300',
  TRADE: 'text-cyan-400',
  EVENT: 'text-pink-400',
  SYSTEM: 'text-gray-300',
  BANKRUPTCY: 'text-red-500',
  VICTORY: 'text-yellow-400',
};

export default function EventFeed({ entries }: EventFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const recentEntries = (entries ?? []).slice(-50);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [recentEntries.length]);

  return (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {recentEntries.map((entry: GameEventEntry) => (
            <motion.div
              key={entry?.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs py-1 px-2 rounded ${
                entry?.highlight ? 'bg-yellow-500/10 border border-yellow-500/20' : ''
              }`}
            >
              <span className="mr-1">{entry?.emoji}</span>
              <span className={TYPE_COLORS[entry?.type ?? ''] ?? 'text-gray-400'}>
                {entry?.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
