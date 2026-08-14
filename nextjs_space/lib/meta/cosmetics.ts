// ============================================
// Unlockable Cosmetics
// ============================================

export interface TokenCosmetic {
  id: string;
  name: string;
  icon: string;
  requiredLevel: number;
  description: string;
}

export interface BoardSkin {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bgClass: string;        // tailwind bg class
  borderColor: string;    // hex
  accentColor: string;    // hex
  preview: string;        // emoji preview
}

export const PLAYER_TOKENS: TokenCosmetic[] = [
  { id: 'rocket', name: 'Rocket', icon: '🚀', requiredLevel: 1, description: 'Default token' },
  { id: 'star', name: 'Star', icon: '🌟', requiredLevel: 1, description: 'Default token' },
  { id: 'gem', name: 'Diamond', icon: '💎', requiredLevel: 1, description: 'Default token' },
  { id: 'clover', name: 'Clover', icon: '🍀', requiredLevel: 1, description: 'Default token' },
  { id: 'crown', name: 'Crown', icon: '👑', requiredLevel: 3, description: 'Unlock at Level 3' },
  { id: 'fire', name: 'Fire', icon: '🔥', requiredLevel: 3, description: 'Unlock at Level 3' },
  { id: 'dragon', name: 'Dragon', icon: '🐉', requiredLevel: 5, description: 'Unlock at Level 5' },
  { id: 'unicorn', name: 'Unicorn', icon: '🦄', requiredLevel: 5, description: 'Unlock at Level 5' },
  { id: 'alien', name: 'Alien', icon: '👽', requiredLevel: 7, description: 'Unlock at Level 7' },
  { id: 'robot', name: 'Robot', icon: '🤖', requiredLevel: 7, description: 'Unlock at Level 7' },
  { id: 'ghost', name: 'Ghost', icon: '👻', requiredLevel: 9, description: 'Unlock at Level 9' },
  { id: 'skull', name: 'Skull', icon: '💀', requiredLevel: 9, description: 'Unlock at Level 9' },
  { id: 'phoenix', name: 'Phoenix', icon: '🦤', requiredLevel: 11, description: 'Unlock at Level 11' },
  { id: 'crystal', name: 'Crystal Ball', icon: '🔮', requiredLevel: 13, description: 'Unlock at Level 13' },
  { id: 'money', name: 'Money Bag', icon: '💰', requiredLevel: 15, description: 'Unlock at Level 15 (MAX)' },
];

export const BOARD_SKINS: BoardSkin[] = [
  {
    id: 'classic',
    name: 'Casino Night',
    description: 'The default dark casino theme',
    requiredLevel: 1,
    bgClass: 'bg-gray-950',
    borderColor: '#1f2937',
    accentColor: '#10b981',
    preview: '🎰',
  },
  {
    id: 'ocean',
    name: 'Ocean Depths',
    description: 'Deep sea blues and aquamarine',
    requiredLevel: 4,
    bgClass: 'bg-slate-950',
    borderColor: '#0e4d6e',
    accentColor: '#06b6d4',
    preview: '🌊',
  },
  {
    id: 'royal',
    name: 'Royal Palace',
    description: 'Regal purples and gold trim',
    requiredLevel: 6,
    bgClass: 'bg-purple-950',
    borderColor: '#581c87',
    accentColor: '#d4a017',
    preview: '👑',
  },
  {
    id: 'neon',
    name: 'Neon City',
    description: 'Cyberpunk pink and electric blue',
    requiredLevel: 8,
    bgClass: 'bg-gray-950',
    borderColor: '#9333ea',
    accentColor: '#ec4899',
    preview: '🌃',
  },
  {
    id: 'inferno',
    name: 'Inferno',
    description: 'Burning reds and molten orange',
    requiredLevel: 10,
    bgClass: 'bg-red-950',
    borderColor: '#991b1b',
    accentColor: '#f97316',
    preview: '🔥',
  },
  {
    id: 'golden',
    name: 'Golden Age',
    description: 'Luxurious gold on black',
    requiredLevel: 12,
    bgClass: 'bg-yellow-950',
    borderColor: '#713f12',
    accentColor: '#eab308',
    preview: '⭐',
  },
];

export function getAvailableTokens(level: number): TokenCosmetic[] {
  return PLAYER_TOKENS.filter((t) => t.requiredLevel <= level);
}

export function getAvailableSkins(level: number): BoardSkin[] {
  return BOARD_SKINS.filter((s) => s.requiredLevel <= level);
}
