'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameAction } from '@/lib/engine/types';
import { ClientMessage, PublicGameState, PublicRoomPlayer, ServerMessage } from './protocol';

interface RoomInfo {
  code: string;
  hostId: string;
  players: PublicRoomPlayer[];
  state: PublicGameState | null;
}

interface ChatMessage {
  playerId: string;
  name: string;
  message: string;
  sentAt: number;
}

interface Reaction {
  playerId: string;
  emoji: string;
  sentAt: number;
}

interface TurnTimer {
  playerId: string;
  endsAt: number;
}

const SESSION_KEY = 'lucky-tycoon-multiplayer-session';

export function useMultiplayerClient() {
  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<{ code: string; playerId: string; token: string } | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [turnTimer, setTurnTimer] = useState<TurnTimer | null>(null);

  const handleMessage = useCallback((message: ServerMessage) => {
    if (message.type === 'room_created' || message.type === 'room_joined') {
      setPlayerId(message.playerId);
      setToken(message.token);
      sessionRef.current = { code: message.code, playerId: message.playerId, token: message.token };
      localStorage.setItem(SESSION_KEY, JSON.stringify({ code: message.code, playerId: message.playerId, token: message.token }));
      setRoom((current) => ({ code: message.code, hostId: message.hostId, players: current?.players ?? [], state: current?.state ?? null }));
    } else if (message.type === 'room_state') {
      setRoom({ code: message.code, hostId: message.hostId, players: message.players, state: message.state });
    } else if (message.type === 'state') {
      setRoom((current) => current ? { ...current, state: message.state } : current);
    } else if (message.type === 'presence') {
      setRoom((current) => current ? { ...current, hostId: message.hostId, players: message.players } : current);
    } else if (message.type === 'chat') {
      setChatMessages((current) => [...current.slice(-49), message]);
    } else if (message.type === 'reaction') {
      setReactions((current) => [...current.slice(-19), message]);
      window.setTimeout(() => setReactions((current) => current.filter((reaction) => reaction !== message)), 2500);
    } else if (message.type === 'turn_timer') {
      setTurnTimer(message);
    } else if (message.type === 'error') {
      setError(message.message);
    }
  }, []);

  const connect = useCallback((message: ClientMessage) => {
    setError(null);
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    socketRef.current?.close();
    const socket = new WebSocket(process.env.NEXT_PUBLIC_MULTIPLAYER_URL ?? 'ws://localhost:3001');
    socketRef.current = socket;
    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify(message));
    };
    socket.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data) as ServerMessage);
      } catch {
        setError('Received an invalid multiplayer response.');
      }
    };
    socket.onerror = () => setError('Unable to connect to the multiplayer server.');
    socket.onclose = () => {
      setConnected(false);
      if (sessionRef.current && !reconnectTimerRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          const session = sessionRef.current;
          if (session) connect({ type: 'reconnect', ...session });
        }, 2000);
      }
    };
  }, [handleMessage]);

  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError('The multiplayer connection is not ready.');
      return;
    }
    socketRef.current.send(JSON.stringify(message));
  }, []);

  const createRoom = useCallback((name: string) => connect({ type: 'create_room', name }), [connect]);
  const joinRoom = useCallback((code: string, name: string) => connect({ type: 'join_room', code: code.trim().toUpperCase(), name }), [connect]);
  const startGame = useCallback(() => send({ type: 'start_game' }), [send]);
  const sendAction = useCallback((action: GameAction) => send({ type: 'action', action }), [send]);
  const sendChat = useCallback((message: string) => send({ type: 'chat', message }), [send]);
  const sendReaction = useCallback((emoji: string) => send({ type: 'reaction', emoji }), [send]);
  const leaveRoom = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: 'leave_room' }));
    localStorage.removeItem(SESSION_KEY);
    sessionRef.current = null;
    socketRef.current?.close();
    setRoom(null);
    setPlayerId(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { code: string; playerId: string; token: string };
      connect({ type: 'reconnect', ...session });
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  return { connected, room, playerId, token, error, chatMessages, reactions, turnTimer, createRoom, joinRoom, startGame, sendAction, sendChat, sendReaction, leaveRoom };
}
