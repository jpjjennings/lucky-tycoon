'use client';
import { GameState } from '@/lib/engine/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface EventModalProps {
  state: GameState;
  onAction: (action: any) => void;
}

export default function EventModal({ state, onAction }: EventModalProps) {
  const evt = state?.activeEvent;
  if (!evt) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-gray-900 border border-pink-500/30 rounded-xl p-6 max-w-sm w-full text-center"
      >
        <div className="text-5xl mb-3">{evt.icon}</div>
        <h2 className="font-display font-bold text-xl text-pink-300 mb-2">{evt.name}</h2>
        <p className="text-sm text-gray-300 mb-6">{evt.description}</p>
        <Button onClick={() => onAction({ type: 'RESOLVE_EVENT' })} className="bg-pink-600 hover:bg-pink-500 w-full">
          <Zap className="w-4 h-4 mr-1" /> Resolve
        </Button>
      </motion.div>
    </div>
  );
}
