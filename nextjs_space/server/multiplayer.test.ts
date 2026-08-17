import assert from 'node:assert/strict';
import test from 'node:test';
import { WebSocket } from 'ws';
import { RoomManager } from './multiplayer-server';

function fakeSocket() {
  const messages: unknown[] = [];
  const socket = {
    readyState: WebSocket.OPEN,
    send(payload: string) {
      messages.push(JSON.parse(payload));
    },
  } as unknown as WebSocket;
  return { socket, messages };
}

test('authoritative room server creates rooms, validates turns, and migrates hosts', () => {
  const manager = new RoomManager();
  const first = fakeSocket();
  const second = fakeSocket();
  const host = manager.createRoom(first.socket, 'Host');
  const guest = manager.joinRoom(second.socket, host.token ? 'INVALID' : '', 'Guest');
  assert.equal(guest, null);

  const room = manager.getRoom((first.messages.find((message: any) => message.type === 'room_created') as any).code);
  assert.ok(room);
  const joined = manager.joinRoom(second.socket, room!.code, 'Guest');
  assert.ok(joined);
  assert.equal(manager.startGame(second.socket), false);
  assert.equal(manager.startGame(first.socket), true);
  assert.ok(room!.state?.seed);

  assert.equal(manager.applyAction(second.socket, { type: 'ROLL_DICE' }), false);
  assert.equal(manager.applyAction(first.socket, { type: 'ROLL_DICE' }), true);
  const publicState = second.messages.find((message: any) => message.type === 'state') as any;
  assert.equal(publicState.state.seed, 0);
  assert.equal(publicState.state.rngState, 0);

  manager.disconnect(first.socket);
  assert.equal(manager.getRoom(room!.code)?.hostId, 'player-1');
  manager.dispose();
});

test('intentional leave forfeits the player and ends a two-player game', () => {
  const manager = new RoomManager();
  const first = fakeSocket();
  const second = fakeSocket();
  manager.createRoom(first.socket, 'Host');
  const code = (first.messages.find((message: any) => message.type === 'room_created') as any).code;
  manager.joinRoom(second.socket, code, 'Guest');
  assert.equal(manager.startGame(first.socket), true);
  assert.equal(manager.leaveRoom(first.socket), true);
  assert.equal(manager.getRoom(code)?.state?.phase, 'GAME_OVER');
  assert.equal(manager.getRoom(code)?.state?.players[0].isAlive, false);
  manager.dispose();
});
