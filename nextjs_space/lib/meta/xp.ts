// ============================================
// XP & Level System
// ============================================
import { GameState, Player, GameMode } from '../engine/types';
import { calculateNetWorth } from '../engine/reducer';

export const LEVEL_THRESHOLDS = [
  0,     // Level 1
  100,   // Level 2
  300,   // Level 3
  600,   // Level 4
  1000,  // Level 5
  1500,  // Level 6
  2200,  // Level 7
  3000,  // Level 8
  4000,  // Level 9
  5200,  // Level 10
  6600,  // Level 11
  8200,  // Level 12
  10000, // Level 13
  12000, // Level 14
  15000, // Level 15 (MAX)
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function getLevelForXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(currentXP: number): { current: number; next: number; progress: number } {
  const level = getLevelForXP(currentXP);
  if (level >= MAX_LEVEL) return { current: currentXP, next: currentXP, progress: 1 };
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const progress = (currentXP - currentThreshold) / (nextThreshold - currentThreshold);
  return { current: currentXP - currentThreshold, next: nextThreshold - currentThreshold, progress };
}

// XP awarded at end of game
export function calculateGameXP(state: GameState, playerId: string): { total: number; breakdown: { label: string; xp: number }[] } {
  const breakdown: { label: string; xp: number }[] = [];
  const player = (state.players ?? []).find((p: Player) => p.id === playerId);
  if (!player) return { total: 0, breakdown };

  // Base XP for completing a game
  breakdown.push({ label: 'Game Completed', xp: 50 });

  // Win bonus
  if (state.winner === playerId) {
    breakdown.push({ label: 'Victory!', xp: 100 });
  }

  // Survival bonus (if not bankrupt)
  if (player.isAlive) {
    breakdown.push({ label: 'Survived', xp: 25 });
  }

  // Net worth bonus (1 XP per 100 coins)
  const nw = calculateNetWorth(state, player);
  const nwXP = Math.floor(nw / 100);
  if (nwXP > 0) breakdown.push({ label: 'Net Worth', xp: nwXP });

  // Properties owned
  const ownedProps = (state.properties ?? []).filter((p: any) => p.ownerId === playerId);
  if (ownedProps.length > 0) {
    breakdown.push({ label: `${ownedProps.length} Properties`, xp: ownedProps.length * 5 });
  }

  // Charms held
  const charmCount = (player.charms ?? []).length;
  if (charmCount > 0) {
    breakdown.push({ label: `${charmCount} Charms`, xp: charmCount * 10 });
  }

  // Synergies
  const synergyCount = (player.activeSynergies ?? []).length;
  if (synergyCount > 0) {
    breakdown.push({ label: `${synergyCount} Synergies`, xp: synergyCount * 20 });
  }

  // Mode bonus
  const mode = state.config?.mode ?? 'classic';
  if (mode === 'hardcore') {
    breakdown.push({ label: 'Hardcore Bonus', xp: 50 });
  } else if (mode === 'quick') {
    breakdown.push({ label: 'Quick Match', xp: 10 });
  }

  // Round bonus (more rounds = more XP)
  const roundBonus = Math.floor((state.round ?? 1) * 2);
  if (roundBonus > 0) breakdown.push({ label: `${state.round} Rounds`, xp: roundBonus });

  const total = breakdown.reduce((sum, b) => sum + b.xp, 0);
  return { total, breakdown };
}
