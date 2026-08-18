'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Plus, Minus, Play, Sparkles, Zap, Skull, Settings2, Trophy, Clock, Coins, ShieldAlert, User, Award, Star, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AIDifficulty, AIPersonality, AIPlayerConfig, GameConfig, GameMode } from '@/lib/engine/types';
import { getProfile } from '@/lib/meta/profile';
import { getLevelForXP, getXPForNextLevel, MAX_LEVEL } from '@/lib/meta/xp';
import { PLAYER_TOKENS, getAvailableTokens } from '@/lib/meta/cosmetics';

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA'];
const DEFAULT_ICONS = ['🚀', '⭐', '💎', '🍀'];
const AI_NAMES: Record<AIPersonality, string[]> = {
  cautious: ['Cautious Carl', 'Careful Casey', 'Steady Sam', 'Prudent Pat'],
  aggressive: ['Aggressive Alice', 'Bold Blake', 'Risky Riley', 'Tycoon Taylor'],
  random: ['Random Randy', 'Wildcard Wren', 'Chaos Charlie', 'Lucky Logan'],
};

function randomAIName(personality: AIPersonality): string {
  const names = AI_NAMES[personality];
  return names[Math.floor(Math.random() * names.length)];
}

interface ModeInfo {
  id: GameMode;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  color: string;
  borderColor: string;
}

const MODES: ModeInfo[] = [
  {
    id: 'classic',
    name: 'Classic',
    icon: <Trophy className="w-5 h-5" />,
    tagline: '30 rounds • Standard rules',
    description: 'The original Lucky Tycoon experience. 30 rounds, balanced economy, and standard charm rules.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
  },
  {
    id: 'quick',
    name: 'Quick Match',
    icon: <Zap className="w-5 h-5" />,
    tagline: '15 rounds • Fast & furious',
    description: 'Speed game with boosted income, 50% higher rents, more frequent charm shops, and rapid events.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    icon: <Skull className="w-5 h-5" />,
    tagline: '40 rounds • High stakes',
    description: 'Punishing mode — less starting cash, charms can be permanently destroyed when paying rent. Only the strongest survive.',
    color: 'text-red-400',
    borderColor: 'border-red-500/40',
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: <Settings2 className="w-5 h-5" />,
    tagline: 'Your rules',
    description: 'Configure every parameter — starting cash, round limit, charm slots, event frequency, and more.',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
  },
];

interface LobbyScreenProps {
  onStart: (names: string[], config?: Partial<GameConfig>, customIcons?: string[], aiPlayers?: AIPlayerConfig[]) => void;
  onShowProfile: () => void;
  onShowAchievements: () => void;
  onShowMultiplayer: () => void;
}

export default function LobbyScreen({ onStart, onShowProfile, onShowAchievements, onShowMultiplayer }: LobbyScreenProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [aiEnabled, setAiEnabled] = useState([false, false, false, false]);
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonality[]>(['cautious', 'aggressive', 'random', 'cautious']);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [playerLevel, setPlayerLevel] = useState(1);
  const [selectedToken, setSelectedToken] = useState('🚀');
  const [totalXP, setTotalXP] = useState(0);
  const [customConfig, setCustomConfig] = useState({
    maxRounds: 30,
    startingMoney: 1500,
    passStartBonus: 200,
    charmShopInterval: 4,
    charmShopSize: 4,
    maxCharmSlots: 3,
    charmPermadeath: false,
    acceleratedEconomy: false,
    eventFrequency: 6,
  });

  // Load profile data
  useEffect(() => {
    const profile = getProfile();
    const level = getLevelForXP(profile.totalXP);
    setPlayerLevel(level);
    setTotalXP(profile.totalXP);
    const token = PLAYER_TOKENS.find(t => t.id === profile.selectedTokenId);
    if (token && token.requiredLevel <= level) {
      setSelectedToken(token.icon);
    }
  }, []);

  const handleStart = () => {
    const finalNames = names.slice(0, playerCount).map((n: string, i: number) => {
      if (n.trim()) return n.trim();
      if (aiEnabled[i]) {
        const labels: Record<AIPersonality, string> = { cautious: 'Cautious Carl', aggressive: 'Aggressive Alice', random: 'Random Randy' };
        return labels[aiPersonalities[i]];
      }
      return `Player ${i + 1}`;
    });
    const aiPlayers = aiEnabled.slice(0, playerCount).map((enabled, i) => ({ enabled, personality: aiPersonalities[i] }));
    if (aiPlayers.every((player) => player.enabled)) {
      setStartError('At least one human player is required to start a game.');
      return;
    }
    setStartError(null);
    // Build custom icons array — player 1 uses their selected token, others use defaults
    const icons = [selectedToken, ...DEFAULT_ICONS.slice(1)];
    if (selectedMode === 'custom') {
      onStart(finalNames, { ...customConfig, mode: 'custom', aiDifficulty }, icons, aiPlayers);
    } else {
      onStart(finalNames, { mode: selectedMode, aiDifficulty }, icons, aiPlayers);
    }
  };

  const modeInfo = MODES.find((m) => m.id === selectedMode) ?? MODES[0];
  const xpInfo = getXPForNextLevel(totalXP);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,197,94,0.1)_0%,_transparent_70%)]" />
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-yellow-500/5 blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 rounded-full bg-green-500/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-6"
      >
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight">
          <span className="text-yellow-400">🍀 Lucky</span>
          <span className="text-emerald-400"> Tycoon</span>
        </h1>
        <p className="text-gray-400 mt-3 text-lg">Roll. Buy. Charm your way to victory.</p>
      </motion.div>

      {/* Profile bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 w-full max-w-2xl mb-4"
      >
        <div className="flex items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-lg">
            {selectedToken}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-yellow-400">Lv. {playerLevel}</span>
              {playerLevel < MAX_LEVEL && (
                <div className="flex-1 max-w-[120px] bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-yellow-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, xpInfo.progress * 100)}%` }}
                  />
                </div>
              )}
              {playerLevel >= MAX_LEVEL && <span className="text-[10px] text-amber-400">MAX</span>}
            </div>
          </div>
          <button onClick={onShowProfile} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
            <User className="w-3.5 h-3.5" /> Profile
          </button>
          <button onClick={onShowAchievements} className="text-xs text-gray-400 hover:text-yellow-400 flex items-center gap-1 transition-colors">
            <Award className="w-3.5 h-3.5" /> Achievements
          </button>
          <button onClick={onShowMultiplayer} className="text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1 transition-colors">
            <Gamepad2 className="w-3.5 h-3.5" /> Online
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 w-full max-w-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-5"
      >
        {/* Mode Selection */}
        <div>
          <label className="text-sm text-gray-400 font-medium block mb-3">Game Mode</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedMode === mode.id
                    ? `${mode.borderColor} bg-white/5 ring-1 ring-white/10`
                    : 'border-gray-800 hover:border-gray-700 bg-gray-900/40'
                }`}
              >
                <div className={`flex items-center gap-2 ${mode.color} mb-1`}>
                  {mode.icon}
                  <span className="font-semibold text-sm">{mode.name}</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">{mode.tagline}</p>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={modeInfo.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`text-xs mt-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30 ${modeInfo.color}`}
            >
              {modeInfo.description}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Custom Config Panel */}
        <AnimatePresence>
          {selectedMode === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                <ConfigSlider label="Rounds" value={customConfig.maxRounds} min={5} max={60} step={5}
                  onChange={(v: number) => setCustomConfig({ ...customConfig, maxRounds: v })} icon={<Clock className="w-3 h-3" />} />
                <ConfigSlider label="Starting Cash" value={customConfig.startingMoney} min={500} max={5000} step={100}
                  onChange={(v: number) => setCustomConfig({ ...customConfig, startingMoney: v })} icon={<Coins className="w-3 h-3" />} />
                <ConfigSlider label="Pass Start Bonus" value={customConfig.passStartBonus} min={50} max={500} step={25}
                  onChange={(v: number) => setCustomConfig({ ...customConfig, passStartBonus: v })} icon={<Coins className="w-3 h-3" />} />
                <ConfigSlider label="Shop Size" value={customConfig.charmShopSize} min={2} max={8} step={1}
                  onChange={(v: number) => setCustomConfig({ ...customConfig, charmShopSize: v })} icon={<Sparkles className="w-3 h-3" />} />
                <ConfigSlider label="Charm Slots" value={customConfig.maxCharmSlots} min={1} max={6} step={1}
                  onChange={(v: number) => setCustomConfig({ ...customConfig, maxCharmSlots: v })} icon={<Sparkles className="w-3 h-3" />} />
                <ConfigSlider label="Event Frequency" value={customConfig.eventFrequency} min={2} max={12} step={1}
                  onChange={(v: number) => setCustomConfig({ ...customConfig, eventFrequency: v })} icon={<Zap className="w-3 h-3" />} />
              </div>
              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={customConfig.charmPermadeath}
                    onChange={(e) => setCustomConfig({ ...customConfig, charmPermadeath: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500" />
                  <ShieldAlert className="w-3 h-3 text-red-400" /> Charm Permadeath
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={customConfig.acceleratedEconomy}
                    onChange={(e) => setCustomConfig({ ...customConfig, acceleratedEconomy: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500" />
                  <Zap className="w-3 h-3 text-amber-400" /> Accelerated Economy
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player count */}
        <div>
          <label className="text-sm text-gray-400 font-medium block mb-2">Players</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
              disabled={playerCount <= 2}
              className="border-gray-700"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-white">{playerCount}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPlayerCount(Math.min(4, playerCount + 1))}
              disabled={playerCount >= 4}
              className="border-gray-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <div>
            <div className="text-sm font-medium text-gray-300">AI difficulty</div>
            <div className="text-[10px] text-gray-500">Choose how strongly computer players evaluate decisions.</div>
          </div>
          <select
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-white"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Player names */}
        <div className="space-y-3">
          {Array.from({ length: playerCount }).map((_: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: PLAYER_COLORS[i] + '30', border: `2px solid ${PLAYER_COLORS[i]}` }}
              >
                {i === 0 ? selectedToken : DEFAULT_ICONS[i]}
              </div>
                <Input
                  placeholder={`Player ${i + 1}`}
                value={names[i] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={aiEnabled[i]}
                    onChange={(e) => {
                      const next = [...aiEnabled];
                      next[i] = e.target.checked;
                       setAiEnabled(next);
                       setStartError(null);
                      if (e.target.checked) {
                        const nextNames = [...names];
                        nextNames[i] = randomAIName(aiPersonalities[i]);
                        setNames(nextNames);
                      }
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <Bot className="h-3.5 w-3.5 text-cyan-400" /> AI
                </label>
                {aiEnabled[i] && (
                  <select
                    value={aiPersonalities[i]}
                    onChange={(e) => {
                      const next = [...aiPersonalities];
                      const personality = e.target.value as AIPersonality;
                      next[i] = personality;
                      setAiPersonalities(next);
                      const nextNames = [...names];
                      nextNames[i] = randomAIName(personality);
                      setNames(nextNames);
                    }}
                    className="w-28 rounded-md border border-gray-700 bg-gray-800 px-2 py-2 text-xs text-white"
                  >
                    <option value="cautious">Cautious</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="random">Random</option>
                  </select>
                )}
            </motion.div>
          ))}
        </div>

        {/* Start button */}
         <Button
           onClick={handleStart}
          className={`w-full h-12 font-bold text-lg transition-all ${
            selectedMode === 'quick'
              ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500'
              : selectedMode === 'hardcore'
              ? 'bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500'
              : selectedMode === 'custom'
              ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500'
              : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500'
          } text-white`}
        >
          <Play className="w-5 h-5 mr-2" />
           Start {modeInfo.name}
         </Button>
         {startError && (
           <p role="alert" className="mt-2 text-center text-xs text-red-300">{startError}</p>
         )}

        {/* How to play */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium text-sm">How to Play</span>
          </div>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Roll dice, buy properties, upgrade them through 5 tiers</li>
            <li>• Collect rent from opponents who land on your properties</li>
            <li>• Find and buy Lucky Charms — combine them for powerful synergies</li>
            <li>• Trade properties and charms with other players</li>
            <li>• Highest net worth after the game ends (or last player standing) wins!</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

function ConfigSlider({ label, value, min, max, step, onChange, icon }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/40 rounded-lg p-2.5 border border-gray-700/30">
      <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <span className="text-sm font-mono font-bold text-white min-w-[40px] text-right">{value}</span>
      </div>
    </div>
  );
}
