'use client';
import { useState } from 'react';
import { GameState, Player, Property } from '@/lib/engine/types';
import { BOARD_SPACES } from '@/lib/engine/board-data';
import { getCharmDef } from '@/lib/engine/charms-data';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowDownCircle, Skull } from 'lucide-react';

interface BankruptcyModalProps {
  state: GameState;
  onAction: (action: any) => void;
}

export default function BankruptcyModal({ state, onAction }: BankruptcyModalProps) {
  const player = state?.players?.[state?.currentPlayerIndex ?? 0];
  if (!player) return null;

  const ownedProps = (state?.properties ?? []).filter((p: Property) => p.ownerId === player?.id);
  const upgradedProps = ownedProps.filter((p: Property) => (p.tier ?? 0) > 0);
  const charms = player?.charms ?? [];
  const debt = state?.bankruptcyDebt ?? 0;
  const canPayDebt = (player?.money ?? 0) >= debt;

  const canSellSomething = ownedProps.length > 0 || charms.length > 0 || upgradedProps.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-red-500/30 rounded-xl p-6 max-w-md w-full"
      >
        <div className="flex items-center gap-2 mb-4 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="font-display font-bold text-lg">Bankruptcy Warning!</h2>
        </div>
        <p className="text-sm text-gray-300 mb-4">
          {player.name}, you can't cover your debts! Sell assets to raise funds or declare bankruptcy.
        </p>
        <p className="text-sm text-yellow-400 mb-4">Current funds: {(player?.money ?? 0).toLocaleString('en-US')} coins</p>
        <p className="text-sm text-red-300 mb-4">Debt due: {debt.toLocaleString('en-US')} coins</p>

        {/* Sell upgrades */}
        {upgradedProps.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs text-gray-400 mb-1">Sell Upgrades</h3>
            <div className="space-y-1">
              {upgradedProps.map((p: Property) => {
                const sp = BOARD_SPACES[p.spaceIndex];
                const refund = Math.floor((sp?.upgradeCost ?? 0) / 2);
                return (
                  <Button
                    key={p.spaceIndex}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs border-orange-700 text-orange-400"
                    onClick={() => onAction({ type: 'SELL_UPGRADE', spaceIndex: p.spaceIndex })}
                  >
                    <ArrowDownCircle className="w-3 h-3 mr-1" />
                    Downgrade {sp?.name} (+{refund}c)
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mortgage properties */}
        {ownedProps.some((p: Property) => !p.mortgaged && (p.tier ?? 0) === 0) && (
          <div className="mb-3">
            <h3 className="text-xs text-gray-400 mb-1">Mortgage Properties</h3>
            <div className="space-y-1">
              {ownedProps.filter((p: Property) => !p.mortgaged && (p.tier ?? 0) === 0).map((p: Property) => {
                const sp = BOARD_SPACES[p.spaceIndex];
                const value = Math.floor((sp?.price ?? 0) / 2);
                return (
                  <Button
                    key={p.spaceIndex}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs border-red-700 text-red-400"
                    onClick={() => onAction({ type: 'MORTGAGE_PROPERTY', spaceIndex: p.spaceIndex })}
                  >
                    Mortgage {sp?.name} (+{value}c)
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sell charms */}
        {charms.length > 0 && (
          <div className="mb-3">
            <h3 className="text-xs text-gray-400 mb-1">Sell Charms</h3>
            <div className="space-y-1">
              {charms.map((c: any) => {
                const def = getCharmDef(c?.definitionId ?? '');
                return (
                  <Button
                    key={c.instanceId}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs border-purple-700 text-purple-400"
                    onClick={() => onAction({ type: 'SELL_CHARM', instanceId: c.instanceId })}
                  >
                    Sell {def?.icon} {def?.name} (+{def?.sellValue ?? 0}c)
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* After selling, can try to end turn (the reducer will check if they can pay) */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => onAction({ type: 'END_TURN' })}
            disabled={!canPayDebt}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500"
          >
            {canPayDebt ? 'Pay Debt & Continue' : 'Sell Assets to Continue'}
          </Button>
          <Button
            onClick={() => onAction({ type: 'DECLARE_BANKRUPTCY' })}
            variant="destructive"
            className="flex-1"
          >
            <Skull className="w-4 h-4 mr-1" /> Declare Bankruptcy
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
