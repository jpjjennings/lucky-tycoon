'use client';
import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/lib/store';
import { GameState, Player, Property, GameMode } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { getCharmDef, RARITY_COLORS } from '@/lib/engine/charms-data';
import { calculateNetWorth } from '@/lib/engine/reducer';
import { addLeaderboardEntry, getLeaderboard, LeaderboardEntry, getModeLabel, getModeIcon, getModeColor } from '@/lib/leaderboard';
import { processEndOfGame, EndOfGameResult } from '@/lib/meta/profile';
import { ACHIEVEMENTS } from '@/lib/meta/achievements';
import { getLevelForXP, getXPForNextLevel, LEVEL_THRESHOLDS } from '@/lib/meta/xp';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, RotateCcw, Coins, Home, Sparkles, Medal, Clock, Users, Star, ChevronUp, Zap } from 'lucide-react';

interface VictoryScreenProps {
  onPlayAgain: () => void;
}

type ViewMode = 'results' | 'xp' | 'leaderboard';

export default function VictoryScreen({ onPlayAgain }: VictoryScreenProps) {
  const state = useGameStore((s: any) => s.state) as GameState | null;
  const [viewMode, setViewMode] = useState<ViewMode>('results');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [processed, setProcessed] = useState(false);
  const [gameResult, setGameResult] = useState<EndOfGameResult | null>(null);
  const [xpAnimStep, setXpAnimStep] = useState(0);

  useEffect(() => {
    if (!state || processed) return;
    // Save winner to leaderboard
    const winner = (state.players ?? []).find((p: Player) => p.id === state.winner);
    if (winner) {
      addLeaderboardEntry({
        playerName: winner.name,
        netWorth: calculateNetWorth(state, winner),
        rounds: state.round ?? 1,
        mode: state.config?.mode ?? 'classic',
        playerCount: (state.players ?? []).length,
      });
    }
    // Process meta-progression for player-0 (local player)
    const result = processEndOfGame(state, 'player-0');
    setGameResult(result);
    setLeaderboard(getLeaderboard());
    setProcessed(true);
  }, [state, processed]);

  // Animate XP breakdown one line at a time
  useEffect(() => {
    if (!gameResult || viewMode !== 'xp') return;
    if (xpAnimStep >= (gameResult.xpBreakdown.length + 2)) return; // +2 for total + level
    const timer = setTimeout(() => setXpAnimStep((s) => s + 1), 400);
    return () => clearTimeout(timer);
  }, [gameResult, viewMode, xpAnimStep]);

  const handleShowXP = useCallback(() => {
    setViewMode('xp');
    setXpAnimStep(0);
  }, []);

  if (!state) return null;

  const winner = (state?.players ?? []).find((p: Player) => p.id === state?.winner);
  const sortedPlayers = [...(state?.players ?? [])].sort(
    (a: Player, b: Player) => calculateNetWorth(state, b) - calculateNetWorth(state, a)
  );
  const mode = state.config?.mode ?? 'classic';
  const modeColor = getModeColor(mode);
  const netWorthData = sortedPlayers.map((player: Player) => ({
    name: player.name,
    netWorth: calculateNetWorth(state, player),
  }));

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.15)_0%,_transparent_70%)]" />

      {/* Mode badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 mb-3"
      >
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border"
          style={{ color: modeColor, borderColor: modeColor + '60', backgroundColor: modeColor + '15' }}
        >
          {getModeIcon(mode)} {getModeLabel(mode)}
        </span>
      </motion.div>

      {/* Trophy animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.3 }}
        className="text-7xl mb-4 relative z-10"
      >
        🏆
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="font-display font-bold text-4xl md:text-5xl text-yellow-400 tracking-tight mb-2 relative z-10"
      >
        {winner?.name ?? 'Someone'} Wins!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-gray-400 mb-8 relative z-10"
      >
        After {state?.round ?? 1} rounds of chaos
      </motion.p>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {viewMode === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-lg space-y-3 relative z-10"
          >
            <div className="h-56 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Net Worth Comparison</div>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={netWorthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.45} />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(234, 179, 8, 0.08)' }}
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f9fafb' }}
                    formatter={(value: number) => [`${value.toLocaleString('en-US')} coins`, 'Net Worth']}
                  />
                  <Bar dataKey="netWorth" fill="#facc15" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {sortedPlayers.map((player: Player, rank: number) => {
              const netWorth = calculateNetWorth(state, player);
              const ownedProps = (state?.properties ?? []).filter((p: Property) => p.ownerId === player?.id);
              const charms = player?.charms ?? [];
              const isWinner = player.id === state?.winner;

              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + rank * 0.15 }}
                  className={`rounded-xl p-4 border ${
                    isWinner
                      ? 'bg-yellow-500/10 border-yellow-500/40 ring-1 ring-yellow-500/20'
                      : 'bg-gray-900/60 border-gray-800'
                  } ${!player.isAlive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold font-mono w-8 text-center" style={{ color: isWinner ? '#FFD700' : '#666' }}>
                      #{rank + 1}
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: player.color + '30', border: `2px solid ${player.color}` }}
                    >
                      {player.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: player.color }}>{player.name}</span>
                        {isWinner && <Crown className="w-4 h-4 text-yellow-400" />}
                        {!player.isAlive && <span className="text-xs text-red-400">(Bankrupt)</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {(player?.money ?? 0).toLocaleString('en-US')}</span>
                        <span className="flex items-center gap-1"><Home className="w-3 h-3" /> {ownedProps.length}</span>
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {charms.length}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-yellow-400">{netWorth.toLocaleString('en-US')}</div>
                      <div className="text-[10px] text-gray-500">Net Worth</div>
                    </div>
                  </div>

                  {charms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 ml-12">
                      {charms.map((c: any) => {
                        const def = getCharmDef(c?.definitionId ?? '');
                        const level = c?.level ?? 1;
                        return (
                          <span
                            key={c.instanceId}
                            className="text-xs px-2 py-0.5 rounded-full border"
                            style={{
                              borderColor: RARITY_COLORS[def?.rarity ?? 'Common'] ?? '#666',
                              color: RARITY_COLORS[def?.rarity ?? 'Common'] ?? '#666',
                            }}
                          >
                            {def?.icon} {def?.name}{level > 1 ? ` Lv.${level}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {viewMode === 'xp' && gameResult && (
          <motion.div
            key="xp"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Star className="w-5 h-5 text-yellow-400" />
                <h3 className="font-display font-bold text-lg text-yellow-300">XP Earned</h3>
              </div>

              {/* XP breakdown lines */}
              <div className="space-y-2 mb-5">
                {gameResult.xpBreakdown.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={i < xpAnimStep ? { opacity: 1, x: 0 } : {}}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-300">{item.label}</span>
                    <span className="font-mono font-bold text-emerald-400">+{item.xp} XP</span>
                  </motion.div>
                ))}
              </div>

              {/* Total XP */}
              {xpAnimStep > gameResult.xpBreakdown.length && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border-t border-gray-700 pt-3 mb-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Total XP</span>
                    <span className="text-xl font-mono font-bold text-yellow-400">+{gameResult.xpGained}</span>
                  </div>
                </motion.div>
              )}

              {/* Level up notification */}
              {xpAnimStep > gameResult.xpBreakdown.length + 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  {gameResult.leveledUp ? (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-lg p-4 text-center">
                      <div className="text-3xl mb-1">🎉</div>
                      <div className="text-yellow-300 font-bold text-lg">Level Up!</div>
                      <div className="text-gray-400 text-sm">Level {gameResult.levelBefore} → Level {gameResult.levelAfter}</div>
                    </div>
                  ) : (
                    <div className="bg-gray-800/60 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-gray-400">Level {gameResult.levelAfter}</span>
                        <span className="text-gray-500 text-xs">
                          {(() => {
                            const info = getXPForNextLevel(LEVEL_THRESHOLDS[gameResult.levelAfter - 1] + gameResult.xpGained);
                            return `${info.current} / ${info.next} XP`;
                          })()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-emerald-500 to-yellow-400 h-2 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${Math.min(100, (getXPForNextLevel(LEVEL_THRESHOLDS[gameResult.levelAfter - 1] + gameResult.xpGained).progress) * 100)}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Achievement unlocks */}
                  {gameResult.newAchievements.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wider">🏅 Achievements Unlocked</div>
                      {gameResult.newAchievements.map((achId) => {
                        const ach = ACHIEVEMENTS.find((a) => a.id === achId);
                        if (!ach) return null;
                        return (
                          <motion.div
                            key={achId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2"
                          >
                            <span className="text-xl">{ach.icon}</span>
                            <div>
                              <div className="text-sm font-bold text-amber-300">{ach.name}</div>
                              <div className="text-xs text-gray-400">{ach.description}</div>
                            </div>
                            <span className="ml-auto text-xs font-mono text-emerald-400">+{ach.xpReward}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {viewMode === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-lg relative z-10"
          >
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Medal className="w-5 h-5 text-yellow-400" />
                <h3 className="font-display font-bold text-lg text-yellow-300">Hall of Fame</h3>
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No entries yet.</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {leaderboard.slice(0, 20).map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/40 border border-gray-700/20"
                    >
                      <span className="text-sm font-mono font-bold w-6 text-center" style={{
                        color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#666',
                      }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{entry.playerName}</span>
                          <span
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                            style={{
                              color: getModeColor(entry.mode),
                              borderColor: getModeColor(entry.mode) + '40',
                              backgroundColor: getModeColor(entry.mode) + '10',
                            }}
                          >
                            {getModeIcon(entry.mode)} {getModeLabel(entry.mode)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {entry.rounds}R</span>
                          <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {entry.playerCount}P</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-yellow-400">{entry.netWorth.toLocaleString('en-US')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-8 flex flex-wrap gap-3 relative z-10 justify-center"
      >
        <Button
          onClick={() => setViewMode(viewMode === 'results' ? 'leaderboard' : 'results')}
          variant="outline"
          className="h-11 px-5 border-yellow-700 text-yellow-400 hover:bg-yellow-500/10"
        >
          <Medal className="w-4 h-4 mr-2" />
          {viewMode === 'leaderboard' ? 'Results' : 'Leaderboard'}
        </Button>
        {gameResult && (
          <Button
            onClick={handleShowXP}
            variant="outline"
            className="h-11 px-5 border-emerald-700 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Star className="w-4 h-4 mr-2" />
            XP Summary
          </Button>
        )}
        <Button
          onClick={onPlayAgain}
          className="h-11 px-8 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" /> Play Again
        </Button>
      </motion.div>
    </div>
  );
}
