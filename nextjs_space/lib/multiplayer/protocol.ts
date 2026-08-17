import { GameAction, GameConfig, GameState } from '@/lib/engine/types';

export type ClientMessage =
  | { type: 'create_room'; name: string; config?: Partial<GameConfig> }
  | { type: 'join_room'; code: string; name: string }
  | { type: 'reconnect'; code: string; playerId: string; token: string }
  | { type: 'start_game' }
  | { type: 'leave_room' }
  | { type: 'action'; action: GameAction }
  | { type: 'chat'; message: string }
  | { type: 'reaction'; emoji: string };

export type ServerMessage =
  | { type: 'room_created'; code: string; playerId: string; token: string; hostId: string }
  | { type: 'room_joined'; code: string; playerId: string; token: string; hostId: string }
  | { type: 'room_state'; code: string; hostId: string; players: PublicRoomPlayer[]; state: PublicGameState | null }
  | { type: 'state'; state: PublicGameState }
  | { type: 'presence'; players: PublicRoomPlayer[]; hostId: string }
  | { type: 'turn_timer'; playerId: string; endsAt: number }
  | { type: 'chat'; playerId: string; name: string; message: string; sentAt: number }
  | { type: 'reaction'; playerId: string; emoji: string; sentAt: number }
  | { type: 'error'; code: string; message: string };

export interface PublicRoomPlayer {
  id: string;
  name: string;
  connected: boolean;
}

export type PublicGameState = Omit<GameState, 'seed' | 'rngState'> & {
  seed: 0;
  rngState: 0;
};

export function toPublicState(state: GameState): PublicGameState {
  return { ...state, seed: 0, rngState: 0 };
}

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    if (raw.length > 16_000) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed.type !== 'string') return null;
    if (parsed.type === 'create_room' || parsed.type === 'join_room') {
      if (typeof parsed.name !== 'string' || parsed.name.length > 100) return null;
      if (parsed.type === 'join_room' && (typeof parsed.code !== 'string' || !/^[A-Z0-9]{6}$/.test(parsed.code.toUpperCase()))) return null;
    }
    if (parsed.type === 'reconnect' && (![parsed.code, parsed.playerId, parsed.token].every((value) => typeof value === 'string'))) return null;
    if (parsed.type === 'chat' && (typeof parsed.message !== 'string' || parsed.message.length > 500)) return null;
    if (parsed.type === 'reaction' && (typeof parsed.emoji !== 'string' || parsed.emoji.length > 8)) return null;
    if (parsed.type === 'action' && !isSupportedAction(parsed.action)) return null;
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

function isSupportedAction(value: unknown): boolean {
  if (!value || typeof value !== 'object' || typeof (value as { type?: unknown }).type !== 'string') return false;
  const type = (value as { type: string }).type;
  const supported = ['ROLL_DICE', 'BUY_PROPERTY', 'UPGRADE_PROPERTY', 'MORTGAGE_PROPERTY', 'UNMORTGAGE_PROPERTY', 'SELL_UPGRADE', 'END_TURN', 'PROPOSE_TRADE', 'COUNTER_TRADE', 'RESPOND_TRADE', 'BUY_CHARM', 'SELL_CHARM', 'UPGRADE_CHARM', 'REROLL_SHOP', 'CLOSE_SHOP', 'OPEN_SHOP', 'LOCK_SHOP_ITEM', 'RESOLVE_EVENT', 'RISK_CHOOSE', 'PAY_JAIL_FINE', 'DECLARE_BANKRUPTCY', 'CANCEL_TRADE', 'ACTIVATE_CHARM'];
  if (!supported.includes(type)) return false;
  if (type === 'PROPOSE_TRADE' || type === 'COUNTER_TRADE') {
    const offer = (value as { offer?: unknown }).offer;
    if (!offer || typeof offer !== 'object') return false;
    const candidate = offer as Record<string, unknown>;
    return typeof candidate.fromPlayerId === 'string' && typeof candidate.toPlayerId === 'string' &&
      ['giveProperties', 'giveCharms', 'receiveProperties', 'receiveCharms'].every((key) => Array.isArray(candidate[key])) &&
      [candidate.giveMoney, candidate.receiveMoney].every((amount) => typeof amount === 'number' && Number.isFinite(amount));
  }
  if (type === 'RESPOND_TRADE') return typeof (value as { accept?: unknown }).accept === 'boolean';
  if (['UPGRADE_PROPERTY', 'MORTGAGE_PROPERTY', 'UNMORTGAGE_PROPERTY', 'SELL_UPGRADE'].includes(type)) return Number.isInteger((value as { spaceIndex?: unknown }).spaceIndex);
  if (['BUY_CHARM', 'SELL_CHARM', 'UPGRADE_CHARM', 'LOCK_SHOP_ITEM', 'ACTIVATE_CHARM'].includes(type)) return typeof (value as { charmId?: unknown; instanceId?: unknown }).charmId === 'string' || typeof (value as { charmId?: unknown; instanceId?: unknown }).instanceId === 'string';
  if (type === 'RISK_CHOOSE') return typeof (value as { safe?: unknown }).safe === 'boolean';
  return true;
}
