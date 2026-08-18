// ============================================
// Lucky Tycoon — Game Engine Types
// ============================================

export type GamePhase =
  | 'LOBBY'
  | 'ROLL_DICE'
  | 'MOVING'
  | 'RESOLVE_SPACE'
  | 'PLAYER_ACTION'
  | 'CHARM_SHOP'
  | 'TRADING'
  | 'BANKRUPTCY'
  | 'RISK_CHOICE'
  | 'EVENT_RESOLUTION'
  | 'GAME_OVER';

export const CHARM_SHOP_UNLOCK_ROUND = 5;

export type SpaceType =
  | 'PROPERTY'
  | 'START'
  | 'TAX'
  | 'JAIL_VISIT'
  | 'GO_TO_JAIL'
  | 'LUCKY_SPACE'
  | 'RISK_SPACE'
  | 'TRANSIT'
  | 'UTILITY'
  | 'EVENT'
  | 'FREE_PARKING';

export type PropertyGroup =
  | 'brown' | 'light-blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'navy'
  | 'transit' | 'utility';

export type UpgradeTier = 0 | 1 | 2 | 3 | 4 | 5;
// 0=Vacant, 1=Shop, 2=Business, 3=Complex, 4=Empire, 5=unused

export const TIER_NAMES: Record<number, string> = {
  0: 'Vacant',
  1: 'Shop',
  2: 'Business',
  3: 'Complex',
  4: 'Empire',
};

export type CharmRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Cursed';

export type CharmTrigger =
  | 'PASSIVE'
  | 'ON_TURN_START'
  | 'ON_TURN_END'
  | 'ON_DICE_ROLL'
  | 'ON_PLAYER_MOVE'
  | 'ON_PASS_START'
  | 'ON_LAND_PROPERTY'
  | 'ON_PAY_RENT'
  | 'ON_RECEIVE_RENT'
  | 'ON_BUY_PROPERTY'
  | 'ON_SELL_PROPERTY'
  | 'ON_MORTGAGE_PROPERTY'
  | 'ON_UPGRADE_PROPERTY'
  | 'ON_TRADE'
  | 'ON_TAX'
  | 'ON_BANKRUPTCY'
  | 'ON_EVENT'
  | 'ON_ROUND_END'
  | 'ACTIVE';

export interface CharmDefinition {
  id: string;
  name: string;
  rarity: CharmRarity;
  description: string;
  icon: string; // emoji
  trigger: CharmTrigger;
  stackable: boolean;
  cost: number;
  sellValue: number;
  upgradeable?: boolean;
  maxLevel?: number;        // default 1 (no upgrade); 2 or 3 for upgradeable
  upgradeDescriptions?: string[]; // descriptions per level [lvl2, lvl3]
  evolutionTurns?: number;  // completed turns held per automatic level
  synergyTags?: string[];   // tags for synergy matching
}

export interface SynergyDefinition {
  id: string;
  name: string;
  requiredCharmIds: string[];
  description: string;
  icon: string;
}

export interface OwnedCharm {
  instanceId: string;
  definitionId: string;
  activatedThisTurn: boolean;
  level: number;            // starts at 1
  turnsHeld?: number;       // completed turns held toward the next evolution
  usesRemaining?: number;   // for limited-use charms
}

export interface BoardSpace {
  index: number;
  name: string;
  type: SpaceType;
  group?: PropertyGroup;
  price?: number;
  baseRent?: number;
  rentPerTier?: number[];
  upgradeCost?: number;
  taxAmount?: number;
  color?: string; // hex for display
}

export interface Property {
  spaceIndex: number;
  ownerId: string | null;
  tier: number; // 0-4
  mortgaged?: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  icon: string;
  money: number;
  position: number;
  charms: OwnedCharm[];
  activeSynergies: string[];
  isAlive: boolean;
  turnsInJail: number;
  jailFreeCharms: number;
  doublesCount: number;
  passedStartThisTurn: boolean;
  previousPosition?: number;
  activeDiceBonus?: number;
  activeRentShield?: boolean;
  isAI?: boolean;
  aiPersonality?: AIPersonality;
}

export interface GameEventEntry {
  id: string;
  type: string;
  message: string;
  emoji: string;
  playerId?: string;
  timestamp: number;
  highlight?: boolean;
}

export interface RandomEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition?: EventCondition;
  effect?: EventEffect;
}

export type EventCondition =
  | { type: 'PLAYER_OWNS_PROPERTIES'; minimum: number }
  | { type: 'PLAYER_OWNS_FULL_GROUP' }
  | { type: 'PLAYER_HAS_CHARMS'; minimum: number };

export interface EventEffect {
  type: 'MONEY_DELTA';
  amount: number;
  successMessage: string;
}

export interface TradeOffer {
  fromPlayerId: string;
  toPlayerId: string;
  giveMoney: number;
  giveProperties: number[];
  giveCharms: string[];
  receiveMoney: number;
  receiveProperties: number[];
  receiveCharms: string[];
  status: 'pending' | 'accepted' | 'rejected';
  counterCount?: number;
}

export interface CharmShopState {
  offers: CharmDefinition[];
  rerollsLeft: number;
  lockedCharmId?: string | null;  // locked item persists across rerolls
}

export interface RiskChoice {
  safeReward: number;
  gambleReward: number;
  gambleChance: number; // 0-1
}

export type GameMode = 'classic' | 'quick' | 'hardcore' | 'custom';
export type AIPersonality = 'cautious' | 'aggressive' | 'random';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIPlayerConfig {
  enabled: boolean;
  personality: AIPersonality;
}

export interface GameConfig {
  mode: GameMode;
  maxRounds: number;
  startingMoney: number;
  passStartBonus: number;
  charmShopInterval: number;
  charmShopSize: number;
  maxCharmSlots: number;
  charmPermadeath: boolean;        // hardcore: charms destroyed on bankruptcy
  acceleratedEconomy: boolean;     // quick: higher rents & income
  eventFrequency: number;          // turns between random events (default 6)
  charmRarityWeights?: Record<string, number>; // custom rarity weights
  aiDifficulty: AIDifficulty;
}

export interface GameState {
  config: GameConfig;
  phase: GamePhase;
  players: Player[];
  properties: Property[];
  currentPlayerIndex: number;
  round: number;
  turnCount: number;
  diceResult: [number, number] | null;
  eventLog: GameEventEntry[];
  activeEvent: RandomEvent | null;
  tradeOffer: TradeOffer | null;
  charmShop: CharmShopState | null;
  charmShopBonus?: { size: number; rerolls: number } | null;
  shopOpenedThisTurn?: boolean;
  tradeProposedThisTurn?: boolean;
  shopReturnPhase?: GamePhase;
  bankruptcyDebt?: number;
  bankruptcyCreditorId?: string | null;
  riskChoice: RiskChoice | null;
  winner: string | null;
  seed: number;
  rngState: number;
  turnsSinceLastShop: number;
  turnsSinceLastEvent: number;
  usedEventIds: string[];
}

// ============================================
// Actions
// ============================================

export type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'UPGRADE_PROPERTY'; spaceIndex: number }
  | { type: 'MORTGAGE_PROPERTY'; spaceIndex: number }
  | { type: 'UNMORTGAGE_PROPERTY'; spaceIndex: number }
  | { type: 'SELL_UPGRADE'; spaceIndex: number }
  | { type: 'END_TURN' }
  | { type: 'PROPOSE_TRADE'; offer: Omit<TradeOffer, 'status'> }
  | { type: 'COUNTER_TRADE'; offer: Omit<TradeOffer, 'status' | 'counterCount'> }
  | { type: 'RESPOND_TRADE'; accept: boolean }
  | { type: 'BUY_CHARM'; charmId: string }
  | { type: 'SELL_CHARM'; instanceId: string }
  | { type: 'UPGRADE_CHARM'; instanceId: string }
  | { type: 'REROLL_SHOP' }
  | { type: 'CLOSE_SHOP' }
  | { type: 'OPEN_SHOP' }
  | { type: 'LOCK_SHOP_ITEM'; charmId: string }
  | { type: 'ACTIVATE_CHARM'; instanceId: string }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'RESOLVE_EVENT' }
  | { type: 'RISK_CHOOSE'; safe: boolean }
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'START_TRADE' }
  | { type: 'CANCEL_TRADE' }
  | { type: 'CHECK_VICTORY' };
