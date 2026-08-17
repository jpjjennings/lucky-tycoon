'use client';
import { Player, Property, GameState, OwnedCharm } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { getCharmDef, RARITY_COLORS } from '@/lib/engine/charms-data';
import { computeModifiers } from '@/lib/engine/charm-effects';
import { calculateNetWorth } from '@/lib/engine/reducer';
import { motion } from 'framer-motion';
import { Coins, MapPin, Crown, Skull } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlayerPanelProps {
  player: Player;
  isActive: boolean;
  properties: Property[];
  state: GameState;
  onCharmClick?: (charm: OwnedCharm) => void;
}

export default function PlayerPanel({ player, isActive, properties, state, onCharmClick }: PlayerPanelProps) {
  if (!player) return null;

  const netWorth = calculateNetWorth(state, player);
  const space = BOARD_SPACES[player?.position ?? 0];
  const mods = computeModifiers(player, state, 'PASSIVE');
  const maxSlots = (state?.config?.maxCharmSlots ?? 3) + (mods.extraCharmSlots ?? 0);

  return (
    <motion.div
      className={`rounded-lg p-3 border transition-all min-w-[200px] lg:min-w-0 ${
        isActive
          ? 'border-yellow-500/50 bg-yellow-500/10 ring-1 ring-yellow-500/30'
          : 'border-gray-800 bg-gray-900/60'
      } ${!player.isAlive ? 'opacity-40' : ''}`}
      animate={isActive ? { scale: 1.02 } : { scale: 1 }}
    >
      {/* Name row */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: player.color + '30', border: `2px solid ${player.color}` }}
        >
          {player.isAlive ? player.icon : <Skull className="w-4 h-4 text-gray-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" style={{ color: player.color }}>
            {player.name}
            {player.isAI && <span className="ml-1 text-cyan-400" title={`${player.aiPersonality ?? 'cautious'} AI`}>🤖</span>}
            {isActive && player.isAI && <span className="ml-1 animate-pulse text-[10px] text-cyan-300">Thinking...</span>}
            {isActive && <span className="ml-1 text-yellow-400 text-xs">◀</span>}
          </div>
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {space?.name ?? 'Start'}
          </div>
        </div>
      </div>

      {/* Money & Net Worth */}
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1 text-yellow-400">
          <Coins className="w-3 h-3" />
          <span className="font-mono font-bold">{(player?.money ?? 0).toLocaleString('en-US')}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Crown className="w-3 h-3" />
          <span className="font-mono">{netWorth.toLocaleString('en-US')}</span>
        </div>
      </div>

      {/* Active Synergies */}
      {(player?.activeSynergies ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {(player.activeSynergies ?? []).map((sid: string) => (
            <span key={sid} className="text-[9px] bg-purple-500/20 text-purple-300 rounded px-1.5 py-0.5 border border-purple-500/20">
              ✦ {sid.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Properties */}
      {properties.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {properties.map((prop: Property) => {
            const sp = BOARD_SPACES[prop?.spaceIndex ?? 0];
            return (
              <TooltipProvider key={prop.spaceIndex}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="w-4 h-4 rounded-sm border"
                      style={{
                        backgroundColor: sp?.color ?? '#666',
                        borderColor: sp?.color ?? '#666',
                        opacity: 0.6 + (prop.tier ?? 0) * 0.1,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{sp?.name ?? 'Property'}</p>
                    <p className="text-gray-400">Tier: {['Vacant', 'Shop', 'Business', 'Complex', 'Empire'][prop?.tier ?? 0]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Charms */}
      {(player?.charms ?? []).length > 0 && (
        <div className="flex gap-1">
          {(player.charms ?? []).map((charm: OwnedCharm) => {
            const def = getCharmDef(charm?.definitionId ?? '');
            const level = charm?.level ?? 1;
            return (
              <TooltipProvider key={charm.instanceId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onCharmClick?.(charm)}
                      aria-label={`View details for ${def?.name ?? 'charm'}`}
                      className="w-6 h-6 rounded flex items-center justify-center text-xs border relative cursor-pointer transition-transform hover:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-400"
                      style={{
                        borderColor: RARITY_COLORS[def?.rarity ?? 'Common'] ?? '#666',
                        backgroundColor: (RARITY_COLORS[def?.rarity ?? 'Common'] ?? '#666') + '20',
                      }}
                    >
                      {def?.icon ?? '?'}
                      {level > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-cyan-600 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                          {level}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-medium" style={{ color: RARITY_COLORS[def?.rarity ?? 'Common'] }}>
                      {def?.name ?? 'Unknown'}
                      {level > 1 && <span className="ml-1 text-cyan-400">Lv.{level}</span>}
                      <span className="text-xs opacity-70 ml-1">({def?.rarity})</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{def?.description}</p>
                    {def?.upgradeable && level < (def?.maxLevel ?? 1) && def?.upgradeDescriptions && (
                      <p className="text-[10px] text-cyan-400 mt-1">Next: {def.upgradeDescriptions[level - 1]}</p>
                    )}
                    <p className="text-[10px] text-yellow-400/80 mt-1">Click for full details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, maxSlots - (player?.charms ?? []).length) }).map((_: any, i: number) => (
            <div key={`empty-${i}`} className="w-6 h-6 rounded border border-gray-700/50 border-dashed flex items-center justify-center text-gray-700 text-[10px]">
              ✧
            </div>
          ))}
        </div>
      )}

      {/* Jail indicator */}
      {(player?.turnsInJail ?? 0) > 0 && (
        <div className="mt-1 text-[10px] text-orange-400 bg-orange-400/10 rounded px-2 py-0.5">
          🔒 In Jail (Turn {player.turnsInJail}/3)
        </div>
      )}
    </motion.div>
  );
}
