// ============================================
// Player Profile — localStorage persistence
// ============================================
import { GameState, Player, GameMode } from '../engine/types';
import { calculateNetWorth } from '../engine/reducer';
import { calculateGameXP, getLevelForXP } from './xp';
import { checkEndOfGameAchievements, ACHIEVEMENTS } from './achievements';

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: string;
  totalXP: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  highestNetWorth: number;
  totalMoneyEarned: number;
  totalRentsCollected: number;
  favoriteCharmId: string | null;
  modesWon: string[];   // modes where player has won at least once
  unlockedAchievements: string[];
  selectedTokenId: string;
  selectedSkinId: string;
  // Per-mode stats
  modeStats: Record<string, { played: number; won: number }>;
  // Charm usage stats
  charmUsage: Record<string, number>; // charm id -> times held at end of game
}

const STORAGE_KEY = 'lucky-tycoon-profile';

function createDefaultProfile(): PlayerProfile {
  return {
    id: `profile-${Date.now()}`,
    name: 'Tycoon',
    createdAt: new Date().toISOString(),
    totalXP: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    highestNetWorth: 0,
    totalMoneyEarned: 0,
    totalRentsCollected: 0,
    favoriteCharmId: null,
    modesWon: [],
    unlockedAchievements: [],
    selectedTokenId: 'rocket',
    selectedSkinId: 'classic',
    modeStats: {},
    charmUsage: {},
  };
}

export function getProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    return { ...createDefaultProfile(), ...JSON.parse(raw) };
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function updateProfileName(name: string): void {
  const p = getProfile();
  p.name = name;
  saveProfile(p);
}

export function setSelectedToken(tokenId: string): void {
  const p = getProfile();
  p.selectedTokenId = tokenId;
  saveProfile(p);
}

export function setSelectedSkin(skinId: string): void {
  const p = getProfile();
  p.selectedSkinId = skinId;
  saveProfile(p);
}

export interface EndOfGameResult {
  xpGained: number;
  xpBreakdown: { label: string; xp: number }[];
  newAchievements: string[];
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
}

// Process end-of-game stats and return results
export function processEndOfGame(state: GameState, playerId: string): EndOfGameResult {
  const profile = getProfile();
  const player = (state.players ?? []).find((p: Player) => p.id === playerId);
  if (!player) return { xpGained: 0, xpBreakdown: [], newAchievements: [], levelBefore: 1, levelAfter: 1, leveledUp: false };

  const isWinner = state.winner === playerId;
  const mode = state.config?.mode ?? 'classic';
  const netWorth = calculateNetWorth(state, player);

  const levelBefore = getLevelForXP(profile.totalXP);

  // Calculate XP
  const { total: gameXP, breakdown } = calculateGameXP(state, playerId);

  // Check achievements
  const newAchievements = checkEndOfGameAchievements(state, playerId, profile);

  // Award achievement XP
  let achievementXP = 0;
  for (const achId of newAchievements) {
    const ach = ACHIEVEMENTS.find((a) => a.id === achId);
    if (ach) achievementXP += ach.xpReward;
  }
  if (achievementXP > 0) {
    breakdown.push({ label: 'Achievements', xp: achievementXP });
  }

  const totalXPGained = gameXP + achievementXP;

  // Update profile
  profile.totalXP += totalXPGained;
  profile.gamesPlayed += 1;
  if (isWinner) {
    profile.wins += 1;
    if (!profile.modesWon.includes(mode)) {
      profile.modesWon.push(mode);
    }
  } else {
    profile.losses += 1;
  }
  if (netWorth > profile.highestNetWorth) {
    profile.highestNetWorth = netWorth;
  }

  // Mode stats
  if (!profile.modeStats[mode]) profile.modeStats[mode] = { played: 0, won: 0 };
  profile.modeStats[mode].played += 1;
  if (isWinner) profile.modeStats[mode].won += 1;

  // Charm usage
  for (const charm of (player.charms ?? [])) {
    profile.charmUsage[charm.definitionId] = (profile.charmUsage[charm.definitionId] ?? 0) + 1;
  }
  // Find favorite charm
  const entries = Object.entries(profile.charmUsage);
  if (entries.length > 0) {
    profile.favoriteCharmId = entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  // Unlock achievements
  profile.unlockedAchievements = [...new Set([...profile.unlockedAchievements, ...newAchievements])];

  // Check level-based achievement
  const levelAfter = getLevelForXP(profile.totalXP);
  if (levelAfter >= 10 && !profile.unlockedAchievements.includes('level-10')) {
    profile.unlockedAchievements.push('level-10');
    newAchievements.push('level-10');
  }

  saveProfile(profile);

  return {
    xpGained: totalXPGained,
    xpBreakdown: breakdown,
    newAchievements,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
  };
}

export function resetProfile(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
