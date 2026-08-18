'use client';
import { CharmDefinition, OwnedCharm, CharmTrigger } from '@/lib/engine/types';
import { RARITY_COLORS, SYNERGIES, getCharmDef, getCharmUpgradeCost } from '@/lib/engine/charms-data';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Coins, ArrowUp, Sparkles, Zap, Check } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

// Human-readable labels for when each charm fires
const TRIGGER_LABELS: Record<string, string> = {
  PASSIVE: 'Always active',
  ON_TURN_START: 'At the start of your turn',
  ON_TURN_END: 'At the end of your turn',
  ON_DICE_ROLL: 'When you roll the dice',
  ON_PLAYER_MOVE: 'When you move',
  ON_PASS_START: 'When you pass Start',
  ON_LAND_PROPERTY: 'When you land on a property',
  ON_PAY_RENT: 'When you pay rent',
  ON_RECEIVE_RENT: 'When you collect rent',
  ON_BUY_PROPERTY: 'When you buy a property',
  ON_SELL_PROPERTY: 'When you sell a property',
  ON_MORTGAGE_PROPERTY: 'When you mortgage a property',
  ON_UPGRADE_PROPERTY: 'When you upgrade a property',
  ON_TRADE: 'When you complete a trade',
  ON_TAX: 'When you pay tax',
  ON_BANKRUPTCY: 'When a player goes bankrupt',
  ON_EVENT: 'When an event triggers',
  ON_ROUND_END: 'At the end of each round',
  ACTIVE: 'Activate manually on your turn',
};

interface CharmDetailModalProps {
  /** The charm definition to explain. Modal is hidden when null. */
  def: CharmDefinition | null;
  /** The owned instance, when viewing a charm the player actually holds. */
  owned?: OwnedCharm | null;
  /** True when the charm was just acquired — shows the celebratory framing. */
  isNew?: boolean;
  /** Name of the player who received / owns the charm. */
  playerName?: string;
  onClose: () => void;
}

export default function CharmDetailModal({
  def,
  owned,
  isNew = false,
  playerName,
  onClose,
}: CharmDetailModalProps) {
  const rarityColor = def ? (RARITY_COLORS[def.rarity] ?? '#888') : '#888';
  const level = owned?.level ?? 1;
  const maxLevel = def?.maxLevel ?? 1;
  const canUpgrade = !!def?.upgradeable && level < maxLevel;
  const dialogRef = useDialogFocus<HTMLDivElement>(!!def);

  // Synergies this charm takes part in
  const relatedSynergies = def
    ? SYNERGIES.filter((s: any) => (s.requiredCharmIds ?? []).includes(def.id))
    : [];

  return (
    <AnimatePresence>
      {def && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="charm-detail-dialog-title"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-2xl"
            style={{
              border: `1px solid ${rarityColor}55`,
              boxShadow: `0 20px 60px -15px ${rarityColor}40`,
            }}
          >
            {/* Glow behind the icon */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40 rounded-t-2xl"
              style={{ background: `radial-gradient(ellipse at top, ${rarityColor}22 0%, transparent 70%)` }}
            />

            <button
              onClick={onClose}
              aria-label="Close charm details"
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative">
              {/* "Charm acquired" banner */}
              {isNew && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 text-center"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-yellow-300">
                    <Sparkles className="h-3 w-3" /> Charm Acquired
                  </span>
                  {playerName && (
                    <p className="mt-1.5 text-xs text-gray-500">{playerName} gained a new charm</p>
                  )}
                </motion.div>
              )}

              {/* Icon */}
              <motion.div
                initial={isNew ? { scale: 0, rotate: -25 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14, delay: isNew ? 0.1 : 0 }}
                className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl text-5xl"
                style={{
                  border: `2px solid ${rarityColor}`,
                  backgroundColor: rarityColor + '1a',
                }}
              >
                {def.icon}
              </motion.div>

              {/* Name + rarity */}
              <div className="mb-4 text-center">
                <h2 id="charm-detail-dialog-title" className="font-display text-2xl font-bold tracking-tight" style={{ color: rarityColor }}>
                  {def.name}
                </h2>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: rarityColor, borderColor: rarityColor + '50', backgroundColor: rarityColor + '12' }}
                  >
                    {def.rarity}
                  </span>
                  {level > 1 && (
                    <span className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                      Level {level}
                    </span>
                  )}
                  {def.stackable && (
                    <span className="rounded-full border border-gray-600 bg-gray-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                      Stackable
                    </span>
                  )}
                </div>
              </div>

              {/* What it does */}
              <div className="mb-3 rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  What it does
                </div>
                <p className="text-sm leading-relaxed text-gray-200">{def.description}</p>
              </div>

              {/* When it triggers */}
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-gray-800 bg-gray-800/40 px-4 py-3">
                <Zap className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">When</div>
                  <p className="text-sm text-gray-200">
                    {TRIGGER_LABELS[def.trigger] ?? def.trigger}
                  </p>
                </div>
              </div>

              {/* Upgrade path */}
              {def.upgradeable && (def.upgradeDescriptions ?? []).length > 0 && (
                <div className="mb-3 rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                    <ArrowUp className="h-3 w-3" /> Upgrade path
                  </div>
                  <div className="space-y-1.5">
                    {(def.upgradeDescriptions ?? []).map((desc: string, i: number) => {
                      const upgradeLevel = i + 2; // descriptions start at level 2
                      const reached = level >= upgradeLevel;
                      const isNext = level === upgradeLevel - 1;
                      return (
                        <div
                          key={upgradeLevel}
                          className={`flex items-start gap-2 text-xs ${
                            reached ? 'text-cyan-200' : isNext ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                              reached
                                ? 'bg-cyan-600 text-white'
                                : isNext
                                ? 'border border-cyan-600/60 text-cyan-400'
                                : 'border border-gray-700 text-gray-600'
                            }`}
                          >
                            {reached ? <Check className="h-2.5 w-2.5" /> : upgradeLevel}
                          </span>
                          <span className="leading-snug">
                            {desc}
                            {isNext && owned && (
                              <span className="ml-1 font-mono text-[10px] text-amber-400">
                                ({getCharmUpgradeCost(def, level)} coins)
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {!canUpgrade && level >= maxLevel && (
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Fully upgraded
                    </p>
                  )}
                </div>
              )}

              {/* Synergies */}
              {relatedSynergies.length > 0 && (
                <div className="mb-3 rounded-xl border border-purple-800/40 bg-purple-950/20 p-4">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                    ✦ Part of these synergies
                  </div>
                  <div className="space-y-2">
                    {relatedSynergies.map((syn: any) => {
                      const partners = (syn.requiredCharmIds ?? [])
                        .filter((id: string) => id !== def.id)
                        .map((id: string) => getCharmDef(id))
                        .filter(Boolean);
                      return (
                        <div key={syn.id} className="text-xs">
                          <div className="font-medium text-purple-200">
                            {syn.icon} {syn.name}
                          </div>
                          <p className="text-[11px] leading-snug text-gray-400">{syn.description}</p>
                          {partners.length > 0 && (
                            <p className="mt-0.5 text-[10px] text-gray-500">
                              Combine with:{' '}
                              {partners.map((p: any) => `${p.icon} ${p.name}`).join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Value footer */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/30 px-4 py-2.5 text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Coins className="h-3 w-3 text-yellow-500" /> Shop cost
                  <span className="font-mono font-bold text-gray-200">{def.cost}</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  Sell value
                  <span className="font-mono font-bold text-gray-200">{def.sellValue}</span>
                </span>
              </div>

              <Button
                onClick={onClose}
                className="h-11 w-full font-bold text-white"
                style={{ backgroundColor: rarityColor + 'cc' }}
              >
                {isNew ? 'Nice!' : 'Close'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
