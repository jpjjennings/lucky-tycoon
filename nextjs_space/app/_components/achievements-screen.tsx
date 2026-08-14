'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/meta/profile';
import { ACHIEVEMENTS, Achievement } from '@/lib/meta/achievements';
import { ArrowLeft, Lock, Trophy } from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  victory: { label: 'Victory', icon: '🏆' },
  charm: { label: 'Charms', icon: '✨' },
  property: { label: 'Property', icon: '🏢' },
  challenge: { label: 'Challenge', icon: '💀' },
  mastery: { label: 'Mastery', icon: '🎖️' },
};

interface AchievementsScreenProps {
  onBack: () => void;
}

export default function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const profile = getProfile();
    setUnlocked(new Set(profile.unlockedAchievements));
  }, []);

  const categories = Object.keys(CATEGORY_LABELS);
  const filtered = filter
    ? ACHIEVEMENTS.filter((a) => a.category === filter)
    : ACHIEVEMENTS;
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.06)_0%,_transparent_70%)]" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-2xl text-white">Achievements</h1>
          <span className="ml-auto text-sm font-mono text-yellow-400">
            {unlockedCount} / {ACHIEVEMENTS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 mb-5">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <motion.div
              className="bg-gradient-to-r from-yellow-500 to-amber-400 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === null ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === cat ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {CATEGORY_LABELS[cat].icon} {CATEGORY_LABELS[cat].label}
            </button>
          ))}
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((ach, i) => {
            const isUnlocked = unlocked.has(ach.id);
            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl p-4 border transition-all ${
                  isUnlocked
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-gray-900/40 border-gray-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${ !isUnlocked ? 'grayscale' : '' }`}>
                    {isUnlocked ? ach.icon : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isUnlocked ? 'text-yellow-300' : 'text-gray-500'}`}>
                        {ach.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 uppercase">
                        {CATEGORY_LABELS[ach.category]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{ach.description}</p>
                    <span className="text-[10px] font-mono text-emerald-500 mt-1 inline-block">+{ach.xpReward} XP</span>
                  </div>
                  {isUnlocked && <Trophy className="w-4 h-4 text-yellow-400 mt-1 shrink-0" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
