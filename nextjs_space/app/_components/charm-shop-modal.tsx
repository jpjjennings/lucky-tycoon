'use client';
import { GameState, Player, OwnedCharm, CharmDefinition } from '@/lib/engine/types';
import { RARITY_COLORS, getCharmUpgradeCost, getCharmDef, getCharmEvolutionTurns } from '@/lib/engine/charms-data';
import { computeModifiers } from '@/lib/engine/charm-effects';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ShoppingBag, RefreshCw, X, Coins, Lock, Unlock, ArrowUp } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

interface CharmShopModalProps {
  state: GameState;
  onAction: (action: any) => void;
}

export default function CharmShopModal({ state, onAction }: CharmShopModalProps) {
  const player = state?.players?.[state?.currentPlayerIndex ?? 0];
  const shop = state?.charmShop;
  const dialogRef = useDialogFocus<HTMLDivElement>(!!player && !!shop);
  if (!player || !shop) return null;

  const mods = computeModifiers(player, state, 'PASSIVE');
  const maxSlots = (state?.config?.maxCharmSlots ?? 3) + (mods.extraCharmSlots ?? 0);
  const slotsAvailable = maxSlots - (player?.charms ?? []).length;
  const lockedId = shop.lockedCharmId;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="charm-shop-dialog-title"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-purple-500/30 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
            <h2 id="charm-shop-dialog-title" className="font-display font-bold text-lg text-purple-300">Charm Shop</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{slotsAvailable} slot{slotsAvailable !== 1 ? 's' : ''} available</span>
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Coins className="w-3 h-3" /> {(player?.money ?? 0).toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Shop offers */}
        <div className="space-y-3 mb-4">
          {(shop?.offers ?? []).map((charm: CharmDefinition) => {
            const canAfford = (player?.money ?? 0) >= (charm?.cost ?? 0);
            const hasSlotsAndCanBuy = slotsAvailable > 0 && canAfford;
            const alreadyOwned = !charm?.stackable && (player?.charms ?? []).some((c: OwnedCharm) => c.definitionId === charm?.id);
            const isLocked = lockedId === charm?.id;

            return (
              <motion.div
                key={charm?.id}
                className={`bg-gray-800/60 rounded-lg p-4 border transition-colors relative ${
                  isLocked ? 'ring-1 ring-amber-500/40' : ''
                }`}
                style={{ borderColor: (RARITY_COLORS[charm?.rarity ?? 'Common'] ?? '#666') + '40' }}
                whileHover={{ scale: 1.01 }}
              >
                {isLocked && (
                  <div className="absolute -top-2 -right-2 bg-amber-600 rounded-full p-1">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border"
                      style={{
                        borderColor: RARITY_COLORS[charm?.rarity ?? 'Common'] ?? '#666',
                        backgroundColor: (RARITY_COLORS[charm?.rarity ?? 'Common'] ?? '#666') + '20',
                      }}
                    >
                      {charm?.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm" style={{ color: RARITY_COLORS[charm?.rarity ?? 'Common'] }}>
                        {charm?.name}
                        {charm?.upgradeable && <span className="ml-1 text-[10px] text-cyan-400">⬆ Upgradeable</span>}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: RARITY_COLORS[charm?.rarity ?? 'Common'], opacity: 0.7 }}>
                        {charm?.rarity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAction({ type: 'LOCK_SHOP_ITEM', charmId: charm?.id })}
                      className={`p-1.5 rounded transition-colors ${
                        isLocked ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-300'
                      }`}
                      title={isLocked ? 'Unlock' : 'Lock (persists across rerolls)'}
                    >
                      {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <Button
                      size="sm"
                      disabled={!hasSlotsAndCanBuy || alreadyOwned}
                      onClick={() => onAction({ type: 'BUY_CHARM', charmId: charm?.id })}
                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40"
                    >
                      <Coins className="w-3 h-3 mr-1" /> {charm?.cost}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{charm?.description}</p>
                {alreadyOwned && <p className="text-[10px] text-red-400 mt-1">Already owned (not stackable)</p>}
              </motion.div>
            );
          })}
        </div>

        {/* Owned charms with upgrade option */}
        {(player?.charms ?? []).length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Charms</h3>
            <div className="space-y-2">
              {(player.charms ?? []).map((owned: OwnedCharm) => {
                const def = getCharmDef(owned.definitionId);
                if (!def) return null;
                const level = owned.level ?? 1;
                const canUpgrade = def.upgradeable && level < (def.maxLevel ?? 1);
                const upgradeCost = canUpgrade ? getCharmUpgradeCost(def, level) : Infinity;
                const canAffordUpgrade = (player?.money ?? 0) >= upgradeCost;
                const upgradeDesc = canUpgrade && def.upgradeDescriptions
                  ? def.upgradeDescriptions[level - 1] ?? ''
                  : '';
                const evolutionTurns = canUpgrade ? getCharmEvolutionTurns(def) : 0;
                const turnsHeld = owned.turnsHeld ?? 0;

                return (
                  <div
                    key={owned.instanceId}
                    className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{def.icon}</span>
                      <div>
                        <span className="text-xs font-medium" style={{ color: RARITY_COLORS[def.rarity ?? 'Common'] }}>
                          {def.name}
                        </span>
                        {level > 1 && (
                          <span className="ml-1 text-[10px] font-bold text-cyan-400">Lv.{level}</span>
                        )}
                        {canUpgrade && (
                          <div className="mt-1 text-[10px] text-gray-500">
                            Evolves in {Math.max(0, evolutionTurns - turnsHeld)} turn{Math.max(0, evolutionTurns - turnsHeld) === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    </div>
                    {canUpgrade && (
                      <Button
                        size="sm"
                        disabled={!canAffordUpgrade}
                        onClick={() => onAction({ type: 'UPGRADE_CHARM', instanceId: owned.instanceId })}
                        className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-xs h-7"
                        title={upgradeDesc}
                      >
                        <ArrowUp className="w-3 h-3 mr-1" /> Lv.{level + 1} ({upgradeCost})
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {(shop?.rerollsLeft ?? 0) > 0 && (
            <Button onClick={() => onAction({ type: 'REROLL_SHOP' })} variant="outline" className="border-purple-700 text-purple-400">
              <RefreshCw className="w-4 h-4 mr-1" /> Reroll ({shop.rerollsLeft})
            </Button>
          )}
          <Button data-dialog-autofocus onClick={() => onAction({ type: 'CLOSE_SHOP' })} variant="ghost" className="flex-1">
            <X className="w-4 h-4 mr-1" /> Close Shop
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
