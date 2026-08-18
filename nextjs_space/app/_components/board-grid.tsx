'use client';
import { useMemo } from 'react';
import { GameState, Player, Property } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { TIER_NAMES } from '@/lib/engine/types';
import { motion } from 'framer-motion';
import { useGameStore, AnimationState } from '@/lib/store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BoardGridProps {
  state: GameState;
}

const TIER_INDICATORS = ['', '▪', '▪▪', '▪▪▪', '★'];

export default function BoardGrid({ state }: BoardGridProps) {
  const anim = useGameStore((s: any) => s.anim) as AnimationState;
  if (!state) return null;

  const getGridPosition = (index: number): { row: number; col: number } => {
    if (index <= 10) return { row: 10, col: 10 - index };
    if (index <= 19) return { row: 10 - (index - 10), col: 0 };
    if (index <= 30) return { row: 0, col: index - 20 };
    return { row: index - 30, col: 10 };
  };

  // During movement animation, override the animated player's position
  // to their current step in the movePath instead of their real (final) position.
  const isMoving = anim.phase === 'moving' && anim.movingPlayerId && anim.movePath.length > 0;
  const animatedPos = isMoving && anim.moveStep >= 0 && anim.moveStep < anim.movePath.length
    ? anim.movePath[anim.moveStep]
    : null;

  const playersBySpace = useMemo(() => {
    const bySpace = new Map<number, Player[]>();
    (state?.players ?? []).forEach((p: Player) => {
      if (!p?.isAlive) return;
      // Keep the token at its starting space until the dice result is confirmed.
      let displaySpace = p.position ?? -1;
      if (p.id === anim.movingPlayerId && anim.phase === 'rolling') {
        displaySpace = anim.startPosition ?? displaySpace;
      }
      // Once movement starts, hide the final state position and show the animated path.
      if (isMoving && p.id === anim.movingPlayerId) {
        displaySpace = animatedPos ?? displaySpace;
      }
      if (displaySpace >= 0) {
        bySpace.set(displaySpace, [...(bySpace.get(displaySpace) ?? []), p]);
      }
    });
    return bySpace;
  }, [state?.players, anim.movingPlayerId, anim.phase, anim.startPosition, animatedPos, isMoving]);

  const propertyBySpace = useMemo(
    () => new Map((state?.properties ?? []).map((property: Property) => [property.spaceIndex, property])),
    [state?.properties],
  );
  const playerById = useMemo(
    () => new Map((state?.players ?? []).map((player: Player) => [player.id, player])),
    [state?.players],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="game-board-grid inline-grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gridTemplateRows: 'repeat(11, minmax(0, 1fr))' }}>
      {/* Center area */}
      <div
        className="bg-gray-900/60 rounded-lg flex flex-col items-center justify-center p-2 border border-gray-800/50"
        style={{ gridRow: '2 / 10', gridColumn: '2 / 10' }}
      >
        <span className="text-4xl mb-1">🍀</span>
        <span className="font-display font-bold text-yellow-400 text-lg tracking-tight">Lucky</span>
        <span className="font-display font-bold text-emerald-400 text-sm tracking-tight">Tycoon</span>
        <div className="mt-2 text-xs text-gray-500">
          Round {state?.round ?? 1} / {state?.config?.maxRounds ?? 30}
        </div>
      </div>

      {/* Board spaces */}
      {BOARD_SPACES.map((space: any, idx: number) => {
        const pos = getGridPosition(idx);
          const prop = propertyBySpace.get(idx);
          const players = playersBySpace.get(idx) ?? [];
          const isOwned = prop?.ownerId != null;
          const owner = isOwned ? playerById.get(prop?.ownerId ?? '') : null;
        const tier = prop?.tier ?? 0;

         return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <div
                tabIndex={0}
                role="article"
                aria-label={`${space.name}. ${space.type.replace(/_/g, ' ')}${owner ? `. Owned by ${owner.name}` : ''}`}
                className={`relative flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-between p-[3px] rounded border transition-all ${
                  players.length > 0 ? 'ring-1 ring-yellow-500/50' : ''
                }`}
                style={{
                  gridRow: pos.row + 1,
                  gridColumn: pos.col + 1,
                  backgroundColor: space.color ? `${space.color}15` : 'rgba(30,30,40,0.8)',
                  borderColor: space.color ? `${space.color}40` : 'rgba(55,55,70,0.5)',
                }}
              >
            {/* Color stripe for property group */}
            {space.color && (
              <div
                className="absolute top-0 left-0 right-0 h-[6px] rounded-t"
                style={{ backgroundColor: space.color }}
              />
            )}

            {/* Owner indicator */}
            {owner && (
              <div
                className="absolute top-0 right-0 w-3 h-3 rounded-bl rounded-tr"
                style={{ backgroundColor: owner.color }}
              />
            )}

            {/* Space name */}
            <div className="text-[7px] md:text-[8px] leading-tight text-center text-gray-300 mt-1 line-clamp-2 font-medium">
              {getSpaceIcon(space.type)} {space.name}
            </div>

            {/* Price / Tax */}
            {space.price != null && !isOwned && (
              <div className="text-[7px] text-yellow-500/80">{space.price}c</div>
            )}
            {space.taxAmount != null && (
              <div className="text-[7px] text-red-400/80">-{space.taxAmount}c</div>
            )}

            {/* Tier indicator */}
            {tier > 0 && (
              <div className="text-[8px] text-yellow-400">{TIER_INDICATORS[tier]}</div>
            )}

            {/* Player tokens */}
            {players.length > 0 && (
              <div className="flex gap-[2px] flex-wrap justify-center">
                {players.map((p: Player) => {
                  const isAnimating = isMoving && p.id === anim.movingPlayerId;
                  return (
                    <motion.div
                      key={p.id}
                      layoutId={`token-${p.id}`}
                      className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[10px] shadow-lg ${
                        isAnimating ? 'z-20 ring-2 ring-white/60' : ''
                      }`}
                      style={{
                        backgroundColor: p.color,
                        boxShadow: isAnimating
                          ? `0 0 14px ${p.color}, 0 0 4px rgba(255,255,255,0.5)`
                          : `0 0 6px ${p.color}80`,
                      }}
                      initial={{ scale: 0 }}
                      animate={isAnimating ? { scale: [1, 1.3, 1], y: [0, -4, 0] } : { scale: 1 }}
                      transition={
                        isAnimating
                          ? { duration: 0.18, ease: 'easeOut' }
                          : { type: 'spring', stiffness: 300, damping: 20 }
                      }
                      layout
                    >
                      {p.icon}
                    </motion.div>
                  );
                })}
              </div>
            )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-50 w-56 border-gray-700 bg-gray-950 p-3 text-gray-100 shadow-xl">
              <div className="space-y-2">
                <div>
                  <div className="font-display font-bold" style={{ color: space.color ?? '#facc15' }}>{space.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">{space.type.replace(/_/g, ' ')}</div>
                </div>

                {space.price != null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Purchase price</span>
                    <span className="font-mono font-bold text-yellow-400">{space.price}c</span>
                  </div>
                )}

                {prop?.ownerId && owner && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Owner</span>
                    <span className="font-medium" style={{ color: owner.color }}>{owner.name}</span>
                  </div>
                )}

                {space.type === 'UTILITY' ? (
                  <div className="border-t border-gray-800 pt-2 text-xs">
                    <div className="mb-1 text-gray-400">Rent</div>
                    <div className="text-cyan-300">Dice total × 4</div>
                    <div className="text-[10px] text-gray-500">× 10 when both utilities are owned</div>
                  </div>
                ) : space.rentPerTier?.some((rent: number) => rent > 0) ? (
                  <div className="border-t border-gray-800 pt-2 text-xs">
                    <div className="mb-1 text-gray-400">Rent</div>
                    <div className="space-y-0.5">
                      {space.rentPerTier
                        .filter((_: number, tier: number) => space.type !== 'TRANSIT' || tier < 4)
                        .map((rent: number, tier: number) => (
                        <div key={tier} className="flex items-center justify-between">
                          <span className="text-gray-500">
                            {space.type === 'TRANSIT'
                              ? `${tier + 1} station${tier === 0 ? '' : 's'}`
                              : TIER_NAMES[tier] ?? `Tier ${tier}`}
                          </span>
                          <span className="font-mono text-emerald-300">{rent}c</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : space.taxAmount != null ? (
                  <div className="flex items-center justify-between border-t border-gray-800 pt-2 text-xs">
                    <span className="text-gray-400">Tax</span>
                    <span className="font-mono text-red-400">{space.taxAmount}c</span>
                  </div>
                ) : null}

                {prop && prop.tier > 0 && (
                  <div className="text-[10px] text-yellow-400">Current tier: {TIER_NAMES[prop.tier] ?? `Tier ${prop.tier}`}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
      </div>
    </TooltipProvider>
  );
}

function getSpaceIcon(type: string): string {
  switch (type) {
    case 'START': return '🏁';
    case 'TAX': return '💰';
    case 'JAIL_VISIT': return '🔒';
    case 'GO_TO_JAIL': return '🚔';
    case 'LUCKY_SPACE': return '🍀';
    case 'RISK_SPACE': return '🎰';
    case 'TRANSIT': return '🚂';
    case 'UTILITY': return '⚡';
    case 'EVENT': return '🎴';
    case 'FREE_PARKING': return '🅿️';
    default: return '';
  }
}
