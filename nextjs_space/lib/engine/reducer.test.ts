import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, gameReducer } from './reducer';
import { GameState, OwnedCharm } from './types';
import { chooseAIAction } from './ai';
import { EVENT_DECK } from './event-deck';

const charm: OwnedCharm = {
  instanceId: 'charm-test',
  definitionId: 'lucky-seven',
  activatedThisTurn: false,
  level: 1,
};

test('all-AI local games are rejected', () => {
  assert.throws(
    () => createInitialState(
      ['AI One', 'AI Two'],
      123,
      undefined,
      undefined,
      [
        { enabled: true, personality: 'cautious' },
        { enabled: true, personality: 'random' },
      ],
    ),
    /at least one human player/i,
  );
});

test('Charm Shop stays locked before round 5', () => {
  const state = { ...createInitialState(['A', 'B']), round: 4, phase: 'PLAYER_ACTION' as const };
  const next = gameReducer(state, { type: 'OPEN_SHOP' });

  assert.equal(next.charmShop, null);
  assert.equal(next.phase, 'PLAYER_ACTION');
});

test('Charm Shop can be opened from round 5', () => {
  const state = { ...createInitialState(['A', 'B']), round: 5, phase: 'PLAYER_ACTION' as const };
  const next = gameReducer(state, { type: 'OPEN_SHOP' });

  assert.equal(next.phase, 'CHARM_SHOP');
  assert.equal(next.charmShop?.offers.length, 4);
});

test('bankruptcy cannot continue until the debt is covered', () => {
  const initial = createInitialState(['A', 'B']);
  const state = {
    ...initial,
    phase: 'BANKRUPTCY' as const,
    bankruptcyDebt: 100,
    bankruptcyCreditorId: 'player-1',
    players: initial.players.map((player) => ({
      ...player,
      money: player.id === 'player-0' ? 50 : 0,
    })),
  };

  const blocked = gameReducer(state, { type: 'END_TURN' });
  assert.equal(blocked.phase, 'BANKRUPTCY');

  const settled = gameReducer({ ...state, players: state.players.map((player) => player.id === 'player-0' ? { ...player, money: 125 } : player) }, { type: 'END_TURN' });
  assert.equal(settled.phase, 'PLAYER_ACTION');
  assert.equal(settled.players[0].money, 25);
  assert.equal(settled.players[1].money, 100);
});

test('accepted trades transfer charms between players', () => {
  const initial = createInitialState(['A', 'B']);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    players: initial.players.map((player) => player.id === 'player-0' ? { ...player, charms: [charm] } : player),
  };
  const proposed = gameReducer(state, {
    type: 'PROPOSE_TRADE',
    offer: {
      fromPlayerId: 'player-0',
      toPlayerId: 'player-1',
      giveMoney: 0,
      giveProperties: [],
      giveCharms: [charm.instanceId],
      receiveMoney: 0,
      receiveProperties: [],
      receiveCharms: [],
    },
  });
  const completed = gameReducer(proposed, { type: 'RESPOND_TRADE', accept: true });

  assert.equal(completed.tradeOffer, null);
  assert.equal(completed.players[0].charms.length, 0);
  assert.equal(completed.players[1].charms[0].instanceId, charm.instanceId);
});

test('upgradeable charms evolve after being held for three completed turns', () => {
  const initial = createInitialState(['A', 'B']);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    players: initial.players.map((player) => player.id === 'player-0'
      ? { ...player, charms: [{ ...charm, definitionId: 'lucky-penny', turnsHeld: 0 }] }
      : player),
  };

  let next: GameState = state;
  for (let index = 0; index < 5; index += 1) {
    next = gameReducer(next, { type: 'END_TURN' });
  }

  assert.equal(next.players[0].charms[0].level, 2);
  assert.equal(next.players[0].charms[0].turnsHeld, 0);
  assert.ok(next.eventLog.some((entry) => entry.message.includes('evolved to Lv.2')));
});

test('conditional charm event rewards an eligible player', () => {
  const initial = createInitialState(['A', 'B']);
  const event = EVENT_DECK.find((candidate) => candidate.id === 'charm-bounty');
  const state = {
    ...initial,
    phase: 'EVENT_RESOLUTION' as const,
    activeEvent: event ?? null,
    players: initial.players.map((player) => player.id === 'player-0'
      ? { ...player, money: 100, charms: [charm, { ...charm, instanceId: 'charm-test-2', definitionId: 'lucky-penny' }] }
      : player),
  };

  const next = gameReducer(state, { type: 'RESOLVE_EVENT' });

  assert.equal(next.players[0].money, 300);
  assert.equal(next.activeEvent, null);
  assert.equal(next.phase, 'PLAYER_ACTION');
});

test('round-start events return the active player to the dice phase', () => {
  const initial = createInitialState(['A', 'B']);
  const state = {
    ...initial,
    phase: 'EVENT_RESOLUTION' as const,
    activeEvent: EVENT_DECK.find((candidate) => candidate.id === 'market-crash') ?? null,
    eventReturnPhase: 'ROLL_DICE' as const,
  };

  const next = gameReducer(state, { type: 'RESOLVE_EVENT' });

  assert.equal(next.phase, 'ROLL_DICE');
  assert.equal(next.eventReturnPhase, null);
});

test('AI chooses to roll only for the active AI player', () => {
  const initial = createInitialState(['AI', 'Human'], undefined, { aiDifficulty: 'medium' }, undefined, [
    { enabled: true, personality: 'cautious' },
    { enabled: false, personality: 'random' },
  ]);
  assert.deepEqual(chooseAIAction(initial), { type: 'ROLL_DICE' });
  assert.equal(chooseAIAction({ ...initial, players: initial.players.map((player) => ({ ...player, isAI: false })) }), null);
});

test('AI can initiate a trade without repeatedly reopening offers', () => {
  const initial = createInitialState(['AI', 'Human'], undefined, { aiDifficulty: 'medium' }, undefined, [
    { enabled: true, personality: 'aggressive' },
    { enabled: false, personality: 'cautious' },
  ]);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    rngState: 3,
    properties: initial.properties.map((property) => property.spaceIndex === 1 ? { ...property, ownerId: 'player-1' } : property),
  };
  const action = chooseAIAction(state);

  assert.equal(action?.type, 'PROPOSE_TRADE');
  const pending = gameReducer(state, action!);
  assert.equal(pending.phase, 'TRADING');
  assert.equal(chooseAIAction(pending), null);
});

test('Time Traveller can be activated once to return to the previous space', () => {
  const traveller: OwnedCharm = { ...charm, instanceId: 'traveller', definitionId: 'time-traveller' };
  const initial = createInitialState(['A', 'B']);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    players: initial.players.map((player) => player.id === 'player-0'
      ? { ...player, position: 8, previousPosition: 3, charms: [traveller] }
      : player),
  };
  const next = gameReducer(state, { type: 'ACTIVATE_CHARM', instanceId: traveller.instanceId });

  assert.equal(next.players[0].position, 3);
  assert.equal(next.players[0].charms[0].usesRemaining, 0);
  assert.equal(gameReducer(next, { type: 'ACTIVATE_CHARM', instanceId: traveller.instanceId }).players[0].position, 3);
});

test('AI liquidates assets before declaring bankruptcy', () => {
  const initial = createInitialState(['AI', 'B']);
  const state = {
    ...initial,
    phase: 'BANKRUPTCY' as const,
    bankruptcyDebt: 500,
    players: initial.players.map((player) => player.id === 'player-0' ? { ...player, isAI: true, money: 0 } : player),
    properties: initial.properties.map((property) => property.spaceIndex === 1 ? { ...property, ownerId: 'player-0', tier: 1 } : property),
  };
  assert.deepEqual(chooseAIAction(state), { type: 'SELL_UPGRADE', spaceIndex: 1 });
});

test('difficulty changes purchase discipline and risk tolerance', () => {
  const base = createInitialState(['AI', 'B'], undefined, { aiDifficulty: 'easy' }, undefined, [
    { enabled: true, personality: 'cautious' },
    { enabled: false, personality: 'cautious' },
  ]);
  const purchaseState = {
    ...base,
    phase: 'RESOLVE_SPACE' as const,
    rngState: 4,
    players: base.players.map((player) => player.id === 'player-0' ? { ...player, position: 1, money: 1000 } : player),
  };
  assert.deepEqual(chooseAIAction(purchaseState), { type: 'END_TURN' });
  assert.deepEqual(chooseAIAction({ ...purchaseState, config: { ...purchaseState.config, aiDifficulty: 'hard' } }), { type: 'BUY_PROPERTY' });

  const riskState = {
    ...purchaseState,
    phase: 'RISK_CHOICE' as const,
    riskChoice: { safeReward: 100, gambleReward: 400, gambleChance: 0.5 },
  };
  assert.deepEqual(chooseAIAction(riskState), { type: 'RISK_CHOOSE', safe: true });
  assert.deepEqual(chooseAIAction({ ...riskState, config: { ...riskState.config, aiDifficulty: 'hard' } }), { type: 'RISK_CHOOSE', safe: false });
});

test('active charms apply their effects once', () => {
  const initial = createInitialState(['A', 'B']);
  const activeIds = ['fortune-flare', 'lucky-dash', 'rent-shield'];
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    players: initial.players.map((player) => player.id === 'player-0'
      ? {
          ...player,
          money: 100,
          charms: activeIds.map((definitionId, index) => ({ instanceId: `active-${index}`, definitionId, activatedThisTurn: false, level: 1 })),
        }
      : player),
  };
  const fortune = gameReducer(state, { type: 'ACTIVATE_CHARM', instanceId: 'active-0' });
  assert.equal(fortune.players[0].money, 300);
  const dash = gameReducer(fortune, { type: 'ACTIVATE_CHARM', instanceId: 'active-1' });
  assert.equal(dash.players[0].activeDiceBonus, 2);
  const shield = gameReducer(dash, { type: 'ACTIVATE_CHARM', instanceId: 'active-2' });
  assert.equal(shield.players[0].activeRentShield, true);
  assert.equal(gameReducer(shield, { type: 'ACTIVATE_CHARM', instanceId: 'active-0' }).players[0].money, 300);
});

test('AI prioritizes a property that completes its group', () => {
  const initial = createInitialState(['AI', 'B'], undefined, { aiDifficulty: 'hard' }, undefined, [
    { enabled: true, personality: 'cautious' },
    { enabled: false, personality: 'cautious' },
  ]);
  const state = {
    ...initial,
    phase: 'RESOLVE_SPACE' as const,
    players: initial.players.map((player) => player.id === 'player-0' ? { ...player, position: 3, money: 1000 } : player),
    properties: initial.properties.map((property) => property.spaceIndex === 1 ? { ...property, ownerId: 'player-0' } : property),
  };
  assert.deepEqual(chooseAIAction(state), { type: 'BUY_PROPERTY' });
});

test('AI can build a multi-asset trade when cash is insufficient', () => {
  const initial = createInitialState(['AI', 'B'], undefined, { aiDifficulty: 'hard' }, undefined, [
    { enabled: true, personality: 'aggressive' },
    { enabled: false, personality: 'cautious' },
  ]);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    rngState: 4,
    players: initial.players.map((player) => player.id === 'player-0'
      ? { ...player, money: 250, charms: [charm] }
      : player),
    properties: initial.properties.map((property) => {
      if (property.spaceIndex === 1) return { ...property, ownerId: 'player-0' };
      if (property.spaceIndex === 3) return { ...property, ownerId: 'player-1' };
      return property;
    }),
  };
  const action = chooseAIAction(state);
  assert.equal(action?.type, 'PROPOSE_TRADE');
  if (action?.type === 'PROPOSE_TRADE') {
    assert.deepEqual(action.offer.receiveProperties, [3]);
    assert.deepEqual(action.offer.giveCharms, [charm.instanceId]);
  }
});

test('properties mortgage instead of being sold to the bank', () => {
  const initial = createInitialState(['A', 'B']);
  const owned = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    players: initial.players.map((player) => player.id === 'player-0' ? { ...player, money: 1000 } : player),
    properties: initial.properties.map((property) => property.spaceIndex === 1 ? { ...property, ownerId: 'player-0', tier: 0 } : property),
  };
  const mortgaged = gameReducer(owned, { type: 'MORTGAGE_PROPERTY', spaceIndex: 1 });
  assert.equal(mortgaged.properties.find((property) => property.spaceIndex === 1)?.ownerId, 'player-0');
  assert.equal(mortgaged.properties.find((property) => property.spaceIndex === 1)?.mortgaged, true);
  assert.equal(mortgaged.players[0].money, 1030);

  const unmortgaged = gameReducer(mortgaged, { type: 'UNMORTGAGE_PROPERTY', spaceIndex: 1 });
  assert.equal(unmortgaged.properties.find((property) => property.spaceIndex === 1)?.mortgaged, false);
  assert.equal(unmortgaged.players[0].money, 997);
});

test('property upgrades can be sold for half their original cost', () => {
  const initial = createInitialState(['A', 'B']);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    players: initial.players.map((player) => player.id === 'player-0' ? { ...player, money: 0 } : player),
    properties: initial.properties.map((property) => property.spaceIndex === 1 ? { ...property, ownerId: 'player-0', tier: 1 } : property),
  };
  const next = gameReducer(state, { type: 'SELL_UPGRADE', spaceIndex: 1 });
  assert.equal(next.properties.find((property) => property.spaceIndex === 1)?.tier, 0);
  assert.equal(next.players[0].money, 25);
});

test('AI counters an undervalued trade before accepting or rejecting it', () => {
  const initial = createInitialState(['Human', 'AI'], undefined, { aiDifficulty: 'hard' }, undefined, [
    { enabled: false, personality: 'cautious' },
    { enabled: true, personality: 'cautious' },
  ]);
  const state = {
    ...initial,
    phase: 'PLAYER_ACTION' as const,
    properties: initial.properties.map((property) => property.spaceIndex === 1 ? { ...property, ownerId: 'player-1' } : property),
  };
  const proposed = gameReducer(state, {
    type: 'PROPOSE_TRADE',
    offer: {
      fromPlayerId: 'player-0',
      toPlayerId: 'player-1',
      giveMoney: 1,
      giveProperties: [],
      giveCharms: [],
      receiveMoney: 0,
      receiveProperties: [1],
      receiveCharms: [],
    },
  });
  const counterAction = chooseAIAction(proposed);
  assert.equal(counterAction?.type, 'COUNTER_TRADE');
  const countered = gameReducer(proposed, counterAction!);
  assert.equal(countered.tradeOffer?.counterCount, 1);
  assert.equal(countered.tradeOffer?.fromPlayerId, 'player-1');
  const completed = gameReducer(countered, { type: 'RESPOND_TRADE', accept: true });
  assert.equal(completed.tradeOffer, null);
});
