// ============================================
// Charm Effect Handlers — Sprint 2 Expanded
// ============================================
import { GameState, Player, OwnedCharm, Property } from './types';
import { getCharmDef, SYNERGIES } from './charms-data';
import { addLogEntry, playerOwnsFullGroup, getProperty } from './reducer-utils';
import { BOARD_SPACES } from './board-data';
import { randomInt } from './rng';

export interface CharmModifiers {
  rentMultiplier: number;
  rentReduction: number;
  diceBonus: number;
  taxMultiplier: number;
  purchaseDiscount: number;
  passStartBonus: number;
  turnIncome: number;
  blockRent: boolean;
  freePurchase: boolean;
  bankruptcySave: boolean;
  rentRebatePercent: number;       // % of rent paid returned from bank
  landlordGrinBonus: number;       // flat bonus on receiving rent
  mortgageBonus: number;            // % extra cash from mortgages
  upgradeDiscount: number;         // % discount on upgrades
  cheapPropertyRentMult: number;   // multiplier for properties ≤120c
  doubleDownActive: boolean;       // doubles all financial events
  cantSellProperties: boolean;     // golden handcuffs
  debtCollectorPayMult: number;    // extra multiplier on rent YOU pay
  parasiteEstatePercent: number;   // % of all rent flowing to you
  extraCharmSlots: number;         // from charm-amplifier
  luckyCharmAmplifier: number;     // % bonus from lucky-charm (stacks)
  firstPurchaseDiscount: number;   // golden touch: first buy per round
  crownJewelActive: boolean;       // 5x rent on most expensive prop
  loadedPocketReroll: boolean;     // reroll one die
  houseOfCardsDiscount: number;    // upgrade discount from house of cards
  rubberBaronActive: boolean;      // gain from opponent spending
}

export function getDefaultModifiers(): CharmModifiers {
  return {
    rentMultiplier: 1,
    rentReduction: 0,
    diceBonus: 0,
    taxMultiplier: 1,
    purchaseDiscount: 0,
    passStartBonus: 0,
    turnIncome: 0,
    blockRent: false,
    freePurchase: false,
    bankruptcySave: false,
    rentRebatePercent: 0,
    landlordGrinBonus: 0,
    mortgageBonus: 0,
    upgradeDiscount: 0,
    cheapPropertyRentMult: 1,
    doubleDownActive: false,
    cantSellProperties: false,
    debtCollectorPayMult: 1,
    parasiteEstatePercent: 0,
    extraCharmSlots: 0,
    luckyCharmAmplifier: 0,
    firstPurchaseDiscount: 0,
    crownJewelActive: false,
    loadedPocketReroll: false,
    houseOfCardsDiscount: 0,
    rubberBaronActive: false,
  };
}

/** Helper: get effective level (1-based) considering lucky-charm amplification */
function effectiveLevel(charm: OwnedCharm): number {
  return charm.level ?? 1;
}

export function computeModifiers(
  player: Player,
  state: GameState,
  trigger: string
): CharmModifiers {
  const mods = getDefaultModifiers();
  const charms = player?.charms ?? [];
  const activeSynergies = player?.activeSynergies ?? [];

  // Pre-check: does player have Lucky Charm (meta amplifier)?
  const hasLuckyCharm = charms.some((c: OwnedCharm) => c.definitionId === 'lucky-charm');
  const amp = hasLuckyCharm ? 1.1 : 1.0;
  const hasLuckyAmplifierSyn = activeSynergies.includes('lucky-amplifier');
  const totalAmp = hasLuckyAmplifierSyn ? amp * 1.15 : amp; // 25% from synergy stacks
  mods.luckyCharmAmplifier = totalAmp;

  for (const charm of charms) {
    const def = getCharmDef(charm?.definitionId ?? '');
    if (!def) continue;
    const lvl = effectiveLevel(charm);

    switch (def.id) {
      // ---- COMMON ----
      case 'penny-pincher':
        mods.rentReduction += 0.15 * totalAmp;
        break;
      case 'swift-feet':
        mods.diceBonus += 1;
        break;
      case 'toll-booth':
        mods.rentMultiplier *= 1 + 0.1 * totalAmp;
        break;
      case 'lucky-penny': {
        const base = lvl === 1 ? 25 : lvl === 2 ? 40 : 60;
        mods.turnIncome += Math.floor(base * totalAmp);
        break;
      }
      case 'bargain-hunter':
        mods.purchaseDiscount = Math.max(mods.purchaseDiscount, 0.1 * totalAmp);
        break;
      case 'rent-rebate':
        mods.rentRebatePercent += 0.15 * totalAmp;
        break;
      case 'landlords-grin':
        mods.landlordGrinBonus += Math.floor(20 * totalAmp);
        break;
      case 'the-accountant':
        // handled in applyAccountant (round-end)
        break;
      case 'lucky-seven':
        // handled in dice roll
        break;
      case 'loaded-pocket':
        mods.loadedPocketReroll = true;
        break;

      // ---- UNCOMMON ----
      case 'shield-charm':
        if (trigger === 'ON_PAY_RENT' && !charm.activatedThisTurn && (charm.usesRemaining ?? 1) > 0) {
          mods.blockRent = true;
        }
        break;
      case 'tax-haven':
        mods.taxMultiplier *= 0.5;
        break;
      case 'golden-passport': {
        const base = lvl === 1 ? 50 : lvl === 2 ? 75 : 100;
        mods.passStartBonus += Math.floor(base * totalAmp);
        break;
      }
      case 'snake-eyes':
        // handled in dice roll
        break;
      case 'golden-boot':
        mods.diceBonus += 2;
        break;
      case 'tax-evasion':
        // first tax per round halved — handled in reducer tax logic
        mods.taxMultiplier *= 0.5; // simple approach
        break;
      case 'property-flipper':
        mods.mortgageBonus += 0.25 * totalAmp;
        break;
      case 'bank-error-charm':
        // handled at turn start in reducer
        break;
      case 'bad-investment':
        mods.cheapPropertyRentMult = 3 * totalAmp;
        break;
      case 'parasite':
        // handled when another player completes a group
        break;

      // ---- RARE ----
      case 'property-magnet':
        mods.purchaseDiscount = Math.max(mods.purchaseDiscount, 0.25 * totalAmp);
        break;
      case 'double-or-nothing':
        // handled in dice roll
        break;
      case 'loaded-dice':
        // handled in dice roll (every N-th roll)
        break;
      case 'monopoly-monopoly':
        // handled in rent calculation
        break;
      case 'double-down':
        mods.doubleDownActive = true;
        break;
      case 'phantom-deed':
        // handled in playerOwnsFullGroup override
        break;
      case 'colour-shift':
        // handled in playerOwnsFullGroup override
        break;
      case 'upgrade-discount':
        mods.upgradeDiscount += 0.3 * totalAmp;
        break;
      case 'rent-freeze-charm':
        mods.rentReduction += 0.5 * totalAmp; // first rent halved — simplified as general reduction
        break;
      case 'lucky-charm':
        // already handled via totalAmp above
        break;

      // ---- EPIC ----
      case 'rent-lord': {
        const mult = lvl === 1 ? 2 : lvl === 2 ? 3 : 4;
        mods.rentMultiplier *= mult;
        break;
      }
      case 'second-chance':
        if (trigger === 'ON_BANKRUPTCY') mods.bankruptcySave = true;
        break;
      case 'the-parasite-estate':
        mods.parasiteEstatePercent += 0.05 * totalAmp;
        break;
      case 'time-traveller':
        // active charm — handled via ACTIVATE_CHARM
        break;
      case 'set-thief':
        // handled in rent calculation
        break;
      case 'bankruptcy-clause':
        if (trigger === 'ON_BANKRUPTCY') mods.bankruptcySave = true;
        break;
      case 'charm-amplifier':
        mods.extraCharmSlots += 1;
        break;
      case 'golden-touch':
        mods.firstPurchaseDiscount = Math.max(mods.firstPurchaseDiscount, 0.5 * totalAmp);
        break;

      // ---- LEGENDARY ----
      case 'midas-touch':
        // handled in applyMidasTouch
        break;
      case 'crown-jewel':
        mods.crownJewelActive = true;
        break;
      case 'fate-weaver':
        // handled in event resolution
        break;
      case 'empire-builder':
        // handled in property purchase
        break;
      case 'rubber-baron':
        mods.rubberBaronActive = true;
        break;

      // ---- CURSED ----
      case 'greedy-goblin':
        mods.rentMultiplier *= 3;
        mods.turnIncome -= 50;
        break;
      case 'chaos-dice':
        // handled in dice roll
        break;
      case 'debt-collector':
        mods.rentMultiplier *= 1.5;
        mods.debtCollectorPayMult = 2;
        break;
      case 'golden-handcuffs':
        mods.rentMultiplier *= 2;
        mods.cantSellProperties = true;
        break;
      case 'all-in':
        mods.rentMultiplier *= 2;
        mods.taxMultiplier *= 2;
        break;
      case 'the-gambler':
        // handled at turn start in reducer
        break;
      case 'house-of-cards':
        mods.houseOfCardsDiscount = 0.4;
        mods.upgradeDiscount += 0.4;
        break;
    }
  }

  // ====== Synergy overrides ======
  if (activeSynergies.includes('money-machine')) {
    mods.turnIncome += 100;
    mods.rentReduction = Math.max(mods.rentReduction, 0.5);
  }
  if (activeSynergies.includes('fortified-fortune')) {
    mods.bankruptcySave = true;
  }
  if (activeSynergies.includes('golden-empire')) {
    mods.rentMultiplier *= 1.5;
  }
  if (activeSynergies.includes('cursed-gambler')) {
    const hasGoblin = charms.some((c: OwnedCharm) => c.definitionId === 'greedy-goblin');
    if (hasGoblin) {
      mods.turnIncome += 50; // cancel goblin upkeep
      mods.rentMultiplier = mods.rentMultiplier / 3 * 4; // quad instead of triple
    }
  }
  if (activeSynergies.includes('rigged-casino')) {
    // All dice-related bonuses 50% stronger — applied via diceBonus amp
    mods.diceBonus = Math.floor(mods.diceBonus * 1.5);
  }
  if (activeSynergies.includes('rent-tank')) {
    mods.rentRebatePercent = Math.max(mods.rentRebatePercent, 0.3);
    mods.landlordGrinBonus = Math.max(mods.landlordGrinBonus, 50);
  }
  if (activeSynergies.includes('budget-empire')) {
    mods.cheapPropertyRentMult = Math.max(mods.cheapPropertyRentMult, 4);
        mods.mortgageBonus = Math.max(mods.mortgageBonus, 0.5);
  }
  if (activeSynergies.includes('tax-ghost')) {
    mods.taxMultiplier = 0;
  }
  if (activeSynergies.includes('speed-demon')) {
    mods.diceBonus += 2; // +4 total with swift-feet + golden-boot
    mods.passStartBonus += 100;
  }
  if (activeSynergies.includes('survival-instinct')) {
    mods.bankruptcySave = true;
  }
  if (activeSynergies.includes('property-vacuum')) {
    mods.purchaseDiscount = Math.max(mods.purchaseDiscount, 0.35);
  }
  if (activeSynergies.includes('dice-master')) {
    mods.loadedPocketReroll = true;
  }
  if (activeSynergies.includes('income-empire')) {
    // handled in applyAccountant/applyMidasTouch
  }
  if (activeSynergies.includes('cursed-fortune')) {
    mods.rentMultiplier *= 1.5; // stacks with debt-collector + golden-handcuffs
  }
  if (activeSynergies.includes('high-roller')) {
    // handled in gambler turn-start logic
  }
  if (activeSynergies.includes('all-in-gambler')) {
    // handled in gambler turn-start logic
  }
  if (activeSynergies.includes('discount-developer')) {
    mods.upgradeDiscount = Math.max(mods.upgradeDiscount, 0.6);
    mods.houseOfCardsDiscount = 0; // cancel vanishing risk
  }

  return mods;
}

/** Apply Midas Touch + Accountant at round end */
export function applyRoundEndIncome(state: GameState): GameState {
  let s = { ...state };
  const newPlayers = [...(s.players ?? [])];

  for (let i = 0; i < newPlayers.length; i++) {
    const p = newPlayers[i];
    if (!p?.isAlive) continue;

    const ownedProps = (s.properties ?? []).filter((pr: Property) => pr.ownerId === p.id);
    let totalIncome = 0;
    const activeSynergies = p.activeSynergies ?? [];
    const hasIncomeEmpire = activeSynergies.includes('income-empire');

    // Midas Touch
    const midasCharm = (p.charms ?? []).find((c: OwnedCharm) => c.definitionId === 'midas-touch');
    if (midasCharm) {
      const lvl = midasCharm.level ?? 1;
      const hasGoldenEmpire = activeSynergies.includes('golden-empire');
      let perProp = lvl === 1 ? 30 : lvl === 2 ? 45 : 60;
      if (hasGoldenEmpire) perProp = Math.max(perProp, 60);
      if (hasIncomeEmpire) perProp = Math.max(perProp, 50);
      totalIncome += ownedProps.length * perProp;
    }

    // The Accountant
    const accountantCharm = (p.charms ?? []).find((c: OwnedCharm) => c.definitionId === 'the-accountant');
    if (accountantCharm) {
      const lvl = accountantCharm.level ?? 1;
      let perProp = lvl === 1 ? 10 : lvl === 2 ? 15 : 25;
      if (hasIncomeEmpire) perProp = Math.max(perProp, 50);
      totalIncome += ownedProps.length * perProp;
    }

    if (totalIncome > 0) {
      newPlayers[i] = { ...p, money: p.money + totalIncome };
      s.eventLog = addLogEntry(s.eventLog ?? [], {
        type: 'CHARM_EFFECT',
        message: `${p.name}'s properties generate ${totalIncome} coins!`,
        emoji: '✨',
        playerId: p.id,
        highlight: true,
      });
    }
  }

  s.players = newPlayers;
  return s;
}

// Legacy alias for backward compat
export function applyMidasTouch(state: GameState): GameState {
  return applyRoundEndIncome(state);
}

/** Apply gambler + bank-error-charm turn-start effects */
export function applyTurnStartCharmEffects(state: GameState): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player?.isAlive) return s;

  const charms = player.charms ?? [];
  const activeSynergies = player.activeSynergies ?? [];

  // The Gambler
  const hasGambler = charms.some((c: OwnedCharm) => c.definitionId === 'the-gambler');
  if (hasGambler) {
    const r = randomInt(s.rngState, 1, 100);
    s.rngState = r.nextState;
    const isHighRoller = activeSynergies.includes('high-roller');
    const isAllInGambler = activeSynergies.includes('all-in-gambler');
    const winAmount = isHighRoller ? 600 : 300;
    const loseAmount = isAllInGambler ? 0 : (isHighRoller ? 400 : 200);

    if (r.value <= 25) {
      s.players = (s.players ?? []).map((p: Player) =>
        p.id === player.id ? { ...p, money: p.money + winAmount } : p
      );
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM_EFFECT',
        message: `🃏 The Gambler pays out! ${player.name} gains ${winAmount} coins!`,
        emoji: '🎉',
        playerId: player.id,
        highlight: true,
      });
    } else if (r.value <= 50 && loseAmount > 0) {
      s.players = (s.players ?? []).map((p: Player) =>
        p.id === player.id ? { ...p, money: Math.max(0, p.money - loseAmount) } : p
      );
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM_EFFECT',
        message: `🃏 The Gambler strikes! ${player.name} loses ${loseAmount} coins!`,
        emoji: '💥',
        playerId: player.id,
        highlight: true,
      });
    }
  }

  // Bank Error charm (random payout)
  const hasBankError = charms.some((c: OwnedCharm) => c.definitionId === 'bank-error-charm');
  if (hasBankError) {
    const r = randomInt(s.rngState, 1, 100);
    s.rngState = r.nextState;
    if (r.value <= 30) {
      const amount = randomInt(s.rngState, 50, 150);
      s.rngState = amount.nextState;
      s.players = (s.players ?? []).map((p: Player) =>
        p.id === player.id ? { ...p, money: p.money + amount.value } : p
      );
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM_EFFECT',
        message: `🏦 Bank Error! ${player.name} receives ${amount.value} coins!`,
        emoji: '🏦',
        playerId: player.id,
      });
    }
  }

  return s;
}

/** House of Cards: chance to lose an upgrade when passing Start */
export function applyHouseOfCards(state: GameState): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player?.isAlive) return s;

  const hasHoC = (player.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'house-of-cards');
  // If discount-developer synergy is active, skip the vanish
  const hasSynergy = (player.activeSynergies ?? []).includes('discount-developer');
  if (!hasHoC || hasSynergy) return s;

  const ownedUpgraded = (s.properties ?? []).filter(
    (p: Property) => p.ownerId === player.id && (p.tier ?? 0) > 0
  );
  if (ownedUpgraded.length === 0) return s;

  const r = randomInt(s.rngState, 1, 100);
  s.rngState = r.nextState;
  if (r.value <= 20) {
    // Pick random upgraded property
    const idx = randomInt(s.rngState, 0, ownedUpgraded.length - 1);
    s.rngState = idx.nextState;
    const target = ownedUpgraded[idx.value];
    if (target) {
      const space = BOARD_SPACES[target.spaceIndex];
      s.properties = (s.properties ?? []).map((p: Property) =>
        p.spaceIndex === target.spaceIndex ? { ...p, tier: Math.max(0, (p.tier ?? 0) - 1) } : p
      );
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM_EFFECT',
        message: `🏚️ House of Cards! ${space?.name ?? 'A property'} lost an upgrade level!`,
        emoji: '🏚️',
        playerId: player.id,
        highlight: true,
      });
    }
  }
  return s;
}

/** Check if player effectively owns a full group (accounting for Phantom Deed and Colour Shift) */
export function playerOwnsFullGroupWithCharms(
  state: GameState,
  playerId: string,
  group: string
): boolean {
  const player = (state.players ?? []).find((p: Player) => p.id === playerId);
  if (!player) return false;

  const hasPhantom = (player.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'phantom-deed');
  const hasColourShift = (player.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'colour-shift');
  const hasPhantomMonopoly = (player.activeSynergies ?? []).includes('phantom-monopoly');

  const groupSpaces = BOARD_SPACES.filter((s: any) => s.group === group && s.type === 'PROPERTY');
  if (groupSpaces.length === 0) return false;

  let ownedCount = 0;
  let unownedCount = 0;

  for (const space of groupSpaces) {
    const prop = getProperty(state, space.index);
    if (prop?.ownerId === playerId) {
      ownedCount++;
    } else {
      unownedCount++;
    }
  }

  // Normal ownership
  if (ownedCount === groupSpaces.length) return true;

  // Phantom Deed: treat ONE unowned property as temporarily owned
  if (hasPhantom && unownedCount === 1 && ownedCount === groupSpaces.length - 1) {
    // Check that the missing property is truly unowned (not owned by opponent)
    const missingSpace = groupSpaces.find((s: any) => {
      const p = getProperty(state, s.index);
      return p?.ownerId !== playerId;
    });
    const missingProp = missingSpace ? getProperty(state, missingSpace.index) : null;
    if (missingProp?.ownerId === null || hasPhantomMonopoly) {
      return true;
    }
  }

  // Colour Shift: one of player's properties counts toward adjacent group
  if (hasColourShift && ownedCount === groupSpaces.length - 1) {
    // Check adjacent groups for a property the player owns that could shift
    const groupOrder = ['brown', 'light-blue', 'pink', 'orange', 'red', 'yellow', 'green', 'navy'];
    const gIdx = groupOrder.indexOf(group);
    const adjacentGroups = [
      gIdx > 0 ? groupOrder[gIdx - 1] : null,
      gIdx < groupOrder.length - 1 ? groupOrder[gIdx + 1] : null,
    ].filter(Boolean);

    for (const adjGroup of adjacentGroups) {
      if (!adjGroup) continue;
      const adjSpaces = BOARD_SPACES.filter((s: any) => s.group === adjGroup && s.type === 'PROPERTY');
      const hasAdjOwned = adjSpaces.some((s: any) => {
        const p = getProperty(state, s.index);
        return p?.ownerId === playerId;
      });
      if (hasAdjOwned) return true;
    }
  }

  return false;
}
