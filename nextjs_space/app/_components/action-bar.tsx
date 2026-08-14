'use client';
import { GameState, Player, Property } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { getCharmDef } from '@/lib/engine/charms-data';
import { playerOwnsFullGroup } from '@/lib/engine/reducer-utils';
import { useGameStore, AnimationState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Dices, ShoppingCart, ArrowUpCircle, ArrowDownCircle, HandCoins, ChevronRight, Lock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionBarProps {
  state: GameState;
  onAction: (action: any) => void;
  onOpenTrade: () => void;
}

export default function ActionBar({ state, onAction, onOpenTrade }: ActionBarProps) {
  const anim = useGameStore((s: any) => s.anim) as AnimationState;
  const rollWithAnimation = useGameStore((s: any) => s.rollWithAnimation);
  const isAnimating = anim.phase !== 'idle';

  if (!state) return null;

  const player = state?.players?.[state?.currentPlayerIndex ?? 0];
  if (!player) return null;

  const phase = state?.phase ?? 'ROLL_DICE';
  const space = BOARD_SPACES[player?.position ?? 0];
  const prop = (state?.properties ?? []).find((p: Property) => p.spaceIndex === (player?.position ?? 0));

  const canBuy = phase === 'RESOLVE_SPACE' && prop?.ownerId === null && (player?.money ?? 0) >= (space?.price ?? Infinity);
  const canUpgrade = (spaceIdx: number) => {
    const p = (state?.properties ?? []).find((pr: Property) => pr.spaceIndex === spaceIdx);
    const sp = BOARD_SPACES[spaceIdx];
    if (!p || !sp || p.ownerId !== player?.id || sp.type !== 'PROPERTY') return false;
    if ((p.tier ?? 0) >= 4) return false;
    if (!playerOwnsFullGroup(state, player.id, sp.group ?? '')) return false;
    if ((player?.money ?? 0) < (sp.upgradeCost ?? 0)) return false;
    return true;
  };

  const ownedProperties = (state?.properties ?? []).filter((p: Property) => p.ownerId === player?.id);
  const upgradeable = ownedProperties.filter((p: Property) => canUpgrade(p.spaceIndex));
  const hasDowngradeable = ownedProperties.some((p: Property) => (p.tier ?? 0) > 0);

  return (
    <motion.div
      className="bg-gray-900/90 backdrop-blur border-t border-gray-800 px-4 py-3 shrink-0"
      layout
    >
      {/* Current player indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ backgroundColor: player.color }}
        >
          {player.icon}
        </div>
        <span className="font-medium text-sm" style={{ color: player.color }}>
          {player.name}
        </span>
        <span className="text-xs text-gray-500">• {phaseLabel(phase)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {/* Roll Dice */}
          {phase === 'ROLL_DICE' && !isAnimating && (
            <motion.div key="roll" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              {(player?.turnsInJail ?? 0) > 0 ? (
                <div className="flex gap-2">
                  <Button onClick={() => rollWithAnimation()} className="bg-purple-600 hover:bg-purple-500">
                    <Dices className="w-4 h-4 mr-1" /> Roll for Doubles
                  </Button>
                  {(player?.money ?? 0) >= 50 && (
                    <Button onClick={() => onAction({ type: 'PAY_JAIL_FINE' })} variant="outline" className="border-yellow-600 text-yellow-400">
                      <DollarSign className="w-4 h-4 mr-1" /> Pay 50 Fine
                    </Button>
                  )}
                </div>
              ) : (
                <Button onClick={() => rollWithAnimation()} className="bg-emerald-600 hover:bg-emerald-500 font-bold">
                  <Dices className="w-4 h-4 mr-1" /> Roll Dice
                </Button>
              )}
            </motion.div>
          )}

          {/* Animating indicator */}
          {isAnimating && (
            <motion.div key="animating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="text-sm text-yellow-400 animate-pulse flex items-center gap-2">
                <Dices className="w-4 h-4 animate-spin" />
                {anim.phase === 'rolling' ? 'Rolling...' : 'Moving...'}
              </span>
            </motion.div>
          )}

          {/* Buy Property */}
          {canBuy && (
            <motion.div key="buy" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button onClick={() => onAction({ type: 'BUY_PROPERTY' })} className="bg-blue-600 hover:bg-blue-500">
                <ShoppingCart className="w-4 h-4 mr-1" /> Buy {space?.name} ({space?.price}c)
              </Button>
            </motion.div>
          )}

          {/* Skip buying */}
          {phase === 'RESOLVE_SPACE' && (
            <motion.div key="skip" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button onClick={() => onAction({ type: 'END_TURN' })} variant="outline" className="border-gray-600">
                Skip
              </Button>
            </motion.div>
          )}

          {/* Upgrade */}
          {phase === 'PLAYER_ACTION' && upgradeable.length > 0 && (
            upgradeable.map((p: Property) => {
              const sp = BOARD_SPACES[p.spaceIndex];
              return (
                <motion.div key={`up-${p.spaceIndex}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <Button
                    onClick={() => onAction({ type: 'UPGRADE_PROPERTY', spaceIndex: p.spaceIndex })}
                    variant="outline"
                    size="sm"
                    className="border-green-700 text-green-400 text-xs"
                  >
                    <ArrowUpCircle className="w-3 h-3 mr-1" /> ⬆ {sp?.name} ({sp?.upgradeCost}c)
                  </Button>
                </motion.div>
              );
            })
          )}

          {/* Trade */}
          {phase === 'PLAYER_ACTION' && (state?.players ?? []).filter((p: Player) => p.isAlive && p.id !== player?.id).length > 0 && (
            <motion.div key="trade" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button onClick={onOpenTrade} variant="outline" className="border-purple-700 text-purple-400">
                <HandCoins className="w-4 h-4 mr-1" /> Trade
              </Button>
            </motion.div>
          )}

          {/* Sell Charm */}
          {phase === 'PLAYER_ACTION' && (player?.charms ?? []).length > 0 && (
            (player.charms ?? []).map((charm: any) => {
              const def = getCharmDef(charm?.definitionId ?? '');
              return (
                <motion.div key={`sell-c-${charm.instanceId}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <Button
                    onClick={() => onAction({ type: 'SELL_CHARM', instanceId: charm.instanceId })}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 text-xs"
                  >
                    Sell {def?.icon} {def?.name} (+{def?.sellValue}c)
                  </Button>
                </motion.div>
              );
            })
          )}

          {/* End Turn */}
          {phase === 'PLAYER_ACTION' && (
            <motion.div key="end" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button onClick={() => onAction({ type: 'END_TURN' })} className="bg-gray-700 hover:bg-gray-600">
                <ChevronRight className="w-4 h-4 mr-1" /> End Turn
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'ROLL_DICE': return 'Roll the dice!';
    case 'RESOLVE_SPACE': return 'Buy or skip?';
    case 'PLAYER_ACTION': return 'Your actions';
    case 'CHARM_SHOP': return 'Charm Shop open!';
    case 'TRADING': return 'Trading...';
    case 'BANKRUPTCY': return 'Bankruptcy!';
    case 'RISK_CHOICE': return 'Risk or reward?';
    case 'EVENT_RESOLUTION': return 'Event!';
    default: return '';
  }
}
