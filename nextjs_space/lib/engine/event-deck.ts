// ============================================
// Random Events
// ============================================
import { RandomEvent } from './types';

export const EVENT_DECK: RandomEvent[] = [
  {
    id: 'market-crash',
    name: 'Market Crash',
    description: 'All rents are halved for the next round!',
    icon: '📉',
  },
  {
    id: 'bank-error',
    name: 'Bank Error in Your Favor',
    description: 'Every player receives 150 coins from the bank!',
    icon: '🏦',
  },
  {
    id: 'hostile-takeover',
    name: 'Hostile Takeover',
    description: 'The richest player loses a random property (returned to bank)!',
    icon: '🦈',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Your next property purchase is FREE!',
    icon: '🌅',
  },
  {
    id: 'chaos-tax',
    name: 'Chaos Tax',
    description: 'Every player pays a random tax between 50-200 coins!',
    icon: '🌀',
  },
  {
    id: 'fire-sale',
    name: 'Fire Sale',
    description: 'All properties cost 50% less this round!',
    icon: '🔥',
  },
  {
    id: 'property-boom',
    name: 'Property Boom',
    description: 'All rents are DOUBLED for the next round!',
    icon: '📈',
  },
  {
    id: 'charity-ball',
    name: 'Charity Ball',
    description: 'The richest player gives 100 coins to the poorest!',
    icon: '🎭',
  },
  {
    id: 'lucky-windfall',
    name: 'Lucky Windfall',
    description: 'The current player finds 200 coins in an old vault!',
    icon: '💰',
  },
  {
    id: 'cursed-ground',
    name: 'Cursed Ground',
    description: 'All upgrades cost 50% more this round!',
    icon: '☠️',
  },
  {
    id: 'housing-crisis',
    name: 'Housing Crisis',
    description: 'All properties with Shop tier or higher lose one upgrade level!',
    icon: '🏚️',
  },
  {
    id: 'charm-surge',
    name: 'Charm Surge',
    description: 'The Charm Shop immediately opens with 6 items and 2 rerolls!',
    icon: '✨',
  },
  {
    id: 'tax-holiday',
    name: 'Tax Holiday',
    description: 'No taxes are collected this round — Tax and Income Tax spaces are free!',
    icon: '🎉',
  },
  {
    id: 'earthquake',
    name: 'Earthquake',
    description: 'A random property from each player is damaged — downgraded by one tier!',
    icon: '🌋',
  },
];
