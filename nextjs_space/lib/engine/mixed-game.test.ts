import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseAIAction } from './ai';
import { BOARD_SPACES } from './board-data';
import { createInitialState, gameReducer } from './reducer';
import { GameAction, GameState, Player } from './types';

function scriptedHumanAction(state: GameState): GameAction {
  const player = state.players[state.currentPlayerIndex];

  if (state.phase === 'ROLL_DICE') return { type: 'ROLL_DICE' };
  if (state.phase === 'EVENT_RESOLUTION') return { type: 'RESOLVE_EVENT' };
  if (state.phase === 'RISK_CHOICE') return { type: 'RISK_CHOOSE', safe: true };
  if (state.phase === 'CHARM_SHOP') return { type: 'CLOSE_SHOP' };
  if (state.phase === 'RESOLVE_SPACE') {
    const space = BOARD_SPACES[player.position];
    const property = state.properties.find((candidate) => candidate.spaceIndex === player.position);
    if (space?.price != null && property?.ownerId === null && player.money >= space.price) return { type: 'BUY_PROPERTY' };
    return { type: 'END_TURN' };
  }
  if (state.phase === 'BANKRUPTCY') {
    if (player.money >= (state.bankruptcyDebt ?? 0)) return { type: 'END_TURN' };
    const upgraded = state.properties.find((property) => property.ownerId === player.id && property.tier > 0);
    if (upgraded) return { type: 'SELL_UPGRADE', spaceIndex: upgraded.spaceIndex };
    const property = state.properties.find((candidate) => candidate.ownerId === player.id);
    if (property) return { type: 'MORTGAGE_PROPERTY', spaceIndex: property.spaceIndex };
    const charm = player.charms[0];
    if (charm) return { type: 'SELL_CHARM', instanceId: charm.instanceId };
    return { type: 'DECLARE_BANKRUPTCY' };
  }
  return { type: 'END_TURN' };
}

function runMixedGame(initial: GameState): { state: GameState; aiActions: number; steps: number } {
  let state = initial;
  let aiActions = 0;
  let steps = 0;

  for (let step = 0; step < 600 && state.phase !== 'GAME_OVER'; step += 1) {
    steps = step + 1;
    let action: GameAction | null = null;
    const pending = state.tradeOffer;
    if (pending?.status === 'pending') {
      const recipient = state.players.find((player) => player.id === pending.toPlayerId);
      action = recipient?.isAI ? chooseAIAction(state) : { type: 'RESPOND_TRADE', accept: true };
    } else {
      const currentPlayer = state.players[state.currentPlayerIndex];
      action = currentPlayer?.isAI ? chooseAIAction(state) : scriptedHumanAction(state);
      if (currentPlayer?.isAI) aiActions += 1;
    }

    assert.ok(action, `No action selected at step ${step} for phase ${state.phase}`);
    state = gameReducer(state, action as GameAction);
  }

  return { state, aiActions, steps };
}

test('mixed human and AI game reaches a valid victory state', () => {
  const initial = createInitialState(
    ['Human', 'Cautious Carl'],
    12345,
    { mode: 'classic', maxRounds: 2, eventFrequency: 99, aiDifficulty: 'medium' },
    undefined,
    [
      { enabled: false, personality: 'cautious' },
      { enabled: true, personality: 'cautious' },
    ],
  );
  const result = runMixedGame(initial);

  assert.equal(result.state.phase, 'GAME_OVER');
  assert.ok(result.state.winner);
  assert.ok(result.aiActions > 0);
  assert.equal(result.state.players.filter((player: Player) => player.isAI).length, 1);
  assert.ok(result.state.eventLog.some((entry) => entry.type === 'VICTORY'));
  assert.ok(result.steps < 600);
});

test('mixed gameplay lets an AI respond to a human trade', () => {
  const initial = createInitialState(
    ['Human', 'Aggressive Alice'],
    67890,
    { mode: 'classic', maxRounds: 5, eventFrequency: 99, aiDifficulty: 'hard' },
    undefined,
    [
      { enabled: false, personality: 'cautious' },
      { enabled: true, personality: 'aggressive' },
    ],
  );
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
      giveMoney: 500,
      giveProperties: [],
      giveCharms: [],
      receiveMoney: 0,
      receiveProperties: [1],
      receiveCharms: [],
    },
  });
  const action = chooseAIAction(proposed);
  assert.deepEqual(action, { type: 'RESPOND_TRADE', accept: true });
  const completed = gameReducer(proposed, action);
  assert.equal(completed.tradeOffer, null);
  assert.equal(completed.properties.find((property) => property.spaceIndex === 1)?.ownerId, 'player-0');
});

test('all AI difficulty and personality combinations complete bounded games', () => {
  const difficulties = ['easy', 'medium', 'hard'] as const;
  const personalities = ['cautious', 'aggressive', 'random'] as const;

  for (const difficulty of difficulties) {
    for (const personality of personalities) {
      const initial = createInitialState(
        ['Human', 'AI'],
        difficulty.charCodeAt(0) + personality.charCodeAt(0),
        { mode: 'classic', maxRounds: 2, eventFrequency: 99, aiDifficulty: difficulty },
        undefined,
        [
          { enabled: false, personality: 'cautious' },
          { enabled: true, personality },
        ],
      );
      const result = runMixedGame(initial);
      assert.equal(result.state.phase, 'GAME_OVER', `${difficulty}/${personality} did not finish`);
      assert.ok(result.state.winner, `${difficulty}/${personality} has no winner`);
      assert.ok(result.steps < 600, `${difficulty}/${personality} exceeded action bound`);
    }
  }
});
