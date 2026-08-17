'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore, AnimationState } from '@/lib/store';
import { GameState, Player, Property, GameMode, OwnedCharm } from '@/lib/engine/types';
import { getCharmDef } from '@/lib/engine/charms-data';
import { getModeLabel, getModeIcon, getModeColor } from '@/lib/leaderboard';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import BoardGrid from './board-grid';
import PlayerPanel from './player-panel';
import ActionBar from './action-bar';
import EventFeed from './event-feed';
import CharmShopModal from './charm-shop-modal';
import TradeModal from './trade-modal';
import RiskModal from './risk-modal';
import EventModal from './event-modal';
import BankruptcyModal from './bankruptcy-modal';
import SynergyNotification from './synergy-notification';
import CharmDetailModal from './charm-detail-modal';
import DiceOverlay from './dice-overlay';
import MomentOverlay from './moment-overlay';
import CharmDrawOverlay from './charm-draw-overlay';
import { Bot, Dices, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { chooseAIAction } from '@/lib/engine/ai';

interface GameBoardProps {
  externalState?: GameState | null;
  onExternalAction?: (action: any) => void;
  onExternalRoll?: () => void;
  onlineMode?: boolean;
  onlineCanAct?: boolean;
}

export default function GameBoard({ externalState, onExternalAction, onExternalRoll, onlineMode = false, onlineCanAct = true }: GameBoardProps = {}) {
  const localState = useGameStore((s: any) => s.state) as GameState | null;
  const localDispatch = useGameStore((s: any) => s.dispatch);
  const state = externalState ?? localState;
  const dispatch = onExternalAction ?? localDispatch;
  const resetGame = useGameStore((s: any) => s.resetGame);
  const [showTrade, setShowTrade] = useState(false);
  const [showEventFeed, setShowEventFeed] = useState(false);
  const [charmDetail, setCharmDetail] = useState<{ owned: OwnedCharm; playerName: string; isNew: boolean } | null>(null);
  const [charmDraw, setCharmDraw] = useState<{ owned: OwnedCharm; playerName: string } | null>(null);
  const seenCharmIds = useRef<Set<string> | null>(null);
  const pendingCharm = useRef<{ owned: OwnedCharm; playerName: string } | null>(null);
  const movementAnimationSeen = useRef(false);

  const anim = useGameStore((s: any) => s.anim) as AnimationState;
  const setAnim = useGameStore((s: any) => s.setAnim);
  const advanceMoveStep = useGameStore((s: any) => s.advanceMoveStep);
  const finishAnimation = useGameStore((s: any) => s.finishAnimation);
  const rollWithAnimation = useGameStore((s: any) => s.rollWithAnimation);

  const currentPlayer = state?.players?.[state?.currentPlayerIndex ?? 0];
  const phase = state?.phase ?? 'ROLL_DICE';
  const tradeResponder = state?.tradeOffer?.status === 'pending'
    ? state.players.find((player: Player) => player.id === state.tradeOffer?.toPlayerId && player.isAI)
    : null;
  const activeAI = tradeResponder ?? (currentPlayer?.isAI ? currentPlayer : null);
  const aiStatus = activeAI ? getAIStatus(activeAI.name, activeAI.aiPersonality, phase, anim.phase, !!tradeResponder) : null;
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onlinePlayerRef = useRef<string | null>(null);
  const onlinePositionRef = useRef<number | null>(null);
  const onlineDiceRef = useRef<string | null>(null);

  const canInteract = !onlineMode || (onlineCanAct && anim.phase === 'idle');
  const handleAction = useCallback((action: any) => {
    if (!canInteract) return;
    dispatch?.(action);
  }, [canInteract, dispatch]);

  // --- Animation orchestration ---
  // When dice rolling finishes, transition to movement animation
  const handleDiceComplete = useCallback(() => {
    const currentAnim = useGameStore.getState().anim;
    if (currentAnim.movePath.length > 0) {
      // Start movement animation
      setAnim({ phase: 'moving', moveStep: 0 });
    } else {
      // No movement (e.g. stuck in jail) — finish
      finishAnimation();
    }
  }, [setAnim, finishAnimation]);

  // Step through movement path with a timer
  useEffect(() => {
    if (anim.phase !== 'moving') return;
    if (anim.moveStep < 0) return;

    if (anim.moveStep >= anim.movePath.length - 1) {
      // Reached final space — pause briefly then finish
      const t = setTimeout(() => {
        finishAnimation();
      }, 300);
      return () => clearTimeout(t);
    }

    // Advance to next space after a delay
    const delay = Math.max(80, 200 - anim.moveStep * 10); // speeds up slightly
    const t = setTimeout(() => {
      advanceMoveStep();
    }, delay);
    return () => clearTimeout(t);
  }, [anim.phase, anim.moveStep, anim.movePath.length, advanceMoveStep, finishAnimation]);

  useEffect(() => {
    if (anim.phase === 'rolling' || anim.phase === 'moving') movementAnimationSeen.current = true;
  }, [anim.phase]);

  // Computer players use the same reducer actions as human players, with a
  // short delay so their decisions remain visible in pass-and-play sessions.
  useEffect(() => {
    if (onlineMode || !state || anim.phase !== 'idle') return;
    const action = chooseAIAction(state);
    if (!action) return;

    const timer = setTimeout(() => {
      if (action.type === 'ROLL_DICE') {
        rollWithAnimation();
      } else {
        dispatch?.(action);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [onlineMode, state, anim.phase, dispatch, rollWithAnimation]);

  useEffect(() => {
    if (!onlineMode || !state) return;
    const player = state.players[state.currentPlayerIndex];
    if (!player) return;
    const diceKey = state.diceResult ? state.diceResult.join(',') : null;
    if (onlinePlayerRef.current !== player.id) {
      onlinePlayerRef.current = player.id;
      onlinePositionRef.current = player.position;
      onlineDiceRef.current = diceKey;
      return;
    }

    const previousPosition = onlinePositionRef.current;
    const previousDice = onlineDiceRef.current;
    onlinePositionRef.current = player.position;
    onlineDiceRef.current = diceKey;
    if (previousPosition == null || (previousPosition === player.position && previousDice === diceKey) || !state.diceResult) return;

    const steps = (player.position - previousPosition + 40) % 40 || 40;
    const path = Array.from({ length: Math.min(steps, 20) }, (_, index) => (previousPosition + index + 1) % 40);
    if (path[path.length - 1] !== player.position) path.push(player.position);
    setAnim({
      phase: 'rolling',
      diceResult: state.diceResult,
      movePath: path,
      moveStep: -1,
      movingPlayerId: player.id,
      startPosition: previousPosition,
      playerColor: player.color,
      playerIcon: player.icon,
    });
  }, [onlineMode, state, setAnim]);

  // --- Detect newly acquired charms and explain them ---
  const players = state?.players;
  useEffect(() => {
    if (!players) return;
    const pairs: { charm: OwnedCharm; playerName: string }[] = [];
    for (const p of players) {
      for (const c of p?.charms ?? []) {
        if (c?.instanceId) pairs.push({ charm: c, playerName: p?.name ?? 'Player' });
      }
    }
    // First run: seed known charms without showing a popup (handles restored saves)
    if (seenCharmIds.current === null) {
      seenCharmIds.current = new Set(pairs.map((x) => x.charm.instanceId));
      return;
    }
    const known = seenCharmIds.current;
    const fresh = pairs.find((x) => !known.has(x.charm.instanceId));
    pairs.forEach((x) => known.add(x.charm.instanceId));
    if (fresh) {
      const nextCharm = { owned: fresh.charm, playerName: fresh.playerName };
      const latestEntry = state?.eventLog?.[state.eventLog.length - 1];
      const cameFromLuckySpace = latestEntry?.message?.includes('found a Lucky Charm');
      if (anim.phase === 'idle' && (!cameFromLuckySpace || movementAnimationSeen.current)) setCharmDraw(nextCharm);
      else pendingCharm.current = nextCharm;
    }
  }, [players, anim.phase, state?.eventLog]);

  useEffect(() => {
    if (anim.phase !== 'idle' || !pendingCharm.current || charmDraw) return;
    setCharmDraw(pendingCharm.current);
    pendingCharm.current = null;
    movementAnimationSeen.current = false;
  }, [anim.phase, charmDraw]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍀</span>
          <h1 className="font-display font-bold text-lg text-yellow-400">Lucky Tycoon</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {(state?.config?.mode ?? 'classic') !== 'classic' && (
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-bold"
              style={{
                color: getModeColor(state?.config?.mode ?? 'classic'),
                borderColor: getModeColor(state?.config?.mode ?? 'classic') + '40',
                backgroundColor: getModeColor(state?.config?.mode ?? 'classic') + '10',
              }}
            >
              {getModeIcon(state?.config?.mode ?? 'classic')} {getModeLabel(state?.config?.mode ?? 'classic')}
            </span>
          )}
          <span className="text-gray-400">Round <span className="text-white font-bold">{state?.round ?? 1}</span> / {state?.config?.maxRounds ?? 30}</span>
          {aiStatus && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300"
              aria-live="polite"
            >
              <LoaderCircle className="h-3 w-3 animate-spin" />
              <Bot className="h-3 w-3" /> {aiStatus}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowEventFeed((visible) => !visible)}
            aria-label={showEventFeed ? 'Hide event feed' : 'Show event feed'}
            aria-pressed={showEventFeed}
            title={showEventFeed ? 'Hide event feed' : 'Show event feed'}
            className="text-gray-400 hover:text-cyan-400"
          >
            <Dices className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetGame} disabled={onlineMode} className="text-gray-400 hover:text-red-400">
            <RotateCcw className="w-4 h-4 mr-1" /> New Game
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden lg:min-h-0">
        {/* Left: Players */}
        <div className="lg:w-64 xl:w-72 shrink-0 bg-gray-900/40 border-r border-gray-800 p-3 flex flex-col gap-2 lg:overflow-hidden">
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:min-h-0 lg:flex-1">
            {(state?.players ?? []).map((player: Player, i: number) => (
              <PlayerPanel
                key={player?.id ?? i}
                player={player}
                isActive={i === (state?.currentPlayerIndex ?? 0)}
                properties={(state?.properties ?? []).filter((p: Property) => p.ownerId === player?.id)}
                state={state}
                onCharmClick={(charm: OwnedCharm) =>
                  setCharmDetail({ owned: charm, playerName: player?.name ?? 'Player', isNew: false })
                }
              />
            ))}
          </div>
          <ActionBar
            state={state}
            onAction={handleAction}
            onOpenTrade={() => setShowTrade(true)}
            onRoll={onExternalRoll}
            canAct={canInteract}
          />
        </div>

        {/* Center: Board */}
        <div className="flex-1 flex flex-col overflow-hidden lg:min-h-0">
          <div className="flex-1 overflow-auto flex items-center justify-center p-2 lg:min-h-0 lg:overflow-hidden">
            <BoardGrid state={state} />
          </div>
        </div>

        {/* Right: Event Feed */}
        {showEventFeed && (
          <div className="lg:w-72 xl:w-80 shrink-0 bg-gray-900/40 border-l border-gray-800 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-800 font-medium text-sm text-gray-400 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Dices className="w-4 h-4" /> Event Feed</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowEventFeed(false)}
                aria-label="Hide event feed"
                title="Hide event feed"
                className="text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <EventFeed entries={state?.eventLog ?? []} />
          </div>
        )}
      </div>

      {/* Modals */}
      {phase === 'CHARM_SHOP' && state?.charmShop && (
        <CharmShopModal state={state} onAction={handleAction} />
      )}
      {showTrade && phase === 'PLAYER_ACTION' && (
        <TradeModal state={state} onAction={handleAction} onClose={() => setShowTrade(false)} />
      )}
      {phase === 'TRADING' && state?.tradeOffer && (
        <TradeModal state={state} onAction={handleAction} onClose={() => handleAction({ type: 'CANCEL_TRADE' })} />
      )}
      {phase === 'RISK_CHOICE' && state?.riskChoice && (
        <RiskModal state={state} onAction={handleAction} />
      )}
      {phase === 'EVENT_RESOLUTION' && state?.activeEvent && (
        <EventModal state={state} onAction={handleAction} />
      )}
      {phase === 'BANKRUPTCY' && (
        <BankruptcyModal state={state} onAction={handleAction} />
      )}

      <SynergyNotification state={state} />
      <MomentOverlay state={state} />

      {charmDraw && getCharmDef(charmDraw.owned.definitionId) && (
        <CharmDrawOverlay
          def={getCharmDef(charmDraw.owned.definitionId)!}
          onComplete={() => {
            const next = charmDraw;
            setCharmDraw(null);
            setCharmDetail({ owned: next.owned, playerName: next.playerName, isNew: true });
          }}
        />
      )}

      {/* Charm explanation popup (new charm acquired, or clicked in inventory) */}
      <CharmDetailModal
        def={charmDetail ? getCharmDef(charmDetail.owned?.definitionId ?? '') ?? null : null}
        owned={charmDetail?.owned ?? null}
        isNew={charmDetail?.isNew ?? false}
        playerName={charmDetail?.playerName}
        onClose={() => setCharmDetail(null)}
      />

      {/* Dice animation overlay */}
      {anim.phase === 'rolling' && anim.diceResult && (
        <DiceOverlay
          result={anim.diceResult}
          onComplete={handleDiceComplete}
        />
      )}
    </div>
  );
}

function getAIStatus(name: string, personality: string | undefined, phase: string, animation: AnimationState['phase'], respondingToTrade: boolean): string {
  const label = `${name} (${personality ?? 'AI'})`;
  if (respondingToTrade) return `${label} is reviewing the trade`;
  if (animation === 'rolling') return `${label} is rolling`;
  if (animation === 'moving') return `${label} is moving`;
  switch (phase) {
    case 'CHARM_SHOP': return `${label} is shopping`;
    case 'EVENT_RESOLUTION': return `${label} is resolving an event`;
    case 'RISK_CHOICE': return `${label} is weighing the risk`;
    case 'BANKRUPTCY': return `${label} is managing assets`;
    case 'RESOLVE_SPACE': return `${label} is evaluating the space`;
    default: return `${label} is thinking`;
  }
}
