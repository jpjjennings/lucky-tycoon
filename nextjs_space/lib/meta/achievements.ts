// ============================================
// Achievement System
// ============================================
import { GameState, Player, GameMode } from '../engine/types';
import { calculateNetWorth } from '../engine/reducer';
import { getCharmDef } from '../engine/charms-data';
import { BOARD_SPACES } from '../engine/board-data';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'victory' | 'charm' | 'property' | 'challenge' | 'mastery';
  hidden?: boolean;  // secret achievements
  xpReward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Victory
  { id: 'first-win', name: 'Lucky Break', description: 'Win your first game.', icon: '🏆', category: 'victory', xpReward: 50 },
  { id: 'win-5', name: 'Tycoon Rising', description: 'Win 5 games.', icon: '🌟', category: 'victory', xpReward: 100 },
  { id: 'win-10', name: 'Property Mogul', description: 'Win 10 games.', icon: '👑', category: 'victory', xpReward: 200 },
  { id: 'flawless', name: 'Flawless Victory', description: 'Win without ever going below 100 coins.', icon: '💎', category: 'victory', xpReward: 150 },
  { id: 'underdog', name: 'Underdog', description: 'Win after being the poorest player mid-game.', icon: '🐕', category: 'victory', xpReward: 150 },

  // Charms
  { id: 'charm-collector', name: 'Charm Collector', description: 'Hold 3 charms at once in a game.', icon: '✨', category: 'charm', xpReward: 30 },
  { id: 'charm-hoarder', name: 'Charm Hoarder', description: 'Hold 5+ charms at once.', icon: '🧲', category: 'charm', xpReward: 80 },
  { id: 'cursed-victory', name: 'Embrace the Curse', description: 'Win with 3 or more Cursed charms.', icon: '🔮', category: 'charm', xpReward: 200 },
  { id: 'synergy-master', name: 'Synergy Master', description: 'Activate 3 synergies in a single game.', icon: '🌊', category: 'charm', xpReward: 120 },
  { id: 'legendary-find', name: 'Legendary Find', description: 'Obtain a Legendary charm.', icon: '🌈', category: 'charm', xpReward: 60 },
  { id: 'max-charm', name: 'Fully Charged', description: 'Upgrade a charm to max level.', icon: '⚡', category: 'charm', xpReward: 80 },

  // Property
  { id: 'landlord', name: 'Landlord', description: 'Own 8 or more properties at once.', icon: '🏢', category: 'property', xpReward: 50 },
  { id: 'empire', name: 'Empire State', description: 'Upgrade a property to Empire tier.', icon: '🏗️', category: 'property', xpReward: 40 },
  { id: 'monopolist', name: 'Monopolist', description: 'Own all properties in a colour group.', icon: '🎨', category: 'property', xpReward: 60 },
  { id: 'millionaire', name: 'Millionaire', description: 'Reach 5,000+ net worth.', icon: '💰', category: 'property', xpReward: 100 },
  { id: 'mega-rent', name: 'Mega Rent', description: 'Collect 500+ coins in a single rent payment.', icon: '💸', category: 'property', xpReward: 80 },

  // Challenge
  { id: 'hardcore-win', name: 'Iron Will', description: 'Win a Hardcore game.', icon: '💀', category: 'challenge', xpReward: 200 },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Win a Quick Match.', icon: '⚡', category: 'challenge', xpReward: 80 },
  { id: 'bankrupt-all', name: 'Total Domination', description: 'Bankrupt all opponents.', icon: '💣', category: 'challenge', xpReward: 150 },
  { id: 'comeback', name: 'Comeback Kid', description: 'Win after being in jail.', icon: '🔓', category: 'challenge', xpReward: 60 },
  { id: 'pacifist', name: 'Pacifist', description: 'Win without bankrupting anyone.', icon: '☘️', category: 'challenge', xpReward: 120 },

  // Mastery
  { id: 'games-10', name: 'Dedicated', description: 'Play 10 games.', icon: '🎮', category: 'mastery', xpReward: 50 },
  { id: 'games-25', name: 'Veteran', description: 'Play 25 games.', icon: '🎖️', category: 'mastery', xpReward: 100 },
  { id: 'games-50', name: 'Legend', description: 'Play 50 games.', icon: '🌟', category: 'mastery', xpReward: 200 },
  { id: 'all-modes', name: 'Versatile', description: 'Win a game in every mode (Classic, Quick, Hardcore).', icon: '🎭', category: 'mastery', xpReward: 150 },
  { id: 'level-10', name: 'Elite Tycoon', description: 'Reach Level 10.', icon: '💎', category: 'mastery', xpReward: 250 },
];

// Check which achievements were earned this game
export function checkEndOfGameAchievements(
  state: GameState,
  playerId: string,
  profile: { gamesPlayed: number; wins: number; modesWon: string[]; unlockedAchievements: string[] }
): string[] {
  const newAchievements: string[] = [];
  const already = new Set(profile.unlockedAchievements);
  const player = (state.players ?? []).find((p: Player) => p.id === playerId);
  if (!player) return [];

  const isWinner = state.winner === playerId;
  const mode = state.config?.mode ?? 'classic';
  const netWorth = calculateNetWorth(state, player);
  const charms = player.charms ?? [];
  const synergies = player.activeSynergies ?? [];
  const ownedProps = (state.properties ?? []).filter((p: any) => p.ownerId === playerId);
  const alivePlayers = (state.players ?? []).filter((p: Player) => p.isAlive);

  function earn(id: string) {
    if (!already.has(id)) {
      newAchievements.push(id);
      already.add(id);
    }
  }

  // Victory achievements
  if (isWinner) {
    earn('first-win');
    if (profile.wins + 1 >= 5) earn('win-5');
    if (profile.wins + 1 >= 10) earn('win-10');
    if (mode === 'hardcore') earn('hardcore-win');
    if (mode === 'quick') earn('speed-demon');
    if (alivePlayers.length === 1) earn('bankrupt-all');
    if (alivePlayers.length === (state.players ?? []).length) earn('pacifist');
  }

  // Charm achievements
  if (charms.length >= 3) earn('charm-collector');
  if (charms.length >= 5) earn('charm-hoarder');
  if (synergies.length >= 3) earn('synergy-master');

  const cursedCount = charms.filter((c: any) => {
    const def = getCharmDef(c.definitionId);
    return def?.rarity === 'Cursed';
  }).length;
  if (isWinner && cursedCount >= 3) earn('cursed-victory');

  const hasLegendary = charms.some((c: any) => {
    const def = getCharmDef(c.definitionId);
    return def?.rarity === 'Legendary';
  });
  if (hasLegendary) earn('legendary-find');

  const hasMaxLevelCharm = charms.some((c: any) => {
    const def = getCharmDef(c.definitionId);
    return def?.upgradeable && (c.level ?? 1) >= (def?.maxLevel ?? 1);
  });
  if (hasMaxLevelCharm) earn('max-charm');

  // Property achievements
  if (ownedProps.length >= 8) earn('landlord');
  if (ownedProps.some((p: any) => (p.tier ?? 0) >= 4)) earn('empire');
  if (netWorth >= 5000) earn('millionaire');

  // Mastery
  const totalGames = profile.gamesPlayed + 1;
  if (totalGames >= 10) earn('games-10');
  if (totalGames >= 25) earn('games-25');
  if (totalGames >= 50) earn('games-50');

  // Monopolist: check if player owns all props in any group
  const colorGroups = new Set<string>();
  ownedProps.forEach((p: any) => {
    const space = BOARD_SPACES[p.spaceIndex];
    if (space?.group) colorGroups.add(space.group);
  });
  for (const group of colorGroups) {
    const groupSpaces = BOARD_SPACES.filter((s: any) => s.group === group && s.type === 'PROPERTY');
    const owned = groupSpaces.filter((s: any) =>
      ownedProps.some((p: any) => p.spaceIndex === s.index)
    );
    if (owned.length === groupSpaces.length && groupSpaces.length > 0) {
      earn('monopolist');
      break;
    }
  }

  // All modes won
  if (isWinner) {
    const updatedModesWon = [...new Set([...profile.modesWon, mode])];
    if (updatedModesWon.includes('classic') && updatedModesWon.includes('quick') && updatedModesWon.includes('hardcore')) {
      earn('all-modes');
    }
  }

  return newAchievements;
}
