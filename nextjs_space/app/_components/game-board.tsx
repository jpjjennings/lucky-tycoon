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
import { Dices, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GameBoard() {
  const state = useGameStore((s: any) => s.state) as GameState | null;
  const dispatch = useGameStore((s: any) => s.dispatch);
  const resetGame = useGameStore((s: any) => s.resetGame);
  const [showTrade, setShowTrade] = useState(false);
  const [charmDetail, setCharmDetail] = useState<{ owned: OwnedCharm; playerName: string; isNew: boolean } | null>(null);
  const seenCharmIds = useRef<Set<string> | null>(null);

  const anim = useGameStore((s: any) => s.anim) as AnimationState;
  const setAnim = useGameStore((s: any) => s.setAnim);
  const advanceMoveStep = useGameStore((s: any) => s.advanceMoveStep);
  const finishAnimation = useGameStore((s: any) => s.finishAnimation);

  const currentPlayer = state?.players?.[state?.currentPlayerIndex ?? 0];
  const phase = state?.phase ?? 'ROLL_DICE';
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAction = useCallback((action: any) => {
    dispatch?.(action);
  }, [dispatch]);

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
      setCharmDetail({ owned: fresh.charm, playerName: fresh.playerName, isNew: true });
    }
  }, [players]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
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
          <Button variant="ghost" size="sm" onClick={resetGame} className="text-gray-400 hover:text-red-400">
            <RotateCcw className="w-4 h-4 mr-1" /> New Game
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Players */}
        <div className="lg:w-64 xl:w-72 shrink-0 bg-gray-900/40 border-r border-gray-800 overflow-y-auto p-3 space-y-2 flex lg:flex-col flex-row lg:overflow-x-hidden overflow-x-auto">
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

        {/* Center: Board */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto flex items-center justify-center p-2">
            <BoardGrid state={state} />
          </div>

          {/* Action bar */}
          <ActionBar
            state={state}
            onAction={handleAction}
            onOpenTrade={() => setShowTrade(true)}
          />
        </div>

        {/* Right: Event Feed */}
        <div className="lg:w-72 xl:w-80 shrink-0 bg-gray-900/40 border-l border-gray-800 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-800 font-medium text-sm text-gray-400 flex items-center gap-2">
            <Dices className="w-4 h-4" /> Event Feed
          </div>
          <EventFeed entries={state?.eventLog ?? []} />
        </div>
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
