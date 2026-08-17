'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LogOut, MessageCircle, Send, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MultiplayerHudProps {
  playerId: string | null;
  connected: boolean;
  chatMessages: { playerId: string; name: string; message: string; sentAt: number }[];
  reactions: { playerId: string; emoji: string; sentAt: number }[];
  turnTimer: { playerId: string; endsAt: number } | null;
  sendChat: (message: string) => void;
  sendReaction: (emoji: string) => void;
  onLeave: () => void;
}

export default function MultiplayerHud({ playerId, connected, chatMessages, reactions, turnTimer, sendChat, sendReaction, onLeave }: MultiplayerHudProps) {
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsLeft = turnTimer && now ? Math.max(0, Math.ceil((turnTimer.endsAt - now) / 1000)) : null;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    sendChat(message.trim());
    setMessage('');
  };

  return (
    <>
      {reactions.map((reaction) => (
        <div key={`${reaction.playerId}-${reaction.sentAt}`} className="pointer-events-none fixed bottom-24 right-8 z-[120] animate-bounce text-4xl">
          {reaction.emoji}
        </div>
      ))}
      <div className="fixed bottom-4 right-4 z-[115] w-72 rounded-xl border border-cyan-500/20 bg-gray-950/95 p-3 shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-cyan-400" /> Room chat <span className={connected ? 'text-emerald-400' : 'text-red-400'}>{connected ? '●' : '○'}</span></span>
          <button type="button" onClick={onLeave} className="flex items-center gap-1 text-gray-500 hover:text-red-400" title="Leave room"><LogOut className="h-3 w-3" /> Leave</button>
          {secondsLeft != null && <span className={`flex items-center gap-1 ${turnTimer?.playerId === playerId ? 'text-yellow-300' : 'text-gray-500'}`}><Timer className="h-3.5 w-3.5" /> {secondsLeft}s</span>}
        </div>
        <div className="mb-2 max-h-28 space-y-1 overflow-y-auto text-xs">
          {chatMessages.length === 0 && <div className="text-gray-600">No messages yet.</div>}
          {chatMessages.map((chat) => <div key={`${chat.playerId}-${chat.sentAt}`} className="text-gray-300"><span className="text-cyan-300">{chat.name}:</span> {chat.message}</div>)}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Say something..." className="h-8 border-gray-700 bg-gray-900 text-xs" />
          <Button type="submit" size="icon-sm" aria-label="Send chat message" className="bg-cyan-600 hover:bg-cyan-500"><Send className="h-3.5 w-3.5" /></Button>
        </form>
        <div className="mt-2 flex gap-1">
          {['👍', '🎉', '😈', '🍀'].map((emoji) => <button key={emoji} type="button" onClick={() => sendReaction(emoji)} className="rounded-md px-2 py-1 text-sm hover:bg-gray-800" aria-label={`Send ${emoji} reaction`}>{emoji}</button>)}
        </div>
      </div>
    </>
  );
}
