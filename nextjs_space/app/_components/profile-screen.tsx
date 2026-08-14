'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProfile, saveProfile, PlayerProfile, setSelectedToken, setSelectedSkin, updateProfileName, resetProfile } from '@/lib/meta/profile';
import { getLevelForXP, getXPForNextLevel, MAX_LEVEL } from '@/lib/meta/xp';
import { PLAYER_TOKENS, BOARD_SKINS, getAvailableTokens, getAvailableSkins, TokenCosmetic, BoardSkin } from '@/lib/meta/cosmetics';
import { getCharmDef } from '@/lib/engine/charms-data';
import { ArrowLeft, Star, Trophy, Gamepad2, TrendingUp, Palette, User, Lock, Check, RotateCcw } from 'lucide-react';

interface ProfileScreenProps {
  onBack: () => void;
}

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const [profile, setProfileState] = useState<PlayerProfile | null>(null);
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [tab, setTab] = useState<'stats' | 'tokens' | 'skins'>('stats');

  useEffect(() => {
    setProfileState(getProfile());
  }, []);

  if (!profile) return null;

  const level = getLevelForXP(profile.totalXP);
  const xpInfo = getXPForNextLevel(profile.totalXP);
  const winRate = profile.gamesPlayed > 0 ? ((profile.wins / profile.gamesPlayed) * 100).toFixed(0) : '0';
  const favCharm = profile.favoriteCharmId ? getCharmDef(profile.favoriteCharmId) : null;
  const availableTokens = getAvailableTokens(level);
  const availableSkins = getAvailableSkins(level);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      updateProfileName(nameInput.trim());
      setProfileState(getProfile());
    }
    setEditName(false);
  };

  const handleTokenSelect = (tokenId: string) => {
    setSelectedToken(tokenId);
    setProfileState(getProfile());
  };

  const handleSkinSelect = (skinId: string) => {
    setSelectedSkin(skinId);
    setProfileState(getProfile());
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.08)_0%,_transparent_70%)]" />

      {/* Header */}
      <div className="w-full max-w-2xl relative z-10">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-2xl text-white">Player Profile</h1>
        </div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 mb-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/40 flex items-center justify-center text-3xl">
              {PLAYER_TOKENS.find(t => t.id === profile.selectedTokenId)?.icon ?? '🚀'}
            </div>
            <div className="flex-1">
              {editName ? (
                <div className="flex gap-2">
                  <Input
                    value={nameInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
                    className="h-8 bg-gray-800 border-gray-700 text-white text-sm"
                    autoFocus
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveName()}
                  />
                  <Button size="sm" onClick={handleSaveName} className="h-8 px-3">Save</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">{profile.name}</span>
                  <button onClick={() => { setEditName(true); setNameInput(profile.name); }} className="text-gray-500 hover:text-gray-300 text-xs">
                    ✏️
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-yellow-400">Lv. {level}</span>
                {level >= MAX_LEVEL ? (
                  <span className="text-[10px] text-amber-400">MAX LEVEL</span>
                ) : (
                  <span className="text-[10px] text-gray-500">{profile.totalXP} XP total</span>
                )}
              </div>
            </div>
          </div>

          {/* XP bar */}
          {level < MAX_LEVEL && (
            <div className="mb-1">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Level {level}</span>
                <span>{xpInfo.current} / {xpInfo.next} XP</span>
                <span>Level {level + 1}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, xpInfo.progress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-5">
          {(['stats', 'tokens', 'skins'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'stats' && '📊 Stats'}
              {t === 'tokens' && '🎮 Tokens'}
              {t === 'skins' && '🎨 Board Skins'}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {tab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon="🎮" label="Games Played" value={profile.gamesPlayed} />
              <StatCard icon="🏆" label="Wins" value={profile.wins} />
              <StatCard icon="📈" label="Win Rate" value={`${winRate}%`} />
              <StatCard icon="💰" label="Best Net Worth" value={profile.highestNetWorth.toLocaleString('en-US')} />
            </div>

            {/* Mode stats */}
            {Object.keys(profile.modeStats).length > 0 && (
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-300 mb-3">Mode Stats</h3>
                <div className="space-y-2">
                  {Object.entries(profile.modeStats).map(([modeKey, stats]) => (
                    <div key={modeKey} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 capitalize">{modeKey}</span>
                      <span className="text-gray-300 font-mono">
                        {stats.won}W / {stats.played - stats.won}L ({stats.played} played)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorite charm */}
            {favCharm && (
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-300 mb-2">Favorite Charm</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{favCharm.icon}</span>
                  <div>
                    <div className="text-white font-medium">{favCharm.name}</div>
                    <div className="text-xs text-gray-500">{favCharm.description}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements count */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-300 mb-2">Achievements</h3>
              <div className="text-3xl font-mono font-bold text-yellow-400">
                {profile.unlockedAchievements.length} <span className="text-lg text-gray-500">/ 25</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tokens tab */}
        {tab === 'tokens' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {PLAYER_TOKENS.map((token) => {
                const unlocked = token.requiredLevel <= level;
                const selected = profile.selectedTokenId === token.id;
                return (
                  <button
                    key={token.id}
                    onClick={() => unlocked && handleTokenSelect(token.id)}
                    disabled={!unlocked}
                    className={`relative p-4 rounded-xl border text-center transition-all ${
                      selected
                        ? 'bg-yellow-500/15 border-yellow-500/50 ring-1 ring-yellow-500/30'
                        : unlocked
                        ? 'bg-gray-900/60 border-gray-700 hover:border-gray-600'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-3xl mb-1">{unlocked ? token.icon : '🔒'}</div>
                    <div className="text-xs text-gray-300">{token.name}</div>
                    {!unlocked && (
                      <div className="text-[9px] text-gray-500 mt-0.5">Lv. {token.requiredLevel}</div>
                    )}
                    {selected && (
                      <div className="absolute top-1 right-1">
                        <Check className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Skins tab */}
        {tab === 'skins' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BOARD_SKINS.map((skin) => {
                const unlocked = skin.requiredLevel <= level;
                const selected = profile.selectedSkinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    onClick={() => unlocked && handleSkinSelect(skin.id)}
                    disabled={!unlocked}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-yellow-500/50 ring-1 ring-yellow-500/30'
                        : unlocked
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-800/50 opacity-50 cursor-not-allowed'
                    }`}
                    style={unlocked ? { backgroundColor: skin.borderColor + '20' } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{unlocked ? skin.preview : '🔒'}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{skin.name}</div>
                        <div className="text-xs text-gray-400">{skin.description}</div>
                        {!unlocked && <div className="text-[9px] text-gray-500">Unlock at Level {skin.requiredLevel}</div>}
                      </div>
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-yellow-400" />
                      </div>
                    )}
                    {unlocked && (
                      <div className="flex gap-2 mt-3">
                        <div className="h-3 w-8 rounded" style={{ backgroundColor: skin.borderColor }} />
                        <div className="h-3 w-8 rounded" style={{ backgroundColor: skin.accentColor }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Reset profile (danger) */}
        <div className="mt-8 mb-6 text-center">
          <button
            onClick={() => {
              if (confirm('Reset all progress? This cannot be undone.')) {
                resetProfile();
                setProfileState(getProfile());
              }
            }}
            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" />Reset Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-mono font-bold text-white">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
