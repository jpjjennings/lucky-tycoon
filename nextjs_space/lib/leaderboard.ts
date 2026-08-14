// ============================================
// Local Leaderboard — localStorage persistence
// ============================================
import { GameMode } from './engine/types';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  netWorth: number;
  rounds: number;
  mode: GameMode;
  playerCount: number;
  date: string; // ISO string
}

const STORAGE_KEY = 'lucky-tycoon-leaderboard';
const MAX_ENTRIES = 50;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function getLeaderboardByMode(mode: GameMode): LeaderboardEntry[] {
  return getLeaderboard().filter((e) => e.mode === mode);
}

export function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'date'>): LeaderboardEntry {
  const entries = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
  };
  entries.push(newEntry);
  // Sort by net worth descending, keep top MAX_ENTRIES
  entries.sort((a, b) => b.netWorth - a.netWorth);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
  return newEntry;
}

export function clearLeaderboard(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getModeLabel(mode: GameMode): string {
  switch (mode) {
    case 'quick': return 'Quick Match';
    case 'hardcore': return 'Hardcore';
    case 'custom': return 'Custom';
    default: return 'Classic';
  }
}

export function getModeIcon(mode: GameMode): string {
  switch (mode) {
    case 'quick': return '⚡';
    case 'hardcore': return '💀';
    case 'custom': return '⚙️';
    default: return '🏆';
  }
}

export function getModeColor(mode: GameMode): string {
  switch (mode) {
    case 'quick': return '#f59e0b';
    case 'hardcore': return '#ef4444';
    case 'custom': return '#a855f7';
    default: return '#10b981';
  }
}
