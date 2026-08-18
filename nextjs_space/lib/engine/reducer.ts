// ============================================
// Game Reducer — Pure (state, action) => state
// ============================================
import {
  GameState, GameAction, Player, GameConfig, Property,
  TradeOffer, CharmShopState, OwnedCharm, CHARM_SHOP_UNLOCK_ROUND, AIPlayerConfig, EventCondition,
} from './types';
import { BOARD_SPACES, createInitialProperties } from './board-data';
import { ALL_CHARMS, getCharmDef, SYNERGIES, getCharmUpgradeCost, getCharmEvolutionTurns } from './charms-data';
import { EVENT_DECK } from './event-deck';
import { rollDice, nextRng, randomInt, pickRandom, shuffleArray } from './rng';
import {
  addLogEntry, getPlayer, getSpace, getProperty,
  updatePlayer, updateProperty, playerOwnsFullGroup,
  calculateRent, calculateNetWorth, checkSynergies,
  nextAlivePlayer, countAlivePlayers, countOwnedInGroup,
} from './reducer-utils';
import { computeModifiers, applyMidasTouch, applyTurnStartCharmEffects, applyHouseOfCards, playerOwnsFullGroupWithCharms } from './charm-effects';

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'classic',
  maxRounds: 30,
  startingMoney: 1500,
  passStartBonus: 200,
  charmShopInterval: 4,
  charmShopSize: 4,
  maxCharmSlots: 3,
  charmPermadeath: false,
  acceleratedEconomy: false,
  eventFrequency: 6,
  aiDifficulty: 'medium',
};

export const MODE_PRESETS: Record<string, Partial<GameConfig>> = {
  classic: {},
  quick: {
    mode: 'quick',
    maxRounds: 15,
    startingMoney: 2000,
    passStartBonus: 300,
    charmShopInterval: 3,
    charmShopSize: 5,
    acceleratedEconomy: true,
    eventFrequency: 4,
  },
  hardcore: {
    mode: 'hardcore',
    maxRounds: 40,
    startingMoney: 1000,
    passStartBonus: 150,
    charmShopInterval: 5,
    charmPermadeath: true,
    maxCharmSlots: 4,
    eventFrequency: 5,
  },
  custom: { mode: 'custom' },
};

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA'];
const PLAYER_ICONS = ['🚀', '🌟', '💎', '🍀'];

export function createInitialState(
  playerNames: string[],
  seed?: number,
  config?: Partial<GameConfig>,
  customIcons?: string[],
  aiPlayers?: AIPlayerConfig[]
): GameState {
  if (aiPlayers && playerNames.length > 0 && playerNames.every((_, index) => aiPlayers[index]?.enabled === true)) {
    throw new Error('A game requires at least one human player.');
  }
  const cfg = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const gameSeed = seed ?? Math.floor(Math.random() * 2147483647);
  const icons = customIcons && customIcons.length > 0 ? customIcons : PLAYER_ICONS;

  const players: Player[] = playerNames.map((name: string, i: number) => ({
    id: `player-${i}`,
    name: name || `Player ${i + 1}`,
    color: PLAYER_COLORS[i] ?? '#888',
    icon: icons[i] ?? PLAYER_ICONS[i] ?? '🎮',
    money: cfg.startingMoney,
    position: 0,
    charms: [],
    activeSynergies: [],
    isAlive: true,
    turnsInJail: 0,
    jailFreeCharms: 0,
    doublesCount: 0,
    passedStartThisTurn: false,
    previousPosition: 0,
    activeDiceBonus: 0,
    activeRentShield: false,
    isAI: aiPlayers?.[i]?.enabled ?? false,
    aiPersonality: aiPlayers?.[i]?.personality ?? 'cautious',
  }));

  return {
    config: cfg,
    phase: 'ROLL_DICE',
    players,
    properties: createInitialProperties(),
    currentPlayerIndex: 0,
    round: 1,
    turnCount: 0,
    diceResult: null,
    eventLog: addLogEntry([], {
      type: 'SYSTEM',
      message: `Game started! ${players[0]?.name}'s turn.`,
      emoji: '🎲',
      highlight: true,
    }),
    activeEvent: null,
    tradeOffer: null,
    charmShop: null,
    charmShopBonus: null,
    shopOpenedThisTurn: false,
    tradeProposedThisTurn: false,
    riskChoice: null,
    winner: null,
    seed: gameSeed,
    rngState: gameSeed,
    turnsSinceLastShop: 0,
    turnsSinceLastEvent: 0,
    usedEventIds: [],
    bankruptcyDebt: 0,
    bankruptcyCreditorId: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state) return state;

  switch (action.type) {
    case 'ROLL_DICE':
      return handleRollDice(state);
    case 'BUY_PROPERTY':
      return handleBuyProperty(state);
    case 'UPGRADE_PROPERTY':
      return handleUpgradeProperty(state, action.spaceIndex);
    case 'MORTGAGE_PROPERTY':
      return handleMortgageProperty(state, action.spaceIndex);
    case 'UNMORTGAGE_PROPERTY':
      return handleUnmortgageProperty(state, action.spaceIndex);
    case 'SELL_UPGRADE':
      return handleSellUpgrade(state, action.spaceIndex);
    case 'END_TURN':
      return handleEndTurn(state);
    case 'PROPOSE_TRADE':
      return handleProposeTrade(state, action.offer);
    case 'COUNTER_TRADE':
      return handleCounterTrade(state, action.offer);
    case 'RESPOND_TRADE':
      return handleRespondTrade(state, action.accept);
    case 'BUY_CHARM':
      return handleBuyCharm(state, action.charmId);
    case 'SELL_CHARM':
      return handleSellCharm(state, action.instanceId);
    case 'UPGRADE_CHARM':
      return handleUpgradeCharm(state, action.instanceId);
    case 'REROLL_SHOP':
      return handleRerollShop(state);
    case 'CLOSE_SHOP':
      return {
        ...state,
        charmShop: null,
        phase: state.shopReturnPhase ?? 'PLAYER_ACTION',
        shopReturnPhase: undefined,
      };
    case 'OPEN_SHOP':
      return handleOpenCharmShop(state);
    case 'LOCK_SHOP_ITEM':
      return handleLockShopItem(state, action.charmId);
    case 'RESOLVE_EVENT':
      return handleResolveEvent(state);
    case 'RISK_CHOOSE':
      return handleRiskChoose(state, action.safe);
    case 'PAY_JAIL_FINE':
      return handlePayJailFine(state);
    case 'DECLARE_BANKRUPTCY':
      return handleDeclareBankruptcy(state);
    case 'START_TRADE':
      return { ...state, phase: 'TRADING' };
    case 'CANCEL_TRADE':
      return { ...state, phase: 'PLAYER_ACTION', tradeOffer: null };
    case 'ACTIVATE_CHARM':
      return handleActivateCharm(state, action.instanceId);
    case 'PLAYER_LEFT':
      return handlePlayerLeft(state, action.playerId);
    case 'CHECK_VICTORY':
      return checkVictory(state);
    default:
      return state;
  }
}

// ---- Action Handlers ----

function handleRollDice(state: GameState): GameState {
  let s = { ...state };
  const player = getPlayer(s);
  if (!player?.isAlive) return handleEndTurn(s);

  // Apply turn-start income from charms
  const mods = computeModifiers(player, s, 'ON_TURN_START');
  if (mods.turnIncome !== 0) {
    s.players = updatePlayer(s, player.id, { money: player.money + mods.turnIncome });
    if (mods.turnIncome > 0) {
           s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM_EFFECT',
        message: `${player.name} earns ${mods.turnIncome} coins from charms.`,
        emoji: '🪙',
        playerId: player.id,
      });
    } else {
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM_EFFECT',
        message: `${player.name} pays ${Math.abs(mods.turnIncome)} coins charm upkeep.`,
        emoji: '👺',
        playerId: player.id,
      });
    }
  }

  // Apply gambler / bank-error turn-start charm effects
  s = applyTurnStartCharmEffects(s);

  // Handle jail
  const currentPlayer = (s.players ?? [])[s.currentPlayerIndex] ?? player;
  if (currentPlayer.turnsInJail > 0) {
    const { dice, nextState: rng1 } = rollDice(s.rngState);
    s.rngState = rng1;
    s.diceResult = dice;
    const isDoubles = dice[0] === dice[1];
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'DICE',
      message: `${currentPlayer.name} rolled ${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}${isDoubles ? ' (Doubles!)' : ''}`,
      emoji: '🎲',
      playerId: currentPlayer.id,
    });

    if (isDoubles) {
      s.players = updatePlayer(s, currentPlayer.id, { turnsInJail: 0, doublesCount: 0 });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${currentPlayer.name} rolled doubles and is free from jail!`,
        emoji: '🔓',
        playerId: currentPlayer.id,
      });
      return movePlayer(s, dice[0] + dice[1]);
    }
    if (currentPlayer.turnsInJail >= 3) {
      // forced to pay after 3 turns
      s.players = updatePlayer(s, currentPlayer.id, {
        turnsInJail: 0,
        money: currentPlayer.money - 50,
      });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${currentPlayer.name} paid 50 coins fine after 3 turns in jail.`,
        emoji: '💸',
        playerId: currentPlayer.id,
      });
      return movePlayer(s, dice[0] + dice[1]);
    }
    s.players = updatePlayer(s, currentPlayer.id, {
      turnsInJail: currentPlayer.turnsInJail + 1,
    });
    s.phase = 'PLAYER_ACTION';
    return s;
  }

  // Normal roll
  const diceMods = computeModifiers(currentPlayer, s, 'ON_DICE_ROLL');
  const hasChaos = (currentPlayer.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'chaos-dice');

  let diceRoll: { dice: [number, number]; nextState: number };
  if (hasChaos) {
    // Chaos dice: reroll each die
    const r1 = randomInt(s.rngState, 1, 6);
    const r2 = randomInt(r1.nextState, 1, 6);
    const r3 = randomInt(r2.nextState, 1, 6);
    const r4 = randomInt(r3.nextState, 1, 6);
    diceRoll = {
      dice: [r1.value + r3.value > 6 ? 6 : r1.value, r2.value + r4.value > 6 ? 6 : r2.value] as [number, number],
      nextState: r4.nextState,
    };
  } else {
    diceRoll = rollDice(s.rngState);
  }

  s.rngState = diceRoll.nextState;
  s.diceResult = diceRoll.dice;

  const activeDiceBonus = currentPlayer.activeDiceBonus ?? 0;
  if (activeDiceBonus > 0) {
    s.players = updatePlayer(s, currentPlayer.id, { activeDiceBonus: 0 });
  }
  const total = diceRoll.dice[0] + diceRoll.dice[1] + diceMods.diceBonus + activeDiceBonus;
  const isDoubles = diceRoll.dice[0] === diceRoll.dice[1];

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'DICE',
    message: `${currentPlayer.name} rolled ${diceRoll.dice[0]} + ${diceRoll.dice[1]}${diceMods.diceBonus || activeDiceBonus ? ` (+${diceMods.diceBonus + activeDiceBonus})` : ''} = ${total}`,
    emoji: '🎲',
    playerId: currentPlayer.id,
  });

  // Check for doubles bonus
  const hasDoubleOrNothing = (currentPlayer.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'double-or-nothing');
  const hasDiceMaster = (currentPlayer.activeSynergies ?? []).includes('dice-master');
  const doublesBonus = hasDiceMaster ? 200 : 100;
  if (isDoubles && hasDoubleOrNothing) {
    const p = (s.players ?? [])[s.currentPlayerIndex];
    s.players = updatePlayer(s, currentPlayer.id, { money: (p?.money ?? 0) + doublesBonus });
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'CHARM_EFFECT',
      message: `Double or Nothing! ${currentPlayer.name} gets ${doublesBonus} bonus coins!`,
      emoji: '🎰',
      playerId: currentPlayer.id,
      highlight: true,
    });
  }

  // Snake Eyes: doubles give 75 coins
  const hasSnakeEyes = (currentPlayer.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'snake-eyes');
  if (isDoubles && hasSnakeEyes) {
    const p = (s.players ?? [])[s.currentPlayerIndex];
    s.players = updatePlayer(s, currentPlayer.id, { money: (p?.money ?? 0) + 75 });
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'CHARM_EFFECT',
      message: `🐍 Snake Eyes! ${currentPlayer.name} earns 75 coins!`,
      emoji: '🐍',
      playerId: currentPlayer.id,
    });
  }

  // Lucky Seven: rolling exactly 7 gives bonus
  const hasLuckySeven = (currentPlayer.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'lucky-seven');
  const hasRiggedCasino = (currentPlayer.activeSynergies ?? []).includes('rigged-casino');
  if (hasLuckySeven && total === 7) {
    const bonus = hasRiggedCasino ? 150 : 100;
    const p = (s.players ?? [])[s.currentPlayerIndex];
    s.players = updatePlayer(s, currentPlayer.id, { money: (p?.money ?? 0) + bonus });
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'CHARM_EFFECT',
      message: `7️⃣ Lucky Seven! ${currentPlayer.name} earns ${bonus} coins!`,
      emoji: '7️⃣',
      playerId: currentPlayer.id,
      highlight: true,
    });
  }

  // Track doubles for jail (3 doubles = jail)
  if (isDoubles) {
    const newDoubles = (currentPlayer.doublesCount ?? 0) + 1;
    if (newDoubles >= 3) {
      s.players = updatePlayer(s, currentPlayer.id, { doublesCount: 0, turnsInJail: 1, position: 10 });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${currentPlayer.name} rolled 3 doubles in a row! Go to Jail!`,
        emoji: '🚔',
        playerId: currentPlayer.id,
        highlight: true,
      });
      s.phase = 'PLAYER_ACTION';
      return s;
    }
    s.players = updatePlayer(s, currentPlayer.id, { doublesCount: newDoubles });
  } else {
    s.players = updatePlayer(s, currentPlayer.id, { doublesCount: 0 });
  }

  return movePlayer(s, total);
}

function movePlayer(state: GameState, spaces: number): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;

  const oldPos = player.position ?? 0;
  const newPos = (oldPos + spaces) % 40;
  const passedStart = oldPos + spaces >= 40;

  let newMoney = player.money ?? 0;
  if (passedStart && newPos !== 0) {
    const mods = computeModifiers(player, s, 'ON_PASS_START');
    const bonus = (s.config?.passStartBonus ?? 200) + mods.passStartBonus;
    newMoney += bonus;
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'SYSTEM',
      message: `${player.name} passed Start! Collected ${bonus} coins.`,
      emoji: '💵',
      playerId: player.id,
    });
  }

  s.players = updatePlayer(s, player.id, {
    position: newPos,
    previousPosition: oldPos,
    money: newMoney,
    passedStartThisTurn: passedStart,
  });

  // House of Cards: chance to lose an upgrade when passing Start
  if (passedStart) {
    s = applyHouseOfCards(s);
  }

  const space = getSpace(newPos);
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'MOVE',
    message: `${player.name} landed on ${space?.name ?? 'Unknown'}.`,
    emoji: '📍',
    playerId: player.id,
  });

  return resolveSpace(s, newPos);
}

function resolveSpace(state: GameState, spaceIndex: number): GameState {
  let s = { ...state };
  const space = getSpace(spaceIndex);
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!space || !player) return s;

  switch (space.type) {
    case 'PROPERTY':
    case 'TRANSIT':
    case 'UTILITY': {
      const prop = getProperty(s, spaceIndex);
      if (!prop) { s.phase = 'PLAYER_ACTION'; return s; }

      if (prop.ownerId === null) {
        // Unowned — player can buy
        s.phase = 'RESOLVE_SPACE';
        return s;
      } else if (prop.ownerId !== player.id && !prop.mortgaged) {
        // Owned by someone else — pay rent
        const owner = (s.players ?? []).find((p: Player) => p.id === prop.ownerId);
        if (!owner?.isAlive || (owner.turnsInJail ?? 0) > 0) {
          s.phase = 'PLAYER_ACTION';
          return s;
        }
        const ownerMods = computeModifiers(owner, s, 'ON_RECEIVE_RENT');
        const payerMods = computeModifiers(player, s, 'ON_PAY_RENT');

        if (payerMods.blockRent || player.activeRentShield) {
          // Shield charm blocks rent
          s.eventLog = addLogEntry(s.eventLog, {
            type: 'CHARM_EFFECT',
            message: `${player.name}'s Shield Charm blocks the rent payment!`,
            emoji: '🛡️',
            playerId: player.id,
            highlight: true,
          });
          // Mark shield as used
          const updatedCharms = (player.charms ?? []).map((c: OwnedCharm) =>
            c.definitionId === 'shield-charm' ? { ...c, activatedThisTurn: true } : c
          );
          s.players = updatePlayer(s, player.id, { charms: updatedCharms, activeRentShield: false });
          s.phase = 'PLAYER_ACTION';
          return s;
        }

        let rent = calculateRent(s, space, prop, ownerMods.rentMultiplier);

        // Monopoly Monopoly: +50% if owner has full group
        const hasMonoMono = (owner.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'monopoly-monopoly');
        if (hasMonoMono && space.group && playerOwnsFullGroupWithCharms(s, owner.id, space.group)) {
          rent = Math.floor(rent * 1.5);
        }

        // Bad Investment: cheap properties (≤120c) get multiplier
        if (ownerMods.cheapPropertyRentMult > 1 && (space.price ?? 999) <= 120) {
          rent = Math.floor(rent * ownerMods.cheapPropertyRentMult);
        }

        // Crown Jewel: most expensive property gets 5x rent
        if (ownerMods.crownJewelActive) {
          const ownerProps = (s.properties ?? []).filter((p: Property) => p.ownerId === owner.id);
          const mostExpensive = ownerProps.reduce((best: number, p: Property) => {
            const sp = getSpace(p.spaceIndex);
            return (sp?.price ?? 0) > (getSpace(best)?.price ?? 0) ? p.spaceIndex : best;
          }, ownerProps[0]?.spaceIndex ?? -1);
          if (prop.spaceIndex === mostExpensive) {
            rent = Math.floor(rent * 5);
          }
        }

        // Landlord's Grin: flat bonus
        rent += ownerMods.landlordGrinBonus;

        // Payer: rent reduction
        rent = Math.floor(rent * (1 - payerMods.rentReduction));

        // Debt Collector: payer pays extra
        if (payerMods.debtCollectorPayMult > 1) {
          rent = Math.floor(rent * payerMods.debtCollectorPayMult);
        }

        // Double Down: doubles financial events
        if (payerMods.doubleDownActive || ownerMods.doubleDownActive) {
          rent = Math.floor(rent * 2);
        }

        rent = Math.max(rent, 0);

        // Check market crash effect
        if ((s.activeEvent?.id ?? '') === 'market-crash') {
          rent = Math.floor(rent / 2);
        }

        if ((player.money ?? 0) < rent) {
          s.eventLog = addLogEntry(s.eventLog, {
            type: 'RENT',
            message: `${player.name} owes ${rent} coins to ${owner.name} but can't afford it!`,
            emoji: '🚨',
            playerId: player.id,
             highlight: true,
           });
           s.bankruptcyDebt = rent;
           s.bankruptcyCreditorId = owner.id;
           s.phase = 'BANKRUPTCY';
          return s;
        }

        s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) - rent });
        const updatedPlayers2 = (s.players ?? []).map((p: Player) =>
          p.id === owner.id ? { ...p, money: (p.money ?? 0) + rent } : p
        );
        s.players = updatedPlayers2;

        s.eventLog = addLogEntry(s.eventLog, {
          type: 'RENT',
          message: `${player.name} paid ${rent} coins rent to ${owner.name}.`,
          emoji: '💸',
          playerId: player.id,
        });

        // Rent Rebate: recover % from bank
        if (payerMods.rentRebatePercent > 0) {
          const rebate = Math.floor(rent * payerMods.rentRebatePercent);
          if (rebate > 0) {
            s.players = (s.players ?? []).map((p: Player) =>
              p.id === player.id ? { ...p, money: (p.money ?? 0) + rebate } : p
            );
            s.eventLog = addLogEntry(s.eventLog, {
              type: 'CHARM_EFFECT',
              message: `🧾 Rent Rebate! ${player.name} recovers ${rebate} coins.`,
              emoji: '🧾',
              playerId: player.id,
            });
          }
        }

        // Parasite Estate: % of all rent flows to parasite holders
        for (const otherPlayer of (s.players ?? [])) {
          if (!otherPlayer.isAlive || otherPlayer.id === owner.id) continue;
          const otherMods = computeModifiers(otherPlayer, s, 'ON_PAY_RENT');
          if (otherMods.parasiteEstatePercent > 0) {
            const parasiteCut = Math.floor(rent * otherMods.parasiteEstatePercent);
            if (parasiteCut > 0) {
              s.players = (s.players ?? []).map((p: Player) =>
                p.id === otherPlayer.id ? { ...p, money: (p.money ?? 0) + parasiteCut } : p
              );
            }
          }
        }

        // Rubber Baron: gain from opponent spending
        for (const otherPlayer of (s.players ?? [])) {
          if (!otherPlayer.isAlive || otherPlayer.id === player.id) continue;
          const otherMods = computeModifiers(otherPlayer, s, 'PASSIVE');
          if (otherMods.rubberBaronActive) {
            const gain = Math.min(rent, 50); // cap at 50 per transaction
            s.players = (s.players ?? []).map((p: Player) =>
              p.id === otherPlayer.id ? { ...p, money: (p.money ?? 0) + gain } : p
            );
          }
        }

        // Hardcore: charm permadeath — 25% chance to lose a random charm on paying rent
        if (s.config?.charmPermadeath) {
          const currentPayer = (s.players ?? []).find((p: Player) => p.id === player.id);
          if (currentPayer && (currentPayer.charms ?? []).length > 0) {
            const { value: chanceVal, nextState: pdRng } = nextRng(s.rngState);
            s.rngState = pdRng;
            if (chanceVal < 0.25) {
              const { value: doomed, nextState: pdRng2 } = pickRandom(currentPayer.charms ?? [], s.rngState);
              s.rngState = pdRng2;
              if (doomed) {
                const doomedDef = getCharmDef(doomed.definitionId);
                const filteredCharms = (currentPayer.charms ?? []).filter((c: OwnedCharm) => c.instanceId !== doomed.instanceId);
                s.players = updatePlayer(s, player.id, {
                  charms: filteredCharms,
                  activeSynergies: checkSynergies({ ...currentPayer, charms: filteredCharms }),
                });
                s.eventLog = addLogEntry(s.eventLog, {
                  type: 'CHARM',
                  message: `Hardcore! ${player.name}'s ${doomedDef?.icon ?? ''} ${doomedDef?.name ?? 'charm'} was destroyed!`,
                  emoji: '💥',
                  playerId: player.id,
                  highlight: true,
                });
              }
            }
          }
        }

        s.phase = 'PLAYER_ACTION';
        return s;
      } else {
        // Own property — go to action phase
        s.phase = 'PLAYER_ACTION';
        return s;
      }
    }

    case 'TAX': {
      // Tax Holiday event: no taxes this round
      if ((s.activeEvent?.id ?? '') === 'tax-holiday') {
        s.eventLog = addLogEntry(s.eventLog, {
          type: 'EVENT',
          message: `Tax Holiday! ${player.name} skips taxes!`,
          emoji: '🎉',
          playerId: player.id,
        });
        s.phase = 'PLAYER_ACTION';
        return s;
      }
      const mods = computeModifiers(player, s, 'ON_TAX');
      let tax = Math.floor((space.taxAmount ?? 0) * mods.taxMultiplier);
      if ((player.money ?? 0) < tax) {
        s.bankruptcyDebt = tax;
        s.bankruptcyCreditorId = null;
        s.phase = 'BANKRUPTCY';
        return s;
      }
      s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) - tax });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'TAX',
        message: `${player.name} paid ${tax} coins in taxes.`,
        emoji: '💰',
        playerId: player.id,
      });
      s.phase = 'PLAYER_ACTION';
      return s;
    }

    case 'GO_TO_JAIL': {
      s.players = updatePlayer(s, player.id, { position: 10, turnsInJail: 1 });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${player.name} is sent to Jail!`,
        emoji: '🚔',
        playerId: player.id,
        highlight: true,
      });
      s.phase = 'PLAYER_ACTION';
      return s;
    }

    case 'LUCKY_SPACE': {
      // Draw a random charm
      const available = ALL_CHARMS.filter((c: any) => c.rarity !== 'Legendary');
      const { value: charm, nextState: rng } = pickRandom(available, s.rngState);
      s.rngState = rng;

      if ((player.charms ?? []).length < (s.config?.maxCharmSlots ?? 3) && charm) {
        const instanceId = `charm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newCharm: OwnedCharm = { instanceId, definitionId: charm.id, activatedThisTurn: false, level: 1, turnsHeld: 0 };
        const updatedCharms = [...(player.charms ?? []), newCharm];
        const synergies = checkSynergies({ ...player, charms: updatedCharms });
        s.players = updatePlayer(s, player.id, { charms: updatedCharms, activeSynergies: synergies });
        s.eventLog = addLogEntry(s.eventLog, {
          type: 'CHARM',
          message: `${player.name} found a Lucky Charm: ${charm.icon} ${charm.name}!`,
          emoji: '🍀',
          playerId: player.id,
          highlight: true,
        });

        // Check for new synergies
        const oldSynergies = player.activeSynergies ?? [];
        const newSynergies = synergies.filter((sid: string) => !oldSynergies.includes(sid));
        for (const sid of newSynergies) {
          const syn = SYNERGIES.find((sy: any) => sy.id === sid);
          if (syn) {
            s.eventLog = addLogEntry(s.eventLog, {
              type: 'SYNERGY',
              message: `SYNERGY DISCOVERED: ${syn.icon} ${syn.name}! ${syn.description}`,
              emoji: '🌟',
              playerId: player.id,
              highlight: true,
            });
          }
        }
      } else {
        // Slots full — give coins instead
        s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + 100 });
        s.eventLog = addLogEntry(s.eventLog, {
          type: 'SYSTEM',
          message: `${player.name}'s charm slots are full! Received 100 coins instead.`,
          emoji: '💰',
          playerId: player.id,
        });
      }
      s.phase = 'PLAYER_ACTION';
      return s;
    }

    case 'RISK_SPACE': {
      const safeR = randomInt(s.rngState, 50, 150);
      const gambleR = randomInt(safeR.nextState, 200, 500);
      s.rngState = gambleR.nextState;
      s.riskChoice = {
        safeReward: safeR.value,
        gambleReward: gambleR.value,
        gambleChance: 0.4,
      };
      s.phase = 'RISK_CHOICE';
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${player.name} enters the Risk Space! Choose: Safe or Gamble?`,
        emoji: '🎰',
        playerId: player.id,
        highlight: true,
      });
      return s;
    }

    case 'EVENT': {
      return drawRandomEvent(s, player);
    }

    case 'START': {
      // Landing on Start gives bonus
      const mods = computeModifiers(player, s, 'ON_PASS_START');
      const bonus = (s.config?.passStartBonus ?? 200) + mods.passStartBonus;
      s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + bonus });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${player.name} landed on Start! Bonus ${bonus} coins!`,
        emoji: '💵',
        playerId: player.id,
      });
      s.phase = 'PLAYER_ACTION';
      return s;
    }

    default:
      s.phase = 'PLAYER_ACTION';
      return s;
  }
}

function handleBuyProperty(state: GameState): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const space = getSpace(player.position ?? 0);
  const prop = getProperty(s, player.position ?? 0);
  if (!space || !prop || prop.ownerId !== null) return s;

  const mods = computeModifiers(player, s, 'ON_BUY_PROPERTY');
  let price = space.price ?? 0;

  // Golden Hour: free purchase
  if ((s.activeEvent?.id ?? '') === 'golden-hour') {
    price = 0;
    s.activeEvent = null;
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'EVENT',
      message: `Golden Hour! ${player.name} gets ${space.name} for FREE!`,
      emoji: '🌅',
      playerId: player.id,
      highlight: true,
    });
  } else if ((s.activeEvent?.id ?? '') === 'fire-sale') {
    price = Math.floor(price * 0.5);
  } else {
    price = Math.floor(price * (1 - mods.purchaseDiscount));
  }

  if ((player.money ?? 0) < price) return s;

   s.properties = updateProperty(s, player.position ?? 0, { ownerId: player.id, mortgaged: false });
  s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) - price });

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'BUY',
    message: `${player.name} bought ${space.name} for ${price} coins!`,
    emoji: '🏠',
    playerId: player.id,
  });

  // Empire Builder: auto-upgrade to Shop when completing a colour set
  const empireBuilder = (player.charms ?? []).some((c: OwnedCharm) => c.definitionId === 'empire-builder');
  if (empireBuilder && space.group) {
    const updatedPlayer = (s.players ?? [])[s.currentPlayerIndex];
    if (updatedPlayer && playerOwnsFullGroupWithCharms(s, player.id, space.group)) {
      // Auto-upgrade all group properties to at least Shop (tier 1)
      const groupSpaces = BOARD_SPACES.filter((sp: any) => sp.group === space.group);
      for (const gs of groupSpaces) {
        const gp = getProperty(s, gs.index);
        if (gp && gp.ownerId === player.id && (gp.tier ?? 0) < 1) {
          s.properties = updateProperty(s, gs.index, { tier: 1 });
        }
      }
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'CHARM',
        message: `Empire Builder auto-upgraded ${space.group} set to Shop tier!`,
        emoji: '🏗️',
        playerId: player.id,
        highlight: true,
      });
    }
  }

  s.phase = 'PLAYER_ACTION';
  return s;
}

function handleUpgradeProperty(state: GameState, spaceIndex: number): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const space = getSpace(spaceIndex);
  const prop = getProperty(s, spaceIndex);
   if (!space || !prop || prop.ownerId !== player.id || prop.mortgaged) return s;
  if (space.type !== 'PROPERTY') return s;
  if ((prop.tier ?? 0) >= 4) return s;

  // Must own full group — use charm-aware check (Phantom Deed, Colour Shift)
  if (!playerOwnsFullGroupWithCharms(s, player.id, space.group ?? '')) return s;

  const mods = computeModifiers(player, s, 'ON_BUY_PROPERTY');
  let baseUpgradeCost = space.upgradeCost ?? 0;
  // Cursed Ground event: upgrades cost 50% more
  if ((s.activeEvent?.id ?? '') === 'cursed-ground') {
    baseUpgradeCost = Math.floor(baseUpgradeCost * 1.5);
  }
  const discount = Math.min(mods.upgradeDiscount + mods.houseOfCardsDiscount, 0.9);
  const cost = Math.floor(baseUpgradeCost * (1 - discount));
  if ((player.money ?? 0) < cost) return s;

  s.properties = updateProperty(s, spaceIndex, { tier: (prop.tier ?? 0) + 1 });
  s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) - cost });

  const tierNames = ['', 'Shop', 'Business', 'Complex', 'Empire'];
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'UPGRADE',
    message: `${player.name} upgraded ${space.name} to ${tierNames[(prop.tier ?? 0) + 1] ?? 'max'}!`,
    emoji: '⬆️',
    playerId: player.id,
  });

  return s;
}

function handleMortgageProperty(state: GameState, spaceIndex: number): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const prop = getProperty(s, spaceIndex);
  const space = getSpace(spaceIndex);
  if (!prop || !space || prop.ownerId !== player.id || prop.mortgaged || (prop.tier ?? 0) > 0) return s;

   // Golden Handcuffs: cannot mortgage properties
   const mods = computeModifiers(player, s, 'ON_MORTGAGE_PROPERTY');
  if (mods.cantSellProperties) {
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'CHARM',
       message: `${player.name} can't mortgage — Golden Handcuffs prevent property mortgages!`,
      emoji: '🔒',
      playerId: player.id,
    });
    return s;
  }

   const value = Math.floor((space.price ?? 0) / 2 * (1 + mods.mortgageBonus));
  s.properties = updateProperty(s, spaceIndex, { mortgaged: true });
  s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + value });

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'SELL',
    message: `${player.name} mortgaged ${space.name} for ${value} coins.`,
    emoji: '🏦',
    playerId: player.id,
  });
  return s;
}

function handleUnmortgageProperty(state: GameState, spaceIndex: number): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  const prop = getProperty(s, spaceIndex);
  const space = getSpace(spaceIndex);
  if (!player || !prop || !space || prop.ownerId !== player.id || !prop.mortgaged) return s;
  const cost = Math.ceil((space.price ?? 0) * 0.55);
  if (player.money < cost) return s;
  s.properties = updateProperty(s, spaceIndex, { mortgaged: false });
  s.players = updatePlayer(s, player.id, { money: player.money - cost });
  s.eventLog = addLogEntry(s.eventLog, { type: 'SYSTEM', message: `${player.name} unmortgaged ${space.name} for ${cost} coins.`, emoji: '🔓', playerId: player.id });
  return s;
}

function handleSellUpgrade(state: GameState, spaceIndex: number): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const prop = getProperty(s, spaceIndex);
  const space = getSpace(spaceIndex);
  if (!prop || !space || prop.ownerId !== player.id || (prop.tier ?? 0) <= 0) return s;

  const refund = Math.floor((space.upgradeCost ?? 0) / 2);
  s.properties = updateProperty(s, spaceIndex, { tier: (prop.tier ?? 0) - 1 });
  s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + refund });

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'SELL',
    message: `${player.name} downgraded ${space.name} for ${refund} coins.`,
    emoji: '⬇️',
    playerId: player.id,
  });
  return s;
}

function handleEndTurn(state: GameState): GameState {
  if (state.phase === 'BANKRUPTCY') {
    const player = (state.players ?? [])[state.currentPlayerIndex];
    const debt = state.bankruptcyDebt ?? 0;
    if (!player || (player.money ?? 0) < debt) return state;

    let settled = { ...state };
    const creditorId = state.bankruptcyCreditorId;
    if (creditorId && debt > 0) {
      settled.players = (settled.players ?? []).map((p: Player) =>
        p.id === creditorId ? { ...p, money: (p.money ?? 0) + debt } : p
      );
    }
    settled.players = updatePlayer(settled, player.id, { money: (player.money ?? 0) - debt });
    settled.bankruptcyDebt = 0;
    settled.bankruptcyCreditorId = null;
    settled.phase = 'PLAYER_ACTION';
    settled.eventLog = addLogEntry(settled.eventLog, {
      type: 'SYSTEM',
      message: `${player.name} paid ${debt} coins and cleared the debt.`,
      emoji: '✅',
      playerId: player.id,
    });
    return settled;
  }

  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];

  if (player?.isAlive) {
    s = advanceCharmEvolution(s, player.id);
  }

  s.turnsSinceLastEvent = (s.turnsSinceLastEvent ?? 0) + 1;
  s.turnCount = (s.turnCount ?? 0) + 1;

  // Advance to next alive player
  const nextIdx = nextAlivePlayer(s);

  // Check if round ended
  const isNewRound = nextIdx <= (s.currentPlayerIndex ?? 0);
  if (isNewRound) {
    s.round = (s.round ?? 1) + 1;
    // Apply Midas Touch / round-end income
    s = applyMidasTouch(s);
    // Clear round-scoped events
    const roundEvents = ['market-crash', 'fire-sale', 'property-boom', 'cursed-ground', 'tax-holiday'];
    if (s.activeEvent && roundEvents.includes(s.activeEvent.id)) {
      s.activeEvent = null;
    }
  }

  s.currentPlayerIndex = nextIdx;
  s.shopOpenedThisTurn = false;
  s.tradeProposedThisTurn = false;
  s.diceResult = null;
  s.phase = 'ROLL_DICE';

  const nextPlayer = (s.players ?? [])[nextIdx];

  // Check if random event should fire (based on eventFrequency)
  const freq = s.config?.eventFrequency ?? 6;
  if ((s.turnsSinceLastEvent ?? 0) >= freq) {
    s = triggerRandomEvent(s);
    s.turnsSinceLastEvent = 0;
  }

  // Check game over conditions
  if ((s.round ?? 1) > (s.config?.maxRounds ?? 30) || countAlivePlayers(s) <= 1) {
    return checkVictory(s);
  }

  if (isNewRound) {
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'SYSTEM',
      message: `Round ${s.round} begins!`,
      emoji: '🔄',
    });
  }

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'SYSTEM',
    message: `${nextPlayer?.name ?? 'Unknown'}'s turn.`,
    emoji: '🎲',
    playerId: nextPlayer?.id,
  });

  return s;
}

function triggerRandomEvent(state: GameState): GameState {
  const player = (state.players ?? [])[state.currentPlayerIndex];
  return drawRandomEvent(state, player);
}

function drawRandomEvent(state: GameState, player: Player | undefined): GameState {
  let s = { ...state };
  let availableEvents = EVENT_DECK.filter((event) =>
    !(s.usedEventIds ?? []).includes(event.id) && isEventConditionMet(s, event.condition, player)
  );
  if (availableEvents.length === 0) {
    s.usedEventIds = [];
    availableEvents = EVENT_DECK.filter((event) => isEventConditionMet(s, event.condition, player));
  }

  const { value: event, nextState: rng } = pickRandom(availableEvents, s.rngState);
  s.rngState = rng;
  if (!event || !player) {
    s.phase = 'PLAYER_ACTION';
    return s;
  }

  s.activeEvent = event;
  s.usedEventIds = [...(s.usedEventIds ?? []), event.id];
  s.phase = 'EVENT_RESOLUTION';
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'EVENT',
    message: `${event.icon} ${event.name}: ${event.description}`,
    emoji: event.icon,
    playerId: player.id,
    highlight: true,
  });
  return s;
}

function isEventConditionMet(state: GameState, condition: EventCondition | undefined, player: Player | undefined): boolean {
  if (!condition) return !!player;
  if (!player) return false;

  switch (condition.type) {
    case 'PLAYER_OWNS_PROPERTIES':
      return (state.properties ?? []).filter((property) => property.ownerId === player.id).length >= condition.minimum;
    case 'PLAYER_HAS_CHARMS':
      return (player.charms ?? []).length >= condition.minimum;
    case 'PLAYER_OWNS_FULL_GROUP':
      return BOARD_SPACES.some((space) =>
        space.type === 'PROPERTY' && !!space.group && playerOwnsFullGroupWithCharms(state, player.id, space.group)
      );
    default:
      return false;
  }
}

function advanceCharmEvolution(state: GameState, playerId: string): GameState {
  let s = { ...state };
  const player = (s.players ?? []).find((candidate) => candidate.id === playerId);
  if (!player) return s;

  const evolvedCharms = (player.charms ?? []).map((charm) => {
    const def = getCharmDef(charm.definitionId);
    const level = charm.level ?? 1;
    const maxLevel = def?.maxLevel ?? 1;
    if (!def?.upgradeable || level >= maxLevel) return charm;

    const turnsHeld = (charm.turnsHeld ?? 0) + 1;
    const threshold = getCharmEvolutionTurns(def);
    if (turnsHeld < threshold) return { ...charm, turnsHeld };

    s.eventLog = addLogEntry(s.eventLog, {
      type: 'CHARM',
      message: `${player.name}'s ${def.icon} ${def.name} evolved to Lv.${level + 1}!`,
      emoji: '✨',
      playerId: player.id,
      highlight: true,
    });
    return { ...charm, level: level + 1, turnsHeld: 0 };
  });

  if (evolvedCharms.some((charm, index) => charm !== player.charms[index])) {
    s.players = updatePlayer(s, player.id, { charms: evolvedCharms });
  }
  return s;
}

function openCharmShop(state: GameState, size?: number, rerolls = 1): GameState {
  let s = { ...state };
  const { result: shuffled, nextState: rng } = shuffleArray(ALL_CHARMS, s.rngState);
  s.rngState = rng;
  const offers = shuffled.slice(0, size ?? s.config?.charmShopSize ?? 4);
  s.charmShop = { offers, rerollsLeft: rerolls, lockedCharmId: null };
  s.charmShopBonus = null;
  s.phase = 'CHARM_SHOP';
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'SYSTEM',
    message: `The Charm Shop opens! Browse the wares...`,
    emoji: '🏪',
    highlight: true,
  });
  return s;
}

function handleOpenCharmShop(state: GameState): GameState {
  if (
    (state.round ?? 1) < CHARM_SHOP_UNLOCK_ROUND ||
    state.charmShop ||
    (state.phase !== 'PLAYER_ACTION' && state.phase !== 'RESOLVE_SPACE')
  ) {
    return state;
  }

  const bonus = state.charmShopBonus;
  return {
    ...openCharmShop(state, bonus?.size, bonus?.rerolls ?? 1),
    shopReturnPhase: state.phase,
    shopOpenedThisTurn: true,
  };
}

function handleBuyCharm(state: GameState, charmId: string): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const def = getCharmDef(charmId);
  if (!def) return s;
  const mods = computeModifiers(player, s, 'PASSIVE');
  const maxSlots = (s.config?.maxCharmSlots ?? 3) + (mods.extraCharmSlots ?? 0);
  if ((player.charms ?? []).length >= maxSlots) return s;
  if ((player.money ?? 0) < (def.cost ?? 0)) return s;

  // Check if non-stackable already owned
  if (!def.stackable && (player.charms ?? []).some((c: OwnedCharm) => c.definitionId === charmId)) {
    return s;
  }

  const instanceId = `charm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newCharm: OwnedCharm = { instanceId, definitionId: charmId, activatedThisTurn: false, level: 1, turnsHeld: 0 };
  const updatedCharms = [...(player.charms ?? []), newCharm];
  const synergies = checkSynergies({ ...player, charms: updatedCharms });

  s.players = updatePlayer(s, player.id, {
    money: (player.money ?? 0) - (def.cost ?? 0),
    charms: updatedCharms,
    activeSynergies: synergies,
  });

  // Remove from shop
  if (s.charmShop) {
    s.charmShop = {
      ...s.charmShop,
      offers: (s.charmShop.offers ?? []).filter((c: any) => c.id !== charmId),
    };
  }

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'CHARM',
    message: `${player.name} bought ${def.icon} ${def.name} for ${def.cost} coins!`,
    emoji: '🛭',
    playerId: player.id,
  });

  // Check new synergies
  const oldSynergies = player.activeSynergies ?? [];
  const newSynergies = synergies.filter((sid: string) => !oldSynergies.includes(sid));
  for (const sid of newSynergies) {
    const syn = SYNERGIES.find((sy: any) => sy.id === sid);
    if (syn) {
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYNERGY',
        message: `SYNERGY DISCOVERED: ${syn.icon} ${syn.name}! ${syn.description}`,
        emoji: '🌟',
        playerId: player.id,
        highlight: true,
      });
    }
  }

  return s;
}

function handleSellCharm(state: GameState, instanceId: string): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const charm = (player.charms ?? []).find((c: OwnedCharm) => c.instanceId === instanceId);
  if (!charm) return s;
  const def = getCharmDef(charm.definitionId);

  const updatedCharms = (player.charms ?? []).filter((c: OwnedCharm) => c.instanceId !== instanceId);
  const synergies = checkSynergies({ ...player, charms: updatedCharms });
  s.players = updatePlayer(s, player.id, {
    money: (player.money ?? 0) + (def?.sellValue ?? 0),
    charms: updatedCharms,
    activeSynergies: synergies,
  });

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'CHARM',
    message: `${player.name} sold ${def?.icon ?? ''} ${def?.name ?? 'a charm'} for ${def?.sellValue ?? 0} coins.`,
    emoji: '💲',
    playerId: player.id,
  });
  return s;
}

function handleRerollShop(state: GameState): GameState {
  let s = { ...state };
  if (!s.charmShop || (s.charmShop.rerollsLeft ?? 0) <= 0) return s;
  const { result: shuffled, nextState: rng } = shuffleArray(ALL_CHARMS, s.rngState);
  s.rngState = rng;
  const shopSize = s.config?.charmShopSize ?? 4;
  const lockedId = s.charmShop.lockedCharmId;
  // Preserve locked charm, fill rest with new offers
  const lockedCharm = lockedId ? ALL_CHARMS.find((c: any) => c.id === lockedId) : null;
  const newOffers = shuffled.filter((c: any) => c.id !== lockedId).slice(0, lockedCharm ? shopSize - 1 : shopSize);
  const offers = lockedCharm ? [lockedCharm, ...newOffers] : newOffers;
  s.charmShop = {
    offers,
    rerollsLeft: (s.charmShop.rerollsLeft ?? 0) - 1,
    lockedCharmId: lockedId,
  };
  return s;
}

function handleUpgradeCharm(state: GameState, instanceId: string): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;
  const charm = (player.charms ?? []).find((c: OwnedCharm) => c.instanceId === instanceId);
  if (!charm) return s;
  const def = getCharmDef(charm.definitionId);
  if (!def || !def.upgradeable) return s;
  const currentLevel = charm.level ?? 1;
  if (currentLevel >= (def.maxLevel ?? 1)) return s;

  const cost = getCharmUpgradeCost(def, currentLevel);
  if ((player.money ?? 0) < cost) return s;

  const updatedCharms = (player.charms ?? []).map((c: OwnedCharm) =>
    c.instanceId === instanceId ? { ...c, level: currentLevel + 1, turnsHeld: 0 } : c
  );
  s.players = updatePlayer(s, player.id, {
    money: (player.money ?? 0) - cost,
    charms: updatedCharms,
  });

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'CHARM',
    message: `${player.name} upgraded ${def.icon} ${def.name} to Lv.${currentLevel + 1} for ${cost} coins!`,
    emoji: '⬆️',
    playerId: player.id,
    highlight: true,
  });
  return s;
}

function handleLockShopItem(state: GameState, charmId: string): GameState {
  let s = { ...state };
  if (!s.charmShop) return s;
  // Toggle lock
  const currentLock = s.charmShop.lockedCharmId;
  s.charmShop = {
    ...s.charmShop,
    lockedCharmId: currentLock === charmId ? null : charmId,
  };
  return s;
}

function handleResolveEvent(state: GameState): GameState {
  let s = { ...state };
  const evt = s.activeEvent;
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!evt || !player) { s.phase = 'PLAYER_ACTION'; return s; }

  if (!isEventConditionMet(s, evt.condition, player)) {
    s.activeEvent = null;
    s.phase = 'PLAYER_ACTION';
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'EVENT',
      message: `${evt.name} had no effect because its condition was not met.`,
      emoji: '↩️',
      playerId: player.id,
    });
    return s;
  }

  if (evt.effect?.type === 'MONEY_DELTA') {
    s.players = updatePlayer(s, player.id, { money: Math.max(0, (player.money ?? 0) + evt.effect.amount) });
    s.activeEvent = null;
    s.phase = 'PLAYER_ACTION';
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'EVENT',
      message: evt.effect.successMessage.replace('{player}', player.name),
      emoji: evt.icon,
      playerId: player.id,
      highlight: true,
    });
    return s;
  }

  switch (evt.id) {
    case 'market-crash':
      // Stays active for one round (handled in rent calc)
      break;
    case 'bank-error':
      s.players = (s.players ?? []).map((p: Player) =>
        p.isAlive ? { ...p, money: (p.money ?? 0) + 150 } : p
      );
      s.activeEvent = null;
      break;
    case 'hostile-takeover': {
      // Richest player loses random property
      const alivePlayers = (s.players ?? []).filter((p: Player) => p.isAlive);
      const richest = alivePlayers.reduce((a: Player, b: Player) =>
        (calculateNetWorth(s, a) > calculateNetWorth(s, b)) ? a : b,
        alivePlayers[0]
      );
      if (richest) {
        const ownedProps = (s.properties ?? []).filter((p: Property) => p.ownerId === richest.id);
        if (ownedProps.length > 0) {
          const { value: lostProp, nextState: rng } = pickRandom(ownedProps, s.rngState);
          s.rngState = rng;
          if (lostProp) {
            s.properties = updateProperty(s, lostProp.spaceIndex, { ownerId: null, tier: 0, mortgaged: false });
            const lostSpace = getSpace(lostProp.spaceIndex);
            s.eventLog = addLogEntry(s.eventLog, {
              type: 'EVENT',
              message: `${richest.name} lost ${lostSpace?.name ?? 'a property'} to the Hostile Takeover!`,
              emoji: '🦈',
              playerId: richest.id,
              highlight: true,
            });
          }
        }
      }
      s.activeEvent = null;
      break;
    }
    case 'golden-hour':
      // Stays active until next purchase
      break;
    case 'chaos-tax': {
      s.players = (s.players ?? []).map((p: Player) => {
        if (!p.isAlive) return p;
        const r = randomInt(s.rngState, 50, 200);
        s.rngState = r.nextState;
        return { ...p, money: Math.max(0, (p.money ?? 0) - r.value) };
      });
      s.activeEvent = null;
      break;
    }
    case 'fire-sale':
      // Stays active for the round
      break;
    case 'property-boom':
      // Stays active for the round (handled in rent calc)
      break;
    case 'cursed-ground':
      // Stays active for the round (handled in upgrade cost)
      break;
    case 'tax-holiday':
      // Stays active for the round (handled in tax resolution)
      break;
    case 'charity-ball': {
      const alivePlayers2 = (s.players ?? []).filter((p: Player) => p.isAlive);
      if (alivePlayers2.length >= 2) {
        const sorted = [...alivePlayers2].sort((a: Player, b: Player) => (b.money ?? 0) - (a.money ?? 0));
        const richest2 = sorted[0];
        const poorest2 = sorted[sorted.length - 1];
        if (richest2 && poorest2 && richest2.id !== poorest2.id) {
          s.players = updatePlayer(s, richest2.id, { money: (richest2.money ?? 0) - 100 });
          s.players = updatePlayer({ ...s, players: s.players }, poorest2.id, { money: (poorest2.money ?? 0) + 100 });
          s.eventLog = addLogEntry(s.eventLog, {
            type: 'EVENT',
            message: `${richest2.name} donates 100 coins to ${poorest2.name} at the Charity Ball!`,
            emoji: '🎭',
            highlight: true,
          });
        }
      }
      s.activeEvent = null;
      break;
    }
    case 'lucky-windfall': {
      s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + 200 });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'EVENT',
        message: `${player.name} found 200 coins in an old vault!`,
        emoji: '💰',
        playerId: player.id,
        highlight: true,
      });
      s.activeEvent = null;
      break;
    }
    case 'housing-crisis': {
      (s.properties ?? []).forEach((prop: Property) => {
        if (prop.ownerId && (prop.tier ?? 0) >= 1) {
          s.properties = updateProperty(s, prop.spaceIndex, { tier: (prop.tier ?? 0) - 1 });
        }
      });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'EVENT',
        message: `Housing Crisis! All upgraded properties lose one tier!`,
        emoji: '🏚️',
        highlight: true,
      });
      s.activeEvent = null;
      break;
    }
    case 'charm-surge': {
      s.charmShopBonus = { size: 6, rerolls: 2 };
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'EVENT',
        message: `Charm Surge! The Charm Shop is available with extra wares.`,
        emoji: '✨',
        highlight: true,
      });
      s.activeEvent = null;
      break;
    }
    case 'earthquake': {
      (s.players ?? []).forEach((p: Player) => {
        if (!p.isAlive) return;
        const ownedProps = (s.properties ?? []).filter((pr: Property) => pr.ownerId === p.id && (pr.tier ?? 0) > 0);
        if (ownedProps.length > 0) {
          const { value: hitProp, nextState: rng3 } = pickRandom(ownedProps, s.rngState);
          s.rngState = rng3;
          if (hitProp) {
            s.properties = updateProperty(s, hitProp.spaceIndex, { tier: (hitProp.tier ?? 0) - 1 });
            const hitSpace = getSpace(hitProp.spaceIndex);
            s.eventLog = addLogEntry(s.eventLog, {
              type: 'EVENT',
              message: `Earthquake damaged ${p.name}'s ${hitSpace?.name ?? 'property'}!`,
              emoji: '🌋',
              playerId: p.id,
            });
          }
        }
      });
      s.activeEvent = null;
      break;
    }
    default:
      s.activeEvent = null;
  }

  s.phase = 'PLAYER_ACTION';
  return s;
}

function handleRiskChoose(state: GameState, safe: boolean): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player || !s.riskChoice) { s.phase = 'PLAYER_ACTION'; return s; }

  if (safe) {
    s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + s.riskChoice.safeReward });
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'SYSTEM',
      message: `${player.name} plays it safe and receives ${s.riskChoice.safeReward} coins.`,
      emoji: '✅',
      playerId: player.id,
    });
  } else {
    const r = nextRng(s.rngState);
    s.rngState = r.nextState;
    if (r.value < (s.riskChoice.gambleChance ?? 0.4)) {
      s.players = updatePlayer(s, player.id, { money: (player.money ?? 0) + s.riskChoice.gambleReward });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${player.name} gambled and WON ${s.riskChoice.gambleReward} coins!`,
        emoji: '🎉',
        playerId: player.id,
        highlight: true,
      });
    } else {
      const loss = Math.floor(s.riskChoice.safeReward / 2);
      s.players = updatePlayer(s, player.id, { money: Math.max(0, (player.money ?? 0) - loss) });
      s.eventLog = addLogEntry(s.eventLog, {
        type: 'SYSTEM',
        message: `${player.name} gambled and LOST ${loss} coins!`,
        emoji: '💥',
        playerId: player.id,
        highlight: true,
      });
    }
  }

  s.riskChoice = null;
  s.phase = 'PLAYER_ACTION';
  return s;
}

function handlePayJailFine(state: GameState): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player || (player.turnsInJail ?? 0) <= 0) return s;
  if ((player.money ?? 0) < 50) return s;

  s.players = updatePlayer(s, player.id, { turnsInJail: 0, money: (player.money ?? 0) - 50 });
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'SYSTEM',
    message: `${player.name} paid 50 coins to get out of jail.`,
    emoji: '🔓',
    playerId: player.id,
  });
  s.phase = 'ROLL_DICE';
  return s;
}

function handleProposeTrade(state: GameState, offer: Omit<TradeOffer, 'status'>): GameState {
  let s = { ...state };
  if (!isValidTradeOffer(s, offer)) return s;
  s.tradeOffer = { ...offer, status: 'pending', counterCount: 0 };
  s.tradeProposedThisTurn = true;
  s.phase = 'TRADING';
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'TRADE',
    message: `${(s.players ?? []).find((p: Player) => p.id === offer.fromPlayerId)?.name ?? 'Someone'} proposed a trade to ${(s.players ?? []).find((p: Player) => p.id === offer.toPlayerId)?.name ?? 'someone'}!`,
    emoji: '🤝',
  });
  return s;
}

function handleCounterTrade(state: GameState, offer: Omit<TradeOffer, 'status' | 'counterCount'>): GameState {
  const previous = state.tradeOffer;
  if (!previous || previous.status !== 'pending' || (previous.counterCount ?? 0) >= 2 || !isValidTradeOffer(state, offer)) return state;

  return {
    ...state,
    tradeOffer: { ...offer, status: 'pending', counterCount: (previous.counterCount ?? 0) + 1 },
    phase: 'TRADING',
    eventLog: addLogEntry(state.eventLog, {
      type: 'TRADE',
      message: `A counter-offer was proposed.`,
      emoji: '🔁',
    }),
  };
}

function handleRespondTrade(state: GameState, accept: boolean): GameState {
  let s = { ...state };
  const offer = s.tradeOffer;
  if (!offer) { s.phase = 'PLAYER_ACTION'; return s; }

  if (!accept) {
    s.tradeOffer = null;
    s.phase = 'PLAYER_ACTION';
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'TRADE',
      message: `Trade rejected!`,
      emoji: '❌',
    });
    return s;
  }

  // Revalidate at acceptance time because money, ownership, or player status may
  // have changed while the offer was waiting for a response.
  if (!isValidTradeOffer(s, offer)) {
    s.tradeOffer = null;
    s.phase = 'PLAYER_ACTION';
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'TRADE',
      message: `Trade expired because its assets or amounts were no longer valid.`,
      emoji: '⚠️',
    });
    return s;
  }

  const from = (s.players ?? []).find((p: Player) => p.id === offer.fromPlayerId);
  const to = (s.players ?? []).find((p: Player) => p.id === offer.toPlayerId);
  if (!from || !to) { s.tradeOffer = null; s.phase = 'PLAYER_ACTION'; return s; }

  // Transfer money
  s.players = (s.players ?? []).map((p: Player) => {
    if (p.id === from.id) return { ...p, money: (p.money ?? 0) - (offer.giveMoney ?? 0) + (offer.receiveMoney ?? 0) };
    if (p.id === to.id) return { ...p, money: (p.money ?? 0) + (offer.giveMoney ?? 0) - (offer.receiveMoney ?? 0) };
    return p;
  });

  // Transfer properties
  for (const si of (offer.giveProperties ?? [])) {
    s.properties = updateProperty(s, si, { ownerId: to.id });
  }
  for (const si of (offer.receiveProperties ?? [])) {
    s.properties = updateProperty(s, si, { ownerId: from.id });
  }

  // Transfer charms
  if ((offer.giveCharms ?? []).length > 0 || (offer.receiveCharms ?? []).length > 0) {
    const fromPlayer = (s.players ?? []).find((p: Player) => p.id === from.id);
    const toPlayer = (s.players ?? []).find((p: Player) => p.id === to.id);
    if (fromPlayer && toPlayer) {
      let fromCharms = [...(fromPlayer.charms ?? [])];
      let toCharms = [...(toPlayer.charms ?? [])];

      for (const cid of (offer.giveCharms ?? [])) {
        const idx = fromCharms.findIndex((c: OwnedCharm) => c.instanceId === cid);
        if (idx >= 0) {
          toCharms.push(fromCharms[idx]);
          fromCharms.splice(idx, 1);
        }
      }
      for (const cid of (offer.receiveCharms ?? [])) {
        const idx = toCharms.findIndex((c: OwnedCharm) => c.instanceId === cid);
        if (idx >= 0) {
          fromCharms.push(toCharms[idx]);
          toCharms.splice(idx, 1);
        }
      }

      s.players = (s.players ?? []).map((p: Player) => {
        if (p.id === from.id) return { ...p, charms: fromCharms, activeSynergies: checkSynergies({ ...p, charms: fromCharms }) };
        if (p.id === to.id) return { ...p, charms: toCharms, activeSynergies: checkSynergies({ ...p, charms: toCharms }) };
        return p;
      });
    }
  }

  s.tradeOffer = null;
  s.phase = 'PLAYER_ACTION';
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'TRADE',
    message: `Trade completed between ${from.name} and ${to.name}!`,
    emoji: '✅',
    highlight: true,
  });
  return s;
}

function isValidTradeOffer(state: GameState, offer: Omit<TradeOffer, 'status'> | TradeOffer): boolean {
  const from = (state.players ?? []).find((p: Player) => p.id === offer.fromPlayerId);
  const to = (state.players ?? []).find((p: Player) => p.id === offer.toPlayerId);
  const giveMoney = offer.giveMoney ?? 0;
  const receiveMoney = offer.receiveMoney ?? 0;
  const giveProperties = offer.giveProperties ?? [];
  const receiveProperties = offer.receiveProperties ?? [];
  const giveCharms = offer.giveCharms ?? [];
  const receiveCharms = offer.receiveCharms ?? [];

  if (!from || !to || from.id === to.id || !from.isAlive || !to.isAlive) return false;
  if (![giveMoney, receiveMoney].every((amount) => Number.isInteger(amount) && amount >= 0)) return false;
  if (giveMoney > (from.money ?? 0) || receiveMoney > (to.money ?? 0)) return false;

  const unique = <T,>(items: T[]) => new Set(items).size === items.length;
  if (!unique(giveProperties) || !unique(receiveProperties) || !unique(giveCharms) || !unique(receiveCharms)) return false;
  if (giveProperties.some((index) => receiveProperties.includes(index))) return false;
  if (giveCharms.some((id) => receiveCharms.includes(id))) return false;

  if (giveProperties.some((index) => getProperty(state, index)?.ownerId !== from.id)) return false;
  if (receiveProperties.some((index) => getProperty(state, index)?.ownerId !== to.id)) return false;
  if (giveCharms.some((id) => !(from.charms ?? []).some((charm) => charm.instanceId === id))) return false;
  if (receiveCharms.some((id) => !(to.charms ?? []).some((charm) => charm.instanceId === id))) return false;

  const fromSlots = (state.config?.maxCharmSlots ?? 3) + (computeModifiers(from, state, 'PASSIVE').extraCharmSlots ?? 0);
  const toSlots = (state.config?.maxCharmSlots ?? 3) + (computeModifiers(to, state, 'PASSIVE').extraCharmSlots ?? 0);
  if ((from.charms ?? []).length - giveCharms.length + receiveCharms.length > fromSlots) return false;
  if ((to.charms ?? []).length - receiveCharms.length + giveCharms.length > toSlots) return false;

  return true;
}

function handleDeclareBankruptcy(state: GameState): GameState {
  let s = { ...state };
  const player = (s.players ?? [])[s.currentPlayerIndex];
  if (!player) return s;

  // Check second chance charm
  const mods = computeModifiers(player, s, 'ON_BANKRUPTCY');
  if (mods.bankruptcySave) {
    const secondChanceIdx = (player.charms ?? []).findIndex((c: OwnedCharm) => c.definitionId === 'second-chance');
    let updatedCharms = [...(player.charms ?? [])];
    if (secondChanceIdx >= 0) {
      updatedCharms.splice(secondChanceIdx, 1);
    }
    s.players = updatePlayer(s, player.id, {
      money: 200,
      charms: updatedCharms,
      activeSynergies: checkSynergies({ ...player, charms: updatedCharms }),
    });
    s.eventLog = addLogEntry(s.eventLog, {
      type: 'CHARM_EFFECT',
      message: `${player.name} used Second Chance and survived with 200 coins!`,
      emoji: '💫',
      playerId: player.id,
      highlight: true,
    });
    s.bankruptcyDebt = 0;
    s.bankruptcyCreditorId = null;
    s.phase = 'PLAYER_ACTION';
    return s;
  }

  // Actually bankrupt
  s.players = updatePlayer(s, player.id, { isAlive: false, money: 0, charms: [] });
  // Transfer remaining properties to the creditor, or return them to the bank
  // when the debt was owed to the bank (for example, unpaid tax).
  const creditorId = s.bankruptcyCreditorId;
  s.properties = (s.properties ?? []).map((p: Property) =>
    p.ownerId === player.id ? { ...p, ownerId: creditorId ?? null, tier: creditorId ? p.tier : 0, mortgaged: creditorId ? p.mortgaged : false } : p
  );
  s.bankruptcyDebt = 0;
  s.bankruptcyCreditorId = null;

  s.eventLog = addLogEntry(s.eventLog, {
    type: 'BANKRUPTCY',
    message: `${player.name} has gone BANKRUPT!`,
    emoji: '💣',
    playerId: player.id,
    highlight: true,
  });

  // Check if game over
  if (countAlivePlayers(s) <= 1) {
    return checkVictory(s);
  }

  s.phase = 'PLAYER_ACTION';
  return s;
}

function handleActivateCharm(state: GameState, instanceId: string): GameState {
  const player = (state.players ?? [])[state.currentPlayerIndex];
  const charm = player?.charms?.find((candidate) => candidate.instanceId === instanceId);
  const def = charm ? getCharmDef(charm.definitionId) : null;
  if (!player || !charm || !def || def.trigger !== 'ACTIVE' || (charm.usesRemaining ?? 1) <= 0) return state;

  if (def.id === 'time-traveller' && player.previousPosition != null && player.previousPosition !== player.position) {
    const players = (state.players ?? []).map((candidate) => candidate.id === player.id
      ? { ...candidate, position: player.previousPosition as number, charms: candidate.charms.map((owned) => owned.instanceId === instanceId ? { ...owned, usesRemaining: 0, activatedThisTurn: true } : owned) }
      : candidate);
    return {
      ...state,
      players,
      phase: 'PLAYER_ACTION',
      eventLog: addLogEntry(state.eventLog, {
        type: 'CHARM_EFFECT',
        message: `${player.name} used Time Traveller and returned to their previous space.`,
        emoji: '⏳',
        playerId: player.id,
        highlight: true,
      }),
    };
  }

  if (def.id === 'fortune-flare') {
    const players = (state.players ?? []).map((candidate) => candidate.id === player.id
      ? { ...candidate, money: candidate.money + 200, charms: candidate.charms.map((owned) => owned.instanceId === instanceId ? { ...owned, usesRemaining: 0, activatedThisTurn: true } : owned) }
      : candidate);
    return {
      ...state,
      players,
      phase: 'PLAYER_ACTION',
      eventLog: addLogEntry(state.eventLog, { type: 'CHARM_EFFECT', message: `${player.name} activated Fortune Flare and gained 200 coins.`, emoji: '🌠', playerId: player.id, highlight: true }),
    };
  }

  if (def.id === 'lucky-dash') {
    const players = (state.players ?? []).map((candidate) => candidate.id === player.id
      ? { ...candidate, activeDiceBonus: (candidate.activeDiceBonus ?? 0) + 2, charms: candidate.charms.map((owned) => owned.instanceId === instanceId ? { ...owned, usesRemaining: 0, activatedThisTurn: true } : owned) }
      : candidate);
    return {
      ...state,
      players,
      phase: 'PLAYER_ACTION',
      eventLog: addLogEntry(state.eventLog, { type: 'CHARM_EFFECT', message: `${player.name} activated Lucky Dash for +2 on the next roll.`, emoji: '👟', playerId: player.id, highlight: true }),
    };
  }

  if (def.id === 'rent-shield') {
    const players = (state.players ?? []).map((candidate) => candidate.id === player.id
      ? { ...candidate, activeRentShield: true, charms: candidate.charms.map((owned) => owned.instanceId === instanceId ? { ...owned, usesRemaining: 0, activatedThisTurn: true } : owned) }
      : candidate);
    return {
      ...state,
      players,
      phase: 'PLAYER_ACTION',
      eventLog: addLogEntry(state.eventLog, { type: 'CHARM_EFFECT', message: `${player.name} activated Rent Shield for the next rent payment.`, emoji: '🛡️', playerId: player.id, highlight: true }),
    };
  }

  return state;
}

function handlePlayerLeft(state: GameState, playerId: string): GameState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || !player.isAlive) return state;

  const nextState: GameState = {
    ...state,
    players: state.players.map((candidate) => candidate.id === playerId ? { ...candidate, isAlive: false, charms: [], money: 0 } : candidate),
    properties: state.properties.map((property) => property.ownerId === playerId ? { ...property, ownerId: null, tier: 0, mortgaged: false } : property),
    tradeOffer: state.tradeOffer && (state.tradeOffer.fromPlayerId === playerId || state.tradeOffer.toPlayerId === playerId) ? null : state.tradeOffer,
    eventLog: addLogEntry(state.eventLog, { type: 'SYSTEM', message: `${player.name} left the game and forfeited their assets.`, emoji: '🚪', playerId, highlight: true }),
  };

  if (countAlivePlayers(nextState) <= 1) return checkVictory(nextState);
  if (state.currentPlayerIndex === state.players.findIndex((candidate) => candidate.id === playerId)) {
    nextState.currentPlayerIndex = nextAlivePlayer(nextState);
    nextState.phase = 'ROLL_DICE';
    nextState.diceResult = null;
  }
  return nextState;
}

function checkVictory(state: GameState): GameState {
  let s = { ...state };
  const alive = (s.players ?? []).filter((p: Player) => p.isAlive);

  if (alive.length === 1) {
    s.winner = alive[0]?.id ?? null;
  } else if (alive.length > 1) {
    // Most net worth wins
    const sorted = [...alive].sort(
      (a: Player, b: Player) => calculateNetWorth(s, b) - calculateNetWorth(s, a)
    );
    s.winner = sorted[0]?.id ?? null;
  }

  s.phase = 'GAME_OVER';
  const winnerPlayer = (s.players ?? []).find((p: Player) => p.id === s.winner);
  s.eventLog = addLogEntry(s.eventLog, {
    type: 'VICTORY',
    message: `${winnerPlayer?.name ?? 'Someone'} wins the game!`,
    emoji: '🏆',
    playerId: s.winner ?? undefined,
    highlight: true,
  });
  return s;
}

export { calculateNetWorth };
