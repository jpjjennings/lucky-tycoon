'use client';
import { useState } from 'react';
import { GameState, Player, Property, OwnedCharm } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { getCharmDef, RARITY_COLORS } from '@/lib/engine/charms-data';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HandCoins, X, Check, ArrowRight } from 'lucide-react';

interface TradeModalProps {
  state: GameState;
  onAction: (action: any) => void;
  onClose: () => void;
}

export default function TradeModal({ state, onAction, onClose }: TradeModalProps) {
  const currentPlayer = state?.players?.[state?.currentPlayerIndex ?? 0];
  const tradeOffer = state?.tradeOffer;

  // If there's a pending trade, show accept/reject
  if (tradeOffer?.status === 'pending') {
    const from = (state?.players ?? []).find((p: Player) => p.id === tradeOffer.fromPlayerId);
    const to = (state?.players ?? []).find((p: Player) => p.id === tradeOffer.toPlayerId);
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 border border-cyan-500/30 rounded-xl p-6 max-w-md w-full"
        >
           <h2 className="font-display font-bold text-lg text-cyan-300 mb-4">{tradeOffer.counterCount ? '🔁 Counter-Offer' : '🤝 Trade Offer'}</h2>
          <p className="text-sm text-gray-300 mb-3">
            <span style={{ color: from?.color }}>{from?.name}</span> offers a trade to{' '}
            <span style={{ color: to?.color }}>{to?.name}</span>
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <div className="text-xs text-red-400 font-medium mb-2">Giving</div>
              {(tradeOffer.giveMoney ?? 0) > 0 && <p className="text-xs text-yellow-400">💰 {tradeOffer.giveMoney} coins</p>}
               {(tradeOffer.giveProperties ?? []).map((si: number) => (
                 <p key={si} className="text-xs text-gray-300">🏠 {BOARD_SPACES[si]?.name}</p>
               ))}
               {(tradeOffer.giveCharms ?? []).map((id: string) => (
                 <p key={id} className="text-xs text-purple-300">✨ Charm</p>
               ))}
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="text-xs text-green-400 font-medium mb-2">Receiving</div>
              {(tradeOffer.receiveMoney ?? 0) > 0 && <p className="text-xs text-yellow-400">💰 {tradeOffer.receiveMoney} coins</p>}
               {(tradeOffer.receiveProperties ?? []).map((si: number) => (
                 <p key={si} className="text-xs text-gray-300">🏠 {BOARD_SPACES[si]?.name}</p>
               ))}
               {(tradeOffer.receiveCharms ?? []).map((id: string) => (
                 <p key={id} className="text-xs text-purple-300">✨ Charm</p>
               ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onAction({ type: 'RESPOND_TRADE', accept: true })} className="flex-1 bg-green-600 hover:bg-green-500">
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
            <Button onClick={() => onAction({ type: 'RESPOND_TRADE', accept: false })} variant="destructive" className="flex-1">
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Trade builder
  return <TradeBuilder state={state} currentPlayer={currentPlayer} onAction={onAction} onClose={onClose} />;
}

function TradeBuilder({ state, currentPlayer, onAction, onClose }: {
  state: GameState;
  currentPlayer: Player | undefined;
  onAction: (action: any) => void;
  onClose: () => void;
}) {
  const otherPlayers = (state?.players ?? []).filter((p: Player) => p.isAlive && p.id !== currentPlayer?.id);
  const [targetId, setTargetId] = useState(otherPlayers[0]?.id ?? '');
  const [giveMoney, setGiveMoney] = useState(0);
  const [receiveMoney, setReceiveMoney] = useState(0);
  const [giveProps, setGiveProps] = useState<number[]>([]);
  const [receiveProps, setReceiveProps] = useState<number[]>([]);
  const [giveCharms, setGiveCharms] = useState<string[]>([]);
  const [receiveCharms, setReceiveCharms] = useState<string[]>([]);

  const myProperties = (state?.properties ?? []).filter((p: Property) => p.ownerId === currentPlayer?.id);
  const theirProperties = (state?.properties ?? []).filter((p: Property) => p.ownerId === targetId);

  const handlePropose = () => {
    onAction({
      type: 'PROPOSE_TRADE',
      offer: {
        fromPlayerId: currentPlayer?.id ?? '',
        toPlayerId: targetId,
        giveMoney,
        giveProperties: giveProps,
         giveCharms,
        receiveMoney,
        receiveProperties: receiveProps,
         receiveCharms,
      },
    });
  };

  const toggleProp = (si: number, list: number[], setter: (v: number[]) => void) => {
    if (list.includes(si)) {
      setter(list.filter((x: number) => x !== si));
    } else {
      setter([...list, si]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-cyan-500/30 rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display font-bold text-lg text-cyan-300">Propose Trade</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Target selector */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Trade with:</label>
          <div className="flex gap-2">
            {otherPlayers.map((p: Player) => (
              <button
                key={p.id}
                onClick={() => { setTargetId(p.id); setReceiveProps([]); setReceiveCharms([]); }}
                className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                  targetId === p.id ? 'border-cyan-500 bg-cyan-500/20' : 'border-gray-700 bg-gray-800'
                }`}
                style={{ color: p.color }}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* You Give */}
          <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/20">
            <h3 className="text-xs text-red-400 font-medium mb-2">You Give</h3>
            <div className="mb-2">
              <label className="text-[10px] text-gray-500">Money</label>
              <Input
                type="number"
                min={0}
                max={currentPlayer?.money ?? 0}
                value={giveMoney}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGiveMoney(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-1">
              {myProperties.map((p: Property) => {
                const sp = BOARD_SPACES[p.spaceIndex];
                const selected = giveProps.includes(p.spaceIndex);
                return (
                  <button
                    key={p.spaceIndex}
                    onClick={() => toggleProp(p.spaceIndex, giveProps, setGiveProps)}
                    className={`w-full text-left text-xs px-2 py-1 rounded border transition-colors ${
                      selected ? 'bg-red-500/20 border-red-500/50' : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: sp?.color ?? '#666' }} />
                    {sp?.name}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1 mt-3">
              <label className="text-[10px] text-gray-500">Charms</label>
              {(currentPlayer?.charms ?? []).map((charm: OwnedCharm) => {
                const def = getCharmDef(charm.definitionId);
                const selected = giveCharms.includes(charm.instanceId);
                return (
                  <button
                    key={charm.instanceId}
                    onClick={() => setGiveCharms(selected ? giveCharms.filter((id) => id !== charm.instanceId) : [...giveCharms, charm.instanceId])}
                    className={`w-full text-left text-xs px-2 py-1 rounded border transition-colors ${selected ? 'bg-purple-500/20 border-purple-500/50' : 'bg-gray-800/50 border-gray-700'}`}
                  >
                    {def?.icon} {def?.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* You Receive */}
          <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
            <h3 className="text-xs text-green-400 font-medium mb-2">You Receive</h3>
            <div className="mb-2">
              <label className="text-[10px] text-gray-500">Money</label>
              <Input
                type="number"
                min={0}
                value={receiveMoney}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceiveMoney(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
            <div className="space-y-1">
              {theirProperties.map((p: Property) => {
                const sp = BOARD_SPACES[p.spaceIndex];
                const selected = receiveProps.includes(p.spaceIndex);
                return (
                  <button
                    key={p.spaceIndex}
                    onClick={() => toggleProp(p.spaceIndex, receiveProps, setReceiveProps)}
                    className={`w-full text-left text-xs px-2 py-1 rounded border transition-colors ${
                      selected ? 'bg-green-500/20 border-green-500/50' : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: sp?.color ?? '#666' }} />
                    {sp?.name}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1 mt-3">
              <label className="text-[10px] text-gray-500">Charms</label>
              {((state?.players ?? []).find((p: Player) => p.id === targetId)?.charms ?? []).map((charm: OwnedCharm) => {
                const def = getCharmDef(charm.definitionId);
                const selected = receiveCharms.includes(charm.instanceId);
                return (
                  <button
                    key={charm.instanceId}
                    onClick={() => setReceiveCharms(selected ? receiveCharms.filter((id) => id !== charm.instanceId) : [...receiveCharms, charm.instanceId])}
                    className={`w-full text-left text-xs px-2 py-1 rounded border transition-colors ${selected ? 'bg-purple-500/20 border-purple-500/50' : 'bg-gray-800/50 border-gray-700'}`}
                  >
                    {def?.icon} {def?.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handlePropose}
            disabled={giveMoney === 0 && receiveMoney === 0 && giveProps.length === 0 && receiveProps.length === 0 && giveCharms.length === 0 && receiveCharms.length === 0}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500"
          >
            <ArrowRight className="w-4 h-4 mr-1" /> Propose Trade
          </Button>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
        </div>
      </motion.div>
    </div>
  );
}
