// ============================================
// Event Bus — pub/sub for charm triggers
// ============================================

export type HookEvent =
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
  | 'ON_ROUND_END';

export interface HookPayload {
  playerId: string;
  amount?: number;
  spaceIndex?: number;
  diceTotal?: number;
  isDoubles?: boolean;
  [key: string]: any;
}

export type HookHandler = (payload: HookPayload) => void;

export class EventBus {
  private listeners: Map<HookEvent, HookHandler[]> = new Map();

  on(event: HookEvent, handler: HookHandler): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler);
    this.listeners.set(event, handlers);
  }

  off(event: HookEvent, handler: HookHandler): void {
    const handlers = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      handlers.filter((h: HookHandler) => h !== handler)
    );
  }

  emit(event: HookEvent, payload: HookPayload): void {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (e) {
        console.error(`EventBus handler error for ${event}:`, e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
