// ============================================
// 40-Space Board — Original Lucky Tycoon Theme
// ============================================
import { BoardSpace, Property } from './types';

export const BOARD_SPACES: BoardSpace[] = [
  // Bottom row (0-10, right to left visually)
  { index: 0, name: 'GO — Collect 200', type: 'START' },
  { index: 1, name: 'Rustbucket Row', type: 'PROPERTY', group: 'brown', price: 60, baseRent: 4, rentPerTier: [4, 20, 60, 180, 320], upgradeCost: 50, color: '#8B4513' },
  { index: 2, name: 'Fate Card', type: 'EVENT' },
  { index: 3, name: 'Penny Lane', type: 'PROPERTY', group: 'brown', price: 60, baseRent: 4, rentPerTier: [4, 20, 60, 180, 320], upgradeCost: 50, color: '#8B4513' },
  { index: 4, name: 'Crown Tax', type: 'TAX', taxAmount: 200 },
  { index: 5, name: 'Silver Line Station', type: 'TRANSIT', group: 'transit', price: 200, baseRent: 25, rentPerTier: [25, 50, 100, 200, 200] },
  { index: 6, name: 'Copper Court', type: 'PROPERTY', group: 'light-blue', price: 100, baseRent: 6, rentPerTier: [6, 30, 90, 270, 400], upgradeCost: 50, color: '#87CEEB' },
  { index: 7, name: 'Lucky Space', type: 'LUCKY_SPACE' },
  { index: 8, name: 'Tinker Terrace', type: 'PROPERTY', group: 'light-blue', price: 100, baseRent: 6, rentPerTier: [6, 30, 90, 270, 400], upgradeCost: 50, color: '#87CEEB' },
  { index: 9, name: 'Jester Junction', type: 'PROPERTY', group: 'light-blue', price: 120, baseRent: 8, rentPerTier: [8, 40, 100, 300, 450], upgradeCost: 50, color: '#87CEEB' },
  { index: 10, name: 'Just Visiting', type: 'JAIL_VISIT' },
  // Left column (11-19, bottom to top)
  { index: 11, name: 'Neon Alley', type: 'PROPERTY', group: 'pink', price: 140, baseRent: 10, rentPerTier: [10, 50, 150, 450, 625], upgradeCost: 100, color: '#FF69B4' },
  { index: 12, name: 'Volt Power Co.', type: 'UTILITY', group: 'utility', price: 150, baseRent: 0, rentPerTier: [0, 0, 0, 0, 0] },
  { index: 13, name: 'Prism Path', type: 'PROPERTY', group: 'pink', price: 140, baseRent: 10, rentPerTier: [10, 50, 150, 450, 625], upgradeCost: 100, color: '#FF69B4' },
  { index: 14, name: 'Velvet Vista', type: 'PROPERTY', group: 'pink', price: 160, baseRent: 12, rentPerTier: [12, 60, 180, 500, 700], upgradeCost: 100, color: '#FF69B4' },
  { index: 15, name: 'Golden Rail Express', type: 'TRANSIT', group: 'transit', price: 200, baseRent: 25, rentPerTier: [25, 50, 100, 200, 200] },
  { index: 16, name: 'Fortune Avenue', type: 'PROPERTY', group: 'orange', price: 180, baseRent: 14, rentPerTier: [14, 70, 200, 550, 750], upgradeCost: 100, color: '#FF8C00' },
  { index: 17, name: 'Fate Card', type: 'EVENT' },
  { index: 18, name: 'Chance Crossing', type: 'PROPERTY', group: 'orange', price: 180, baseRent: 14, rentPerTier: [14, 70, 200, 550, 750], upgradeCost: 100, color: '#FF8C00' },
  { index: 19, name: 'Jackpot Drive', type: 'PROPERTY', group: 'orange', price: 200, baseRent: 16, rentPerTier: [16, 80, 220, 600, 800], upgradeCost: 100, color: '#FF8C00' },
  { index: 20, name: 'Free Parking', type: 'FREE_PARKING' },
  // Top row (21-30, left to right)
  { index: 21, name: 'Scarlet Strip', type: 'PROPERTY', group: 'red', price: 220, baseRent: 18, rentPerTier: [18, 90, 250, 700, 875], upgradeCost: 150, color: '#DC143C' },
  { index: 22, name: 'Risk Space', type: 'RISK_SPACE' },
  { index: 23, name: 'Crimson Corner', type: 'PROPERTY', group: 'red', price: 220, baseRent: 18, rentPerTier: [18, 90, 250, 700, 875], upgradeCost: 150, color: '#DC143C' },
  { index: 24, name: 'Ruby Row', type: 'PROPERTY', group: 'red', price: 240, baseRent: 20, rentPerTier: [20, 100, 300, 750, 925], upgradeCost: 150, color: '#DC143C' },
  { index: 25, name: 'Midnight Metro', type: 'TRANSIT', group: 'transit', price: 200, baseRent: 25, rentPerTier: [25, 50, 100, 200, 200] },
  { index: 26, name: 'Emerald Boulevard', type: 'PROPERTY', group: 'yellow', price: 260, baseRent: 22, rentPerTier: [22, 110, 330, 800, 975], upgradeCost: 150, color: '#FFD700' },
  { index: 27, name: 'Topaz Trail', type: 'PROPERTY', group: 'yellow', price: 260, baseRent: 22, rentPerTier: [22, 110, 330, 800, 975], upgradeCost: 150, color: '#FFD700' },
  { index: 28, name: 'Aqua Works', type: 'UTILITY', group: 'utility', price: 150, baseRent: 0, rentPerTier: [0, 0, 0, 0, 0] },
  { index: 29, name: 'Amber Avenue', type: 'PROPERTY', group: 'yellow', price: 280, baseRent: 24, rentPerTier: [24, 120, 360, 850, 1025], upgradeCost: 150, color: '#FFD700' },
  { index: 30, name: 'Go to Jail!', type: 'GO_TO_JAIL' },
  // Right column (31-39, top to bottom)
  { index: 31, name: 'Sapphire Street', type: 'PROPERTY', group: 'green', price: 300, baseRent: 26, rentPerTier: [26, 130, 390, 900, 1100], upgradeCost: 200, color: '#2E8B57' },
  { index: 32, name: 'Jade Gardens', type: 'PROPERTY', group: 'green', price: 300, baseRent: 26, rentPerTier: [26, 130, 390, 900, 1100], upgradeCost: 200, color: '#2E8B57' },
  { index: 33, name: 'Fate Card', type: 'EVENT' },
  { index: 34, name: 'Clover Creek', type: 'PROPERTY', group: 'green', price: 320, baseRent: 28, rentPerTier: [28, 150, 450, 1000, 1200], upgradeCost: 200, color: '#2E8B57' },
  { index: 35, name: 'Diamond Express', type: 'TRANSIT', group: 'transit', price: 200, baseRent: 25, rentPerTier: [25, 50, 100, 200, 200] },
  { index: 36, name: 'Fate Card', type: 'EVENT' },
  { index: 37, name: 'Crown Plaza', type: 'PROPERTY', group: 'navy', price: 350, baseRent: 35, rentPerTier: [35, 175, 500, 1100, 1400], upgradeCost: 200, color: '#191970' },
  { index: 38, name: 'Luxury Tax', type: 'TAX', taxAmount: 100 },
  { index: 39, name: 'Diamond Heights', type: 'PROPERTY', group: 'navy', price: 400, baseRent: 50, rentPerTier: [50, 200, 600, 1400, 1700], upgradeCost: 200, color: '#191970' },
];

export function createInitialProperties(): Property[] {
  return BOARD_SPACES.filter((s: BoardSpace) => s.type === 'PROPERTY' || s.type === 'TRANSIT' || s.type === 'UTILITY')
    .map((s: BoardSpace) => ({
      spaceIndex: s.index,
      ownerId: null,
      tier: 0,
    }));
}

export function getPropertyGroup(group: string): number[] {
  return BOARD_SPACES
    .filter((s: BoardSpace) => s.group === group && s.type === 'PROPERTY')
    .map((s: BoardSpace) => s.index);
}

export const PROPERTY_GROUPS: Record<string, number[]> = {
  brown: getPropertyGroup('brown'),
  'light-blue': getPropertyGroup('light-blue'),
  pink: getPropertyGroup('pink'),
  orange: getPropertyGroup('orange'),
  red: getPropertyGroup('red'),
  yellow: getPropertyGroup('yellow'),
  green: getPropertyGroup('green'),
  navy: getPropertyGroup('navy'),
};

export const GROUP_COLORS: Record<string, string> = {
  brown: '#8B4513',
  'light-blue': '#87CEEB',
  pink: '#FF69B4',
  orange: '#FF8C00',
  red: '#DC143C',
  yellow: '#FFD700',
  green: '#2E8B57',
  navy: '#191970',
  transit: '#666666',
  utility: '#999999',
};
