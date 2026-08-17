import { BOARD_SPACES } from './board-data';
import { getCharmDef } from './charms-data';
import { GameAction, GameState, Player, Property } from './types';
import { calculateNetWorth, playerOwnsFullGroup } from './reducer-utils';

function currentPlayer(state: GameState): Player | undefined {
  return state.players?.[state.currentPlayerIndex];
}

function difficulty(state: GameState): 'easy' | 'medium' | 'hard' {
  return state.config.aiDifficulty ?? 'medium';
}

function propertyValue(state: GameState, player: Player, index: number): number {
  const space = BOARD_SPACES[index];
  if (!space) return 0;
  const ownedInGroup = state.properties.filter((property) => property.ownerId === player.id && property.spaceIndex !== index)
    .filter((property) => BOARD_SPACES[property.spaceIndex]?.group === space.group).length;
  const groupSize = state.properties.filter((property) => BOARD_SPACES[property.spaceIndex]?.group === space.group).length;
  const baseRent = space.rentPerTier?.[0] ?? space.baseRent ?? 0;
  const eventRentMultiplier = state.activeEvent?.id === 'property-boom'
    ? 2
    : state.activeEvent?.id === 'market-crash' ? 0.5 : 1;
  const completesGroup = ownedInGroup + 1 >= groupSize && groupSize > 1;
  const setBonus = completesGroup ? baseRent : 0;
  const completionPriority = completesGroup ? 300 : ownedInGroup > 0 ? 80 : 0;
  return (space.price ?? 0) + baseRent * 8 * eventRentMultiplier + setBonus * 12 * eventRentMultiplier + ownedInGroup * 40 + completionPriority;
}

function charmValue(state: GameState, player: Player, charmId: string): number {
  const charm = getCharmDef(charmId);
  if (!charm) return 0;
  const rarityValue: Record<string, number> = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 6, Cursed: -2 };
  const synergyBonus = (charm.synergyTags ?? []).some((tag) => player.charms.some((owned) => getCharmDef(owned.definitionId)?.synergyTags?.includes(tag))) ? 120 : 0;
  return rarityValue[charm.rarity] * 100 + synergyBonus - charm.cost * 0.2;
}

function offerValue(state: GameState, player: Player, money: number, properties: number[], charms: string[]): number {
  return money + properties.reduce((sum, index) => sum + propertyValue(state, player, index), 0) + charms.reduce((sum, id) => sum + charmValue(state, player, id), 0);
}

function proposeTrade(state: GameState, player: Player): GameAction | null {
  const opponents = state.players.filter((candidate) => candidate.isAlive && candidate.id !== player.id);
  const candidates = opponents.flatMap((target) => state.properties
    .filter((property) => property.ownerId === target.id)
    .map((property) => ({ target, property })));
  const requested = candidates.sort((a, b) => {
    const score = (candidate: { target: Player; property: Property }) => {
      const space = BOARD_SPACES[candidate.property.spaceIndex];
      const groupSize = state.properties.filter((property) => BOARD_SPACES[property.spaceIndex]?.group === space?.group).length;
      const ownedInGroup = state.properties.filter((property) => property.ownerId === player.id && BOARD_SPACES[property.spaceIndex]?.group === space?.group).length;
      const completesGroup = ownedInGroup + 1 >= groupSize && groupSize > 1;
      const targetLoss = propertyValue(state, candidate.target, candidate.property.spaceIndex);
      return propertyValue(state, player, candidate.property.spaceIndex) + (completesGroup ? 500 : 0) - targetLoss * 0.15;
    };
    return score(b) - score(a);
  })[0];
  if (!requested) return null;

  const requestedValue = propertyValue(state, player, requested.property.spaceIndex);
  const reserve = difficulty(state) === 'hard' ? 300 : difficulty(state) === 'medium' ? 200 : 100;
  const cashOffer = Math.min(Math.max(0, player.money - reserve), Math.max(50, Math.floor(requestedValue * 0.65)));
  const giveProperties: number[] = [];
  const giveCharms: string[] = [];
  let offeredValue = cashOffer;

  const groupProgress = (index: number) => {
    const group = BOARD_SPACES[index]?.group;
    return state.properties.filter((property) => property.ownerId === player.id && BOARD_SPACES[property.spaceIndex]?.group === group).length;
  };
  const surplusProperty = state.properties
    .filter((property) => property.ownerId === player.id)
    .filter((property) => {
      const space = BOARD_SPACES[property.spaceIndex];
      const groupSize = state.properties.filter((candidate) => BOARD_SPACES[candidate.spaceIndex]?.group === space?.group).length;
      return groupProgress(property.spaceIndex) < groupSize - 1;
    })
    .sort((a, b) => propertyValue(state, player, a.spaceIndex) - propertyValue(state, player, b.spaceIndex))[0];
  if (surplusProperty && offeredValue < requestedValue * 0.8) {
    giveProperties.push(surplusProperty.spaceIndex);
    offeredValue += propertyValue(state, requested.target, surplusProperty.spaceIndex);
  }

  const surplusCharm = [...player.charms]
    .filter((charm) => getCharmDef(charm.definitionId)?.rarity !== 'Legendary')
    .sort((a, b) => charmValue(state, player, a.definitionId) - charmValue(state, player, b.definitionId))[0];
  if (surplusCharm && offeredValue < requestedValue * 0.8) {
    giveCharms.push(surplusCharm.instanceId);
  }

  if (cashOffer <= 0 && giveProperties.length === 0 && giveCharms.length === 0) return null;

  return {
    type: 'PROPOSE_TRADE',
    offer: {
      fromPlayerId: player.id,
      toPlayerId: requested.target.id,
      giveMoney: cashOffer,
      giveProperties,
      giveCharms,
      receiveMoney: 0,
      receiveProperties: [requested.property.spaceIndex],
      receiveCharms: [],
    },
  };
}

function counterTrade(state: GameState, recipient: Player): GameAction | null {
  const offer = state.tradeOffer;
  if (!offer || offer.status !== 'pending') return null;
  const proposer = state.players.find((player) => player.id === offer.fromPlayerId);
  if (!proposer) return null;

  const requestedValue = offerValue(state, recipient, offer.receiveMoney ?? 0, offer.receiveProperties ?? [], offer.receiveCharms ?? []);
  const minimumCash = Math.max(offer.giveMoney ?? 0, Math.ceil(requestedValue * 0.9));
  const counterMoney = Math.min(proposer.money, minimumCash);
  if (counterMoney < minimumCash && (offer.giveProperties ?? []).length === 0 && (offer.giveCharms ?? []).length === 0) return null;

  return {
    type: 'COUNTER_TRADE',
    offer: {
      fromPlayerId: recipient.id,
      toPlayerId: proposer.id,
      giveMoney: 0,
      giveProperties: offer.receiveProperties ?? [],
      giveCharms: offer.receiveCharms ?? [],
      receiveMoney: counterMoney,
      receiveProperties: offer.giveProperties ?? [],
      receiveCharms: offer.giveCharms ?? [],
    },
  };
}

function shouldBuy(state: GameState, player: Player, price: number, index: number): boolean {
  const effectivePrice = state.activeEvent?.id === 'golden-hour'
    ? 0
    : state.activeEvent?.id === 'fire-sale' ? Math.floor(price * 0.5) : price;
  if (effectivePrice > player.money) return false;
  const personality = player.aiPersonality ?? 'cautious';
  const level = difficulty(state);
  const value = propertyValue(state, player, index);
  if (level === 'easy' && state.rngState % 4 === 0) return false;
  if (personality === 'aggressive') return value >= price * (level === 'hard' ? 0.9 : 0.7);
  if (personality === 'random') return level === 'hard' ? (state.rngState % 5) !== 0 : (state.rngState % 3) !== 0;
  const reserve = level === 'hard' ? 500 : level === 'easy' ? 150 : 350;
  return value >= effectivePrice && (player.money - effectivePrice >= reserve || effectivePrice <= 120);
}

function chooseCharm(state: GameState, player: Player): string | null {
  const shop = state.charmShop;
  if (!shop) return null;
  const available = shop.offers.filter((charm) => {
    const alreadyOwned = !charm.stackable && player.charms.some((owned) => owned.definitionId === charm.id);
    const hasSynergy = (charm.synergyTags ?? []).some((tag) => player.charms.some((owned) => getCharmDef(owned.definitionId)?.synergyTags?.includes(tag)));
    const reserve = difficulty(state) === 'hard' ? 350 : difficulty(state) === 'medium' ? 200 : 100;
    const canPreserveReserve = player.aiPersonality !== 'cautious' || hasSynergy || player.money - charm.cost >= reserve;
    return !alreadyOwned && charm.cost <= player.money && canPreserveReserve;
  });
  if (available.length === 0) return null;

  if (player.aiPersonality === 'random') {
    return available[state.rngState % available.length]?.id ?? null;
  }

  const sorted = [...available].sort((a, b) => {
    if (difficulty(state) === 'easy') return a.cost - b.cost;
    return charmValue(state, player, b.id) - charmValue(state, player, a.id);
  });
  return sorted[0]?.id ?? null;
}

export function chooseAIAction(state: GameState): GameAction | null {
  const pendingOffer = state.tradeOffer;
  const recipient = pendingOffer
    ? state.players.find((candidate) => candidate.id === pendingOffer.toPlayerId)
    : undefined;
  if (pendingOffer?.status === 'pending' && recipient?.isAI) {
    const offered = offerValue(state, recipient, pendingOffer.giveMoney ?? 0, pendingOffer.giveProperties ?? [], pendingOffer.giveCharms ?? []);
    const requested = offerValue(state, recipient, pendingOffer.receiveMoney ?? 0, pendingOffer.receiveProperties ?? [], pendingOffer.receiveCharms ?? []);
    const multiplier = recipient.aiPersonality === 'cautious' ? 1.1 : recipient.aiPersonality === 'aggressive' ? 0.75 : (state.rngState % 2 ? 0.8 : 1.2);
    if (offered >= requested * multiplier) return { type: 'RESPOND_TRADE', accept: true };
    if ((pendingOffer.counterCount ?? 0) < 2) return counterTrade(state, recipient) ?? { type: 'RESPOND_TRADE', accept: false };
    return { type: 'RESPOND_TRADE', accept: false };
  }
  if (pendingOffer?.status === 'pending') return null;

  const player = currentPlayer(state);
  if (!player?.isAI || !player.isAlive) return null;

  if (state.phase === 'ROLL_DICE') return { type: 'ROLL_DICE' };
  if (state.phase === 'EVENT_RESOLUTION') return { type: 'RESOLVE_EVENT' };
  if (state.phase === 'RISK_CHOICE') {
    const risk = state.riskChoice;
    const gambleExpectedValue = risk ? risk.gambleReward * risk.gambleChance : 0;
    const gamble = difficulty(state) === 'easy'
      ? player.aiPersonality === 'aggressive' && state.rngState % 3 === 0
      : player.aiPersonality === 'aggressive' ||
        (player.aiPersonality === 'random' && state.rngState % 2 === 0) ||
        (difficulty(state) === 'hard' && gambleExpectedValue > (risk?.safeReward ?? Infinity));
    return { type: 'RISK_CHOOSE', safe: !gamble };
  }
  if (state.phase === 'BANKRUPTCY') {
    if ((player.money ?? 0) >= (state.bankruptcyDebt ?? 0)) return { type: 'END_TURN' };
    const upgraded = state.properties.find((property) => property.ownerId === player.id && property.tier > 0);
    if (upgraded) return { type: 'SELL_UPGRADE', spaceIndex: upgraded.spaceIndex };
    const property = state.properties.find((candidate) => candidate.ownerId === player.id && !candidate.mortgaged && candidate.tier === 0);
    if (property) return { type: 'MORTGAGE_PROPERTY', spaceIndex: property.spaceIndex };
    const charm = player.charms[0];
    if (charm) return { type: 'SELL_CHARM', instanceId: charm.instanceId };
    return { type: 'DECLARE_BANKRUPTCY' };
  }
  if (state.phase === 'CHARM_SHOP') {
    const charmId = chooseCharm(state, player);
    return charmId ? { type: 'BUY_CHARM', charmId } : { type: 'CLOSE_SHOP' };
  }
  if (state.phase === 'RESOLVE_SPACE') {
    const space = BOARD_SPACES[player.position];
    const property = state.properties.find((candidate: Property) => candidate.spaceIndex === player.position);
    if (space?.price != null && property?.ownerId === null && shouldBuy(state, player, space.price, player.position)) {
      return { type: 'BUY_PROPERTY' };
    }
    return { type: 'END_TURN' };
  }
  if (state.phase === 'PLAYER_ACTION') {
    const usableActive = player.charms.find((charm) => (charm.usesRemaining ?? 1) > 0 &&
      ((charm.definitionId === 'fortune-flare' && player.money < 300) ||
       (charm.definitionId === 'rent-shield' && player.money < 500) ||
       (charm.definitionId === 'lucky-dash' && difficulty(state) === 'hard') ||
       charm.definitionId === 'time-traveller'));
    if (usableActive?.definitionId === 'fortune-flare' || usableActive?.definitionId === 'rent-shield' || usableActive?.definitionId === 'lucky-dash') {
      return { type: 'ACTIVATE_CHARM', instanceId: usableActive.instanceId };
    }
    if (usableActive?.definitionId === 'time-traveller' && player.previousPosition != null &&
      (difficulty(state) === 'hard' || player.aiPersonality === 'aggressive') && state.rngState % 5 === 0) {
      return { type: 'ACTIVATE_CHARM', instanceId: usableActive.instanceId };
    }

    const shouldConsiderTrade = difficulty(state) === 'hard'
      ? state.rngState % 2 === 0
      : difficulty(state) === 'medium'
        ? state.rngState % 3 === 0
        : player.aiPersonality === 'aggressive' && state.rngState % 3 === 0;
    if (!state.tradeProposedThisTurn && shouldConsiderTrade) {
      const trade = proposeTrade(state, player);
      if (trade) return trade;
    }

    const upgrades = state.properties.filter((property: Property) => {
      const space = BOARD_SPACES[property.spaceIndex];
      return property.ownerId === player.id && space?.type === 'PROPERTY' && property.tier < 4 &&
        playerOwnsFullGroup(state, player.id, space.group ?? '') && (space.upgradeCost ?? Infinity) <= player.money;
    });
    const upgrade = upgrades.sort((a, b) => {
      const aSpace = BOARD_SPACES[a.spaceIndex];
      const bSpace = BOARD_SPACES[b.spaceIndex];
      const aReturn = ((aSpace?.rentPerTier?.[a.tier + 1] ?? 0) - (aSpace?.rentPerTier?.[a.tier] ?? 0)) / (aSpace?.upgradeCost ?? 1);
      const bReturn = ((bSpace?.rentPerTier?.[b.tier + 1] ?? 0) - (bSpace?.rentPerTier?.[b.tier] ?? 0)) / (bSpace?.upgradeCost ?? 1);
      return bReturn - aReturn;
    })[0];
    if (upgrade && !(difficulty(state) === 'easy' && state.rngState % 3 === 0)) {
      return { type: 'UPGRADE_PROPERTY', spaceIndex: upgrade.spaceIndex };
    }

    const charmSlots = state.config.maxCharmSlots;
    const shopReserve = difficulty(state) === 'hard' ? 100 : difficulty(state) === 'medium' ? 200 : 300;
    if ((state.round ?? 1) >= 5 && !state.charmShop && !state.shopOpenedThisTurn && player.charms.length < charmSlots && player.money >= shopReserve) return { type: 'OPEN_SHOP' };
    return { type: 'END_TURN' };
  }
  return null;
}

export function aiSummary(state: GameState, player: Player): string {
  return `${player.name} (${player.aiPersonality ?? 'cautious'} AI) • Net worth ${calculateNetWorth(state, player).toLocaleString('en-US')}`;
}
