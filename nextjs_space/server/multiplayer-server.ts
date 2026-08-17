import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { createInitialState, gameReducer } from '../lib/engine/reducer';
import { GameAction, GameConfig, GameState } from '../lib/engine/types';
import {
  ClientMessage,
  parseClientMessage,
  PublicRoomPlayer,
  ServerMessage,
  toPublicState,
} from '../lib/multiplayer/protocol';

const PORT = Number(process.env.MULTIPLAYER_PORT ?? 3001);
const TURN_LIMIT_MS = Number(process.env.MULTIPLAYER_TURN_MS ?? 60_000);
const RECONNECT_GRACE_MS = 30_000;

interface RoomMember {
  id: string;
  name: string;
  token: string;
  socket: WebSocket | null;
  connected: boolean;
  disconnectTimer: NodeJS.Timeout | null;
  left: boolean;
}

interface Room {
  code: string;
  hostId: string;
  config?: Partial<GameConfig>;
  members: RoomMember[];
  state: GameState | null;
  turnTimer: NodeJS.Timeout | null;
  emptyTimer: NodeJS.Timeout | null;
}

interface Session {
  roomCode: string;
  playerId: string;
}

function makeCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

function makeToken(): string {
  return randomBytes(24).toString('hex');
}

function publicPlayers(room: Room): PublicRoomPlayer[] {
  return room.members.map(({ id, name, connected }) => ({ id, name, connected }));
}

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private sessions = new Map<WebSocket, Session>();
  private rateLimits = new Map<WebSocket, { startedAt: number; count: number }>();

  createRoom(socket: WebSocket, name: string, config?: Partial<GameConfig>): RoomMember {
    let code = makeCode();
    while (this.rooms.has(code)) code = makeCode();
    const member: RoomMember = { id: 'player-0', name: this.cleanName(name), token: makeToken(), socket, connected: true, disconnectTimer: null, left: false };
    const room: Room = { code, hostId: member.id, config, members: [member], state: null, turnTimer: null, emptyTimer: null };
    this.rooms.set(code, room);
    this.sessions.set(socket, { roomCode: code, playerId: member.id });
    send(socket, { type: 'room_created', code, playerId: member.id, token: member.token, hostId: room.hostId });
    this.broadcastRoomState(room);
    return member;
  }

  joinRoom(socket: WebSocket, code: string, name: string): RoomMember | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || room.state || room.members.length >= 4) return null;
    const member: RoomMember = {
      id: `player-${room.members.length}`,
      name: this.cleanName(name),
      token: makeToken(),
      socket,
      connected: true,
      disconnectTimer: null,
      left: false,
    };
    room.members.push(member);
    this.sessions.set(socket, { roomCode: room.code, playerId: member.id });
    send(socket, { type: 'room_joined', code: room.code, playerId: member.id, token: member.token, hostId: room.hostId });
    this.broadcastRoomState(room);
    return member;
  }

  reconnect(socket: WebSocket, code: string, playerId: string, token: string): boolean {
    const room = this.rooms.get(code.toUpperCase());
    const member = room?.members.find((candidate) => candidate.id === playerId && candidate.token === token);
    if (!room || !member || member.left) return false;
    if (member.socket && member.socket !== socket) {
      this.sessions.delete(member.socket);
      member.socket.close(4001, 'Reconnected elsewhere');
    }
    if (member.disconnectTimer) clearTimeout(member.disconnectTimer);
    member.socket = socket;
    member.connected = true;
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    room.emptyTimer = null;
    this.sessions.set(socket, { roomCode: room.code, playerId });
    send(socket, { type: 'room_joined', code: room.code, playerId, token: member.token, hostId: room.hostId });
    this.broadcastRoomState(room);
    return true;
  }

  startGame(socket: WebSocket): boolean {
    const session = this.sessions.get(socket);
    const room = session ? this.rooms.get(session.roomCode) : undefined;
    if (!room || !session || session.playerId !== room.hostId || room.state || room.members.length < 2) return false;
    room.state = createInitialState(room.members.map((member) => member.name), undefined, room.config);
    this.broadcastState(room);
    this.scheduleTurnTimer(room);
    return true;
  }

  applyAction(socket: WebSocket, action: GameAction): boolean {
    const session = this.sessions.get(socket);
    const room = session ? this.rooms.get(session.roomCode) : undefined;
    if (!room?.state || !session || !this.isAuthorized(room, session.playerId, action)) return false;
    const next = gameReducer(room.state, action);
    if (next === room.state) return false;
    const turnChanged = next.currentPlayerIndex !== room.state.currentPlayerIndex;
    room.state = next;
    this.broadcastState(room);
    if (turnChanged || next.phase === 'GAME_OVER') this.scheduleTurnTimer(room);
    return true;
  }

  chat(socket: WebSocket, message: string): boolean {
    const session = this.sessions.get(socket);
    const room = session ? this.rooms.get(session.roomCode) : undefined;
    const member = room && session ? room.members.find((candidate) => candidate.id === session.playerId) : undefined;
    if (!room || !member || !message.trim()) return false;
    this.broadcast(room, { type: 'chat', playerId: member.id, name: member.name, message: message.trim().slice(0, 500), sentAt: Date.now() });
    return true;
  }

  leaveRoom(socket: WebSocket): boolean {
    return this.disconnect(socket, true);
  }

  disconnect(socket: WebSocket, intentional = false): boolean {
    const session = this.sessions.get(socket);
    this.sessions.delete(socket);
    this.rateLimits.delete(socket);
    if (!session) return false;
    const room = this.rooms.get(session.roomCode);
    const member = room?.members.find((candidate) => candidate.id === session.playerId);
    if (!room || !member) return false;
    member.connected = false;
    member.socket = null;
    member.left = intentional;
    if (room.hostId === member.id) {
      const nextHost = room.members.find((candidate) => candidate.connected);
      if (nextHost) room.hostId = nextHost.id;
    }
    this.broadcastPresence(room);
    if (intentional && room.state) this.forfeit(room, member.id);
    if (intentional) return true;
    member.disconnectTimer = setTimeout(() => {
      if (!member.connected && !member.left) this.forfeit(room, member.id);
    }, RECONNECT_GRACE_MS);
    if (!room.members.some((candidate) => candidate.connected)) {
      room.emptyTimer = setTimeout(() => this.rooms.delete(room.code), RECONNECT_GRACE_MS);
    }
    return true;
  }

  reaction(socket: WebSocket, emoji: string): boolean {
    const session = this.sessions.get(socket);
    const room = session ? this.rooms.get(session.roomCode) : undefined;
    if (!room || !session || !emoji.trim()) return false;
    this.broadcast(room, { type: 'reaction', playerId: session.playerId, emoji: emoji.trim().slice(0, 8), sentAt: Date.now() });
    return true;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  allowMessage(socket: WebSocket): boolean {
    const now = Date.now();
    const current = this.rateLimits.get(socket);
    if (!current || now - current.startedAt >= 10_000) {
      this.rateLimits.set(socket, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= 60;
  }

  dispose(): void {
    for (const room of this.rooms.values()) {
      if (room.turnTimer) clearTimeout(room.turnTimer);
      if (room.emptyTimer) clearTimeout(room.emptyTimer);
      room.members.forEach((member) => {
        if (member.disconnectTimer) clearTimeout(member.disconnectTimer);
      });
    }
    this.rooms.clear();
    this.sessions.clear();
    this.rateLimits.clear();
  }

  private isAuthorized(room: Room, playerId: string, action: GameAction): boolean {
    if (action.type === 'PROPOSE_TRADE' || action.type === 'COUNTER_TRADE') return action.offer.fromPlayerId === playerId;
    if (action.type === 'RESPOND_TRADE') return room.state?.tradeOffer?.toPlayerId === playerId;
    const currentId = `player-${room.state?.currentPlayerIndex ?? -1}`;
    return currentId === playerId;
  }

  private scheduleTurnTimer(room: Room): void {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    if (!room.state || room.state.phase === 'GAME_OVER') return;
    const playerId = `player-${room.state.currentPlayerIndex}`;
    const endsAt = Date.now() + TURN_LIMIT_MS;
    this.broadcast(room, { type: 'turn_timer', playerId, endsAt });
    room.turnTimer = setTimeout(() => {
      if (!room.state || room.state.phase === 'GAME_OVER' || `player-${room.state.currentPlayerIndex}` !== playerId) return;
      this.advanceTimedOutTurn(room);
    }, TURN_LIMIT_MS);
  }

  private applyServerAction(room: Room, action: GameAction): void {
    if (!room.state) return;
    const next = gameReducer(room.state, action);
    if (next === room.state) return;
    room.state = next;
    this.broadcastState(room);
    this.scheduleTurnTimer(room);
  }

  private forfeit(room: Room, playerId: string): void {
    if (!room.state || room.state.phase === 'GAME_OVER') return;
    const next = gameReducer(room.state, { type: 'PLAYER_LEFT', playerId });
    if (next === room.state) return;
    room.state = next;
    this.broadcastState(room);
    this.scheduleTurnTimer(room);
  }

  private advanceTimedOutTurn(room: Room): void {
    if (!room.state) return;
    const phase = room.state.phase;
    if (phase === 'CHARM_SHOP') this.applyServerAction(room, { type: 'CLOSE_SHOP' });
    else if (phase === 'EVENT_RESOLUTION') this.applyServerAction(room, { type: 'RESOLVE_EVENT' });
    else if (phase === 'RISK_CHOICE') this.applyServerAction(room, { type: 'RISK_CHOOSE', safe: true });
    else if (phase === 'BANKRUPTCY') this.applyServerAction(room, { type: 'DECLARE_BANKRUPTCY' });
    else if (phase === 'TRADING' && room.state.tradeOffer) this.applyServerAction(room, { type: 'RESPOND_TRADE', accept: false });
    else this.applyServerAction(room, { type: 'END_TURN' });
  }

  private broadcastState(room: Room): void {
    if (room.state) this.broadcast(room, { type: 'state', state: toPublicState(room.state) });
  }

  private broadcastRoomState(room: Room): void {
    this.broadcast(room, { type: 'room_state', code: room.code, hostId: room.hostId, players: publicPlayers(room), state: room.state ? toPublicState(room.state) : null });
    this.broadcastPresence(room);
  }

  private broadcastPresence(room: Room): void {
    this.broadcast(room, { type: 'presence', players: publicPlayers(room), hostId: room.hostId });
  }

  private broadcast(room: Room, message: ServerMessage): void {
    room.members.forEach((member) => send(member.socket, message));
  }

  private cleanName(name: string): string {
    return name.trim().slice(0, 24) || 'Player';
  }
}

function startServer(): void {
  const manager = new RoomManager();
  const httpServer = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    response.writeHead(404);
    response.end();
  });
  const server = new WebSocketServer({ server: httpServer });
  server.on('connection', (socket) => {
    socket.on('message', (data) => {
      if (!manager.allowMessage(socket)) return send(socket, { type: 'error', code: 'RATE_LIMITED', message: 'Too many messages. Please slow down.' });
      const message = parseClientMessage(data.toString());
      if (!message) return send(socket, { type: 'error', code: 'BAD_MESSAGE', message: 'Invalid message.' });
      let success = false;
      if (message.type === 'create_room') manager.createRoom(socket, message.name, message.config);
      else if (message.type === 'join_room') success = !!manager.joinRoom(socket, message.code, message.name);
      else if (message.type === 'reconnect') success = manager.reconnect(socket, message.code, message.playerId, message.token);
      else if (message.type === 'start_game') success = manager.startGame(socket);
      else if (message.type === 'leave_room') success = manager.leaveRoom(socket);
      else if (message.type === 'action') success = manager.applyAction(socket, message.action);
      else if (message.type === 'chat') success = manager.chat(socket, message.message);
      else if (message.type === 'reaction') success = manager.reaction(socket, message.emoji);
      if (!success && !['create_room', 'chat', 'reaction'].includes(message.type)) send(socket, { type: 'error', code: 'NOT_ALLOWED', message: 'Action is not allowed.' });
    });
    socket.on('close', () => manager.disconnect(socket));
  });
  httpServer.listen(PORT, () => console.log(`Multiplayer server listening on ws://localhost:${PORT}`));
}

if (process.argv[1]?.endsWith('multiplayer-server.ts')) startServer();
