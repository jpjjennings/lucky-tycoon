'use client';
import { GameState } from '@/lib/engine/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Flame } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

interface RiskModalProps {
  state: GameState;
  onAction: (action: any) => void;
}

export default function RiskModal({ state, onAction }: RiskModalProps) {
  const risk = state?.riskChoice;
  const dialogRef = useDialogFocus<HTMLDivElement>(!!risk);
  if (!risk) return null;
  const player = state?.players?.[state?.currentPlayerIndex ?? 0];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-dialog-title"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-amber-500/30 rounded-xl p-6 max-w-sm w-full text-center"
      >
        <div className="text-4xl mb-3">🎰</div>
        <h2 id="risk-dialog-title" className="font-display font-bold text-xl text-amber-300 mb-2">Risk Space!</h2>
        <p className="text-sm text-gray-400 mb-6">{player?.name}, choose your fate...</p>

        <div className="grid grid-cols-2 gap-4">
          <Button
            data-dialog-autofocus
            onClick={() => onAction({ type: 'RISK_CHOOSE', safe: true })}
            className="h-24 flex-col bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300"
            variant="ghost"
          >
            <Shield className="w-6 h-6 mb-1" />
            <span className="text-sm font-bold">Play Safe</span>
            <span className="text-lg font-mono text-emerald-400">+{risk.safeReward}c</span>
          </Button>
          <Button
            onClick={() => onAction({ type: 'RISK_CHOOSE', safe: false })}
            className="h-24 flex-col bg-red-600/20 border border-red-500/40 hover:bg-red-600/40 text-red-300"
            variant="ghost"
          >
            <Flame className="w-6 h-6 mb-1" />
            <span className="text-sm font-bold">Gamble!</span>
            <span className="text-lg font-mono text-yellow-400">+{risk.gambleReward}c</span>
            <span className="text-[10px] text-red-400">{Math.round((risk?.gambleChance ?? 0) * 100)}% chance</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
