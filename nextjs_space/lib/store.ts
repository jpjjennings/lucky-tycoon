'use client';
// ============================================
// Zustand Store — wraps the game reducer
// ============================================
import { create } from 'zustand';
import { AIPlayerConfig, GameState, GameAction, GameConfig } from './engine/types';
import { gameReducer, createInitialState, DEFAULT_CONFIG, MODE_PRESETS } from './engine/reducer';

export type AnimPhase = 'idle' | 'rolling' | 'moving';

export interface AnimationState {
  phase: AnimPhase;
  diceResult: [number, number] | null;
  movePath: number[];      // space indices the token walks through
  moveStep: number;        // current index into movePath being shown
  movingPlayerId: string | null;
  startPosition: number | null;
  playerColor: string | null;
  playerIcon: string | null;
}

const ANIM_IDLE: AnimationState = {
  phase: 'idle',
  diceResult: null,
  movePath: [],
  moveStep: -1,
  movingPlayerId: null,
  startPosition: null,
  playerColor: null,
  playerIcon: null,
};

interface GameStore {
  state: GameState | null;
  anim: AnimationState;
  startGame: (playerNames: string[], config?: Partial<GameConfig>, customIcons?: string[], aiPlayers?: AIPlayerConfig[]) => void;
  dispatch: (action: GameAction) => void;
  resetGame: () => void;
  rollWithAnimation: () => void;
  advanceMoveStep: () => void;
  finishAnimation: () => void;
  setAnim: (a: Partial<AnimationState>) => void;
}

export const useGameStore = create<GameStore>((set: any, get: any) => ({
  state: null,
  anim: { ...ANIM_IDLE },

  startGame: (playerNames: string[], config?: Partial<GameConfig>, customIcons?: string[], aiPlayers?: AIPlayerConfig[]) => {
    // Merge mode preset with any custom overrides
    const mode = config?.mode ?? 'classic';
    const preset = MODE_PRESETS[mode] ?? {};
    const merged = { ...preset, ...config };
    const initial = createInitialState(playerNames, undefined, merged, customIcons, aiPlayers);
    set({ state: initial, anim: { ...ANIM_IDLE } });
    try { localStorage.setItem('lucky-tycoon-save', JSON.stringify(initial)); } catch {}
  },

  dispatch: (action: GameAction) => {
    set((store: GameStore) => {
      if (!store.state) return store;
      const newState = gameReducer(store.state, action);
      try { localStorage.setItem('lucky-tycoon-save', JSON.stringify(newState)); } catch {}
      return { state: newState };
    });
  },

  resetGame: () => {
    set({ state: null, anim: { ...ANIM_IDLE } });
    try { localStorage.removeItem('lucky-tycoon-save'); } catch {}
  },

  /**
   * Called instead of dispatch({ type: 'ROLL_DICE' }).
   * 1. Captures the player's current position.
   * 2. Dispatches ROLL_DICE (engine resolves instantly).
   * 3. Reads the new diceResult and new position from the updated state.
   * 4. Builds a movePath (the list of spaces the token walks through).
   * 5. Sets anim phase to 'rolling', so the DiceOverlay appears.
   */
  rollWithAnimation: () => {
    const { state } = get();
    if (!state) return;

    const player = state.players[state.currentPlayerIndex];
    if (!player?.isAlive) {
      get().dispatch({ type: 'ROLL_DICE' });
      return;
    }
    const prevPos = player.position;
    const prevColor = player.color;
    const prevIcon = player.icon;
    const playerId = player.id;

    // Dispatch the real action — engine processes everything
    get().dispatch({ type: 'ROLL_DICE' });

    // Read the updated state
    const newState: GameState = get().state;
    const newPlayer = newState.players.find((p: any) => p.id === playerId);
    const diceResult = newState.diceResult;
    const newPos = newPlayer?.position ?? prevPos;

    // Build move path (each intermediate space)
    const boardLen = 40;
    const path: number[] = [];
    if (newPos !== prevPos) {
      let cur = prevPos;
      // Walk forward around the board to newPos
      const steps = (newPos - prevPos + boardLen) % boardLen || boardLen;
      // Edge case: sent to jail = direct jump, but we still animate a short path
      const actualSteps = Math.min(steps, 20); // cap at 20 to avoid long loops
      for (let i = 1; i <= actualSteps; i++) {
        path.push((prevPos + i) % boardLen);
      }
      // Ensure final position is in path
      if (path[path.length - 1] !== newPos) {
        path.push(newPos);
      }
    }

    set({
      anim: {
        phase: 'rolling' as AnimPhase,
        diceResult: diceResult,
        movePath: path,
        moveStep: -1, // not moving yet
        movingPlayerId: playerId,
        startPosition: prevPos,
        playerColor: prevColor,
        playerIcon: prevIcon,
      },
    });
  },

  /** Advance the token one step along the movePath */
  advanceMoveStep: () => {
    set((store: GameStore) => ({
      anim: { ...store.anim, moveStep: store.anim.moveStep + 1 },
    }));
  },

  /** Reset animation to idle */
  finishAnimation: () => {
    set({ anim: { ...ANIM_IDLE } });
  },

  setAnim: (a: Partial<AnimationState>) => {
    set((store: GameStore) => ({ anim: { ...store.anim, ...a } }));
  },
}));
