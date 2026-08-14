'use client';
import { GameState, Player, Property } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { TIER_NAMES } from '@/lib/engine/types';
import { motion } from 'framer-motion';
import { useGameStore, AnimationState } from '@/lib/store';

interface BoardGridProps {
  state: GameState;
}

const TIER_INDICATORS = ['', '▪', '▪▪', '▪▪▪', '★'];

export default function BoardGrid({ state }: BoardGridProps) {
  const anim = useGameStore((s: any) => s.anim) as AnimationState;
  if (!state) return null;

  const getGridPosition = (index: number): { row: number; col: number } => {
    if (index <= 10) return { row: 10, col: index };
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

  const playersOnSpace = (spaceIndex: number): (Player & { isAnimToken?: boolean })[] => {
    const realPlayers = (state?.players ?? []).filter((p: Player) => {
      if (!p?.isAlive) return false;
      // If this player is being animated, hide them from their real final position
      // and show them at the animated position instead
      if (isMoving && p.id === anim.movingPlayerId) {
        return animatedPos === spaceIndex;
      }
      return (p?.position ?? -1) === spaceIndex;
    });

    return realPlayers;
  };

  const getPropertyState = (spaceIndex: number): Property | undefined => {
    return (state?.properties ?? []).find((p: Property) => p.spaceIndex === spaceIndex);
  };

  return (
    <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gridTemplateRows: 'repeat(11, minmax(0, 1fr))' }}>
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
        const prop = getPropertyState(idx);
        const players = playersOnSpace(idx);
        const isOwned = prop?.ownerId != null;
        const owner = isOwned ? (state?.players ?? []).find((p: Player) => p.id === prop?.ownerId) : null;
        const tier = prop?.tier ?? 0;
        const isCorner = [0, 10, 20, 30].includes(idx);

        return (
          <div
            key={idx}
            className={`relative flex flex-col items-center justify-between p-[3px] rounded border transition-all ${
              isCorner ? 'w-[70px] h-[70px] md:w-[80px] md:h-[80px]' : 'w-[60px] h-[70px] md:w-[66px] md:h-[80px]'
            } ${
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
        );
      })}
    </div>
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
