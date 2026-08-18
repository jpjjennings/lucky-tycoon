'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CHARM_SHOP_UNLOCK_ROUND, GameState, Player, Property, TIER_NAMES } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { getCharmDef } from '@/lib/engine/charms-data';
import { playerOwnsFullGroup } from '@/lib/engine/reducer-utils';
import { useGameStore, AnimationState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Dices, Home, ShoppingBag, ShoppingCart, ArrowUpCircle, ArrowDownCircle, HandCoins, ChevronRight, Lock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

interface ActionBarProps {
  state: GameState;
  onAction: (action: any) => void;
  onOpenTrade: () => void;
  onRoll?: () => void;
  canAct?: boolean;
}

export default function ActionBar({ state, onAction, onOpenTrade, onRoll, canAct = true }: ActionBarProps) {
  const anim = useGameStore((s: any) => s.anim) as AnimationState;
  const localRollWithAnimation = useGameStore((s: any) => s.rollWithAnimation);
  const rollWithAnimation = onRoll ?? localRollWithAnimation;
  const isAnimating = anim.phase !== 'idle';
  const [pendingSale, setPendingSale] = useState<number | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const inventoryRef = useDialogFocus<HTMLDivElement>(showInventory);

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
  const canOpenCharmShop =
    (state.round ?? 1) >= CHARM_SHOP_UNLOCK_ROUND &&
    !state.charmShop &&
    (phase === 'PLAYER_ACTION' || phase === 'RESOLVE_SPACE');

  return (
    <motion.div
      role="region"
      aria-label={`${player.name}'s game actions`}
      className="max-h-[36vh] shrink-0 overflow-y-auto border-t border-gray-800 bg-gray-900/90 px-4 py-3 backdrop-blur scrollbar-none"
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
        <div className={canAct ? '' : 'pointer-events-none opacity-45'}>
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

          {/* Charm Shop */}
          {canOpenCharmShop && (
            <motion.div key="charm-shop" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <Button onClick={() => onAction({ type: 'OPEN_SHOP' })} variant="outline" className="border-purple-700 text-purple-400">
                <ShoppingBag className="w-4 h-4 mr-1" /> Charm Shop
              </Button>
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

          {/* Sell property */}
          {phase === 'PLAYER_ACTION' && ownedProperties.length > 0 && (
            <motion.div key="property-inventory" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setShowInventory(true)} variant="ghost" size="icon-sm" aria-label="Open property inventory" className="text-orange-400 hover:bg-orange-500/10 hover:text-orange-300">
                      <Home className="h-4 w-4" />
                      <span className="ml-0.5 text-[10px]">{ownedProperties.length}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="border-gray-700 bg-gray-950 text-xs">Open property inventory to inspect, mortgage, or unmortgage properties.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
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
              if (def?.trigger === 'ACTIVE' && (charm?.usesRemaining ?? 1) > 0) {
                return (
                  <motion.div key={`activate-c-${charm.instanceId}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                    <Button
                      onClick={() => onAction({ type: 'ACTIVATE_CHARM', instanceId: charm.instanceId })}
                      variant="outline"
                      size="sm"
                      className="border-cyan-700 text-cyan-400 text-xs"
                    >
                      Activate {def?.icon} {def?.name}
                    </Button>
                  </motion.div>
                );
              }
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
        {showInventory && typeof document !== 'undefined' && createPortal((
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div ref={inventoryRef} role="dialog" aria-modal="true" aria-labelledby="property-inventory-title" className="max-h-[90vh] w-[min(96vw,1100px)] rounded-xl border border-orange-500/30 bg-gray-950 p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 id="property-inventory-title" className="font-display text-lg font-bold text-orange-300">Property Inventory</h2>
                  <p className="text-xs text-gray-500">Hover for details. Select a property to mortgage or unmortgage it.</p>
                </div>
                 <Button data-dialog-autofocus variant="ghost" size="sm" onClick={() => { setShowInventory(false); setPendingSale(null); }} className="text-gray-400">Close</Button>
              </div>
              <div className="grid max-h-[72vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ownedProperties.map((ownedProperty: Property) => {
                  const ownedSpace = BOARD_SPACES[ownedProperty.spaceIndex];
                  return (
                    <div key={ownedProperty.spaceIndex} className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/70 p-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" onClick={() => setPendingSale(ownedProperty.spaceIndex)} className="min-w-0 flex-1 rounded-md px-2 py-2 text-left hover:bg-orange-500/10">
                              <div className="truncate text-xs font-medium text-gray-200">{ownedSpace?.name}</div>
                              <div className="text-[10px] text-gray-500">{TIER_NAMES[ownedProperty.tier] ?? `Tier ${ownedProperty.tier}`}</div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="w-56 border-gray-700 bg-gray-950 p-3 text-xs">
                            <p className="font-display font-bold text-orange-300">{ownedSpace?.name}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500">{ownedSpace?.type.replace(/_/g, ' ')}</p>
                            <p className="mt-2 text-gray-400">Purchase price: <span className="font-mono text-yellow-400">{ownedSpace?.price ?? 0}c</span></p>
                            <p className="text-gray-400">Current tier: <span className="text-yellow-300">{TIER_NAMES[ownedProperty.tier] ?? `Tier ${ownedProperty.tier}`}</span></p>
                            <p className="text-gray-400">Mortgage value: <span className="font-mono text-orange-300">{Math.floor((ownedSpace?.price ?? 0) / 2)}c</span></p>
                            {ownedSpace?.rentPerTier && <div className="mt-2 border-t border-gray-800 pt-2 text-gray-500">Rent: {ownedSpace.rentPerTier.slice(0, ownedSpace.type === 'TRANSIT' ? 4 : undefined).join('c / ')}c</div>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {pendingSale === ownedProperty.spaceIndex && (
                        <div className="flex shrink-0 flex-col gap-1 text-[10px]">
                          {ownedProperty.mortgaged ? (
                            <button type="button" onClick={() => { onAction({ type: 'UNMORTGAGE_PROPERTY', spaceIndex: ownedProperty.spaceIndex }); setPendingSale(null); setShowInventory(false); }} className="font-bold text-cyan-300 hover:text-cyan-200">Unmortgage</button>
                          ) : ownedProperty.tier > 0 ? (
                            <span className="text-gray-500">Sell upgrades first</span>
                          ) : (
                            <button type="button" onClick={() => { onAction({ type: 'MORTGAGE_PROPERTY', spaceIndex: ownedProperty.spaceIndex }); setPendingSale(null); setShowInventory(false); }} className="font-bold text-emerald-300 hover:text-emerald-200">Mortgage</button>
                          )}
                          <button type="button" onClick={() => setPendingSale(null)} className="text-gray-500 hover:text-white">Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ), document.body)}
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
