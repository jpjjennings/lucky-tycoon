// ============================================
// Reducer utility helpers
// ============================================
import { GameState, Player, Property, GameEventEntry, OwnedCharm } from './types';
import { BOARD_SPACES } from './board-data';
import { SYNERGIES } from './charms-data';

let logIdCounter = 0;

export function addLogEntry(
  log: GameEventEntry[],
  entry: Omit<GameEventEntry, 'id' | 'timestamp'>
): GameEventEntry[] {
  logIdCounter++;
  return [
    ...(log ?? []),
    {
      ...entry,
      id: `log-${logIdCounter}-${Date.now()}`,
      timestamp: Date.now(),
    },
  ];
}

export function getPlayer(state: GameState): Player | undefined {
  return state?.players?.[state?.currentPlayerIndex ?? 0];
}

export function getSpace(index: number) {
  return BOARD_SPACES[index % 40];
}

export function getProperty(state: GameState, spaceIndex: number): Property | undefined {
  return (state?.properties ?? []).find((p: Property) => p.spaceIndex === spaceIndex);
}

export function updatePlayer(state: GameState, playerId: string, updates: Partial<Player>): Player[] {
  return (state?.players ?? []).map((p: Player) =>
    p.id === playerId ? { ...p, ...updates } : p
  );
}

export function updateProperty(state: GameState, spaceIndex: number, updates: Partial<Property>): Property[] {
  return (state?.properties ?? []).map((p: Property) =>
    p.spaceIndex === spaceIndex ? { ...p, ...updates } : p
  );
}

export function playerOwnsFullGroup(state: GameState, playerId: string, group: string): boolean {
  const groupSpaces = BOARD_SPACES.filter((s: any) => s.group === group && s.type === 'PROPERTY');
  if (groupSpaces.length === 0) return false;
  return groupSpaces.every((s: any) => {
    const prop = getProperty(state, s.index);
    return prop?.ownerId === playerId;
  });
}

export function countOwnedInGroup(state: GameState, playerId: string, group: string): number {
  return BOARD_SPACES.filter((s: any) => s.group === group)
    .filter((s: any) => {
      const prop = getProperty(state, s.index);
      return prop?.ownerId === playerId;
    }).length;
}

export function calculateRent(
  state: GameState,
  space: any,
  prop: Property,
  rentMultiplier: number
): number {
  if (!space || !prop) return 0;

  // Transit rent = 25 * 2^(owned-1)
  if (space.type === 'TRANSIT') {
    const ownedTransits = countOwnedInGroup(state, prop.ownerId ?? '', 'transit');
    return Math.floor(25 * Math.pow(2, ownedTransits - 1) * rentMultiplier);
  }

  // Utility rent = dice * multiplier based on owned utilities
  if (space.type === 'UTILITY') {
    const ownedUtils = countOwnedInGroup(state, prop.ownerId ?? '', 'utility');
    const diceTotal = (state?.diceResult?.[0] ?? 0) + (state?.diceResult?.[1] ?? 0);
    const utilMultiplier = ownedUtils >= 2 ? 10 : 4;
    return Math.floor(diceTotal * utilMultiplier * rentMultiplier);
  }

  // Standard property
  const tier = prop.tier ?? 0;
  const rents = space.rentPerTier ?? [0];
  let rent = rents[tier] ?? rents[0] ?? 0;

  // Full group bonus (double rent on unimproved)
  if (tier === 0 && playerOwnsFullGroup(state, prop.ownerId ?? '', space.group ?? '')) {
    rent *= 2;
  }

  let finalRent = Math.floor(rent * rentMultiplier);

  // Property Boom event: double rents
  if ((state.activeEvent?.id ?? '') === 'property-boom') {
    finalRent *= 2;
  }

  // Market Crash event: halve rents
  if ((state.activeEvent?.id ?? '') === 'market-crash') {
    finalRent = Math.floor(finalRent / 2);
  }

  // Accelerated economy mode: 50% higher rents
  if (state.config?.acceleratedEconomy) {
    finalRent = Math.floor(finalRent * 1.5);
  }

  return finalRent;
}

export function calculateNetWorth(state: GameState, player: Player): number {
  let worth = player?.money ?? 0;
  const props = (state?.properties ?? []).filter((p: Property) => p.ownerId === player?.id);
  for (const prop of props) {
    const space = getSpace(prop.spaceIndex);
    const price = space?.price ?? 0;
    worth += prop.mortgaged ? Math.floor(price / 2) : price;
    worth += (prop.tier ?? 0) * (space?.upgradeCost ?? 0);
  }
  for (const charm of (player?.charms ?? [])) {
    const { getCharmDef } = require('./charms-data');
    const def = getCharmDef(charm?.definitionId ?? '');
    worth += def?.sellValue ?? 0;
  }
  return worth;
}

export function checkSynergies(player: Player): string[] {
  const charmIds = (player?.charms ?? []).map((c: OwnedCharm) => c.definitionId);
  const active: string[] = [];
  for (const syn of SYNERGIES) {
    if ((syn.requiredCharmIds ?? []).every((id: string) => charmIds.includes(id))) {
      active.push(syn.id);
    }
  }
  return active;
}

export function nextAlivePlayer(state: GameState): number {
  const players = state?.players ?? [];
  let idx = ((state?.currentPlayerIndex ?? 0) + 1) % players.length;
  let safety = 0;
  while (!players[idx]?.isAlive && safety < players.length) {
    idx = (idx + 1) % players.length;
    safety++;
  }
  return idx;
}

export function countAlivePlayers(state: GameState): number {
  return (state?.players ?? []).filter((p: Player) => p.isAlive).length;
}
