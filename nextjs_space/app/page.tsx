'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { AIPlayerConfig } from '@/lib/engine/types';
import LobbyScreen from './_components/lobby-screen';
import GameBoard from './_components/game-board';
import VictoryScreen from './_components/victory-screen';
import ProfileScreen from './_components/profile-screen';
import AchievementsScreen from './_components/achievements-screen';
import MultiplayerScreen from './_components/multiplayer-screen';

type ViewState = 'lobby' | 'game' | 'victory' | 'profile' | 'achievements' | 'multiplayer';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ViewState>('lobby');
  const gameState = useGameStore((s: any) => s.state);
  const startGame = useGameStore((s: any) => s.startGame);
  const resetGame = useGameStore((s: any) => s.resetGame);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('lucky-tycoon-save');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.phase && parsed?.players) {
          useGameStore.setState({ state: parsed });
        }
      }
    } catch {}
  }, []);

  // Sync view state with game state
  useEffect(() => {
    if (!mounted) return;
    if (!gameState && (view === 'game' || view === 'victory')) {
      setView('lobby');
    } else if (gameState?.phase === 'GAME_OVER' && view === 'game') {
      setView('victory');
    } else if (gameState && gameState.phase !== 'GAME_OVER' && view === 'lobby') {
      setView('game');
    }
  }, [gameState, mounted, view]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-2xl font-display text-yellow-400 animate-pulse">🍀 Lucky Tycoon</div>
      </div>
    );
  }

  if (view === 'profile') {
    return <ProfileScreen onBack={() => setView('lobby')} />;
  }

  if (view === 'achievements') {
    return <AchievementsScreen onBack={() => setView('lobby')} />;
  }

  if (view === 'multiplayer') {
    return <MultiplayerScreen onBack={() => setView('lobby')} />;
  }

  if (!gameState || view === 'lobby') {
    return (
      <LobbyScreen
        onStart={(names, config, icons, aiPlayers?: AIPlayerConfig[]) => {
          startGame(names, config, icons, aiPlayers);
          setView('game');
        }}
        onShowProfile={() => setView('profile')}
        onShowAchievements={() => setView('achievements')}
        onShowMultiplayer={() => setView('multiplayer')}
      />
    );
  }

  if (gameState?.phase === 'GAME_OVER' || view === 'victory') {
    return (
      <VictoryScreen
        onPlayAgain={() => {
          resetGame();
          setView('lobby');
        }}
      />
    );
  }

  return <GameBoard />;
}
