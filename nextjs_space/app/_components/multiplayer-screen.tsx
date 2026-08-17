'use client';

import { useState } from 'react';
import { ArrowLeft, Copy, Gamepad2, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GameBoard from './game-board';
import MultiplayerHud from './multiplayer-hud';
import { useMultiplayerClient } from '@/lib/multiplayer/client';

export default function MultiplayerScreen({ onBack }: { onBack: () => void }) {
  const client = useMultiplayerClient();
  const [name, setName] = useState('Player');
  const [code, setCode] = useState('');

  if (client.room?.state) {
    const currentPlayerId = `player-${client.room.state.currentPlayerIndex}`;
    const isTradeRecipient = client.room.state.tradeOffer?.status === 'pending' && client.room.state.tradeOffer.toPlayerId === client.playerId;
    const canAct = currentPlayerId === client.playerId || !!isTradeRecipient;
    const sendAuthorizedAction = (action: Parameters<typeof client.sendAction>[0]) => {
      if (canAct) client.sendAction(action);
    };
    return (
      <div>
        <GameBoard
          externalState={client.room.state}
          onExternalAction={sendAuthorizedAction}
          onExternalRoll={() => { if (canAct) client.sendAction({ type: 'ROLL_DICE' }); }}
          onlineMode
          onlineCanAct={canAct}
        />
        <MultiplayerHud
          playerId={client.playerId}
          connected={client.connected}
          chatMessages={client.chatMessages}
          reactions={client.reactions}
          turnTimer={client.turnTimer}
          sendChat={client.sendChat}
          sendReaction={client.sendReaction}
          onLeave={() => { client.leaveRoom(); onBack(); }}
        />
      </div>
    );
  }

  const isHost = client.room && client.playerId === client.room.hostId;
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-lg">
        <Button variant="ghost" onClick={onBack} className="mb-6 text-gray-400 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="rounded-2xl border border-cyan-500/20 bg-gray-900/80 p-6 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <Gamepad2 className="h-7 w-7 text-cyan-400" />
            <div>
              <h1 className="font-display text-2xl font-bold text-cyan-300">Online Multiplayer</h1>
              <p className="text-xs text-gray-500">Create or join an authoritative game room.</p>
            </div>
          </div>

          {!client.room ? (
            <div className="space-y-4">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="border-gray-700 bg-gray-800 text-white" />
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => client.createRoom(name)} className="bg-cyan-600 hover:bg-cyan-500">Create Room</Button>
                <Button onClick={() => client.joinRoom(code, name)} variant="outline" className="border-cyan-700 text-cyan-300">Join Room</Button>
              </div>
              <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Room code" className="border-gray-700 bg-gray-800 uppercase text-white" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div><div className="text-xs text-gray-500">Room code</div><div className="font-mono text-2xl font-bold tracking-widest text-cyan-300">{client.room.code}</div></div>
                <Button variant="ghost" size="icon-sm" onClick={() => navigator.clipboard?.writeText(client.room!.code)} title="Copy room code"><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500"><Users className="h-3.5 w-3.5" /> Players</div>
                {client.room.players.map((player) => <div key={player.id} className="flex items-center justify-between rounded-md bg-gray-800/60 px-3 py-2 text-sm"><span>{player.name}</span><span className={player.connected ? 'text-emerald-400' : 'text-gray-600'}>{player.connected ? 'Connected' : 'Reconnecting'}</span></div>)}
              </div>
              {isHost && <Button onClick={client.startGame} disabled={client.room.players.length < 2} className="w-full bg-emerald-600 hover:bg-emerald-500"><Play className="mr-2 h-4 w-4" /> Start Game</Button>}
              {!isHost && <p className="text-center text-xs text-gray-500">Waiting for the host to start the game.</p>}
            </div>
          )}
          {client.error && <p className="mt-4 text-sm text-red-400">{client.error}</p>}
          {!client.connected && <p className="mt-4 text-xs text-amber-400">Connecting to the multiplayer server...</p>}
        </div>
      </div>
    </main>
  );
}
