# Lucky Tycoon

Browser-based, pass-and-play board game with a roguelite Lucky Charms system.

## Development

```bash
cd nextjs_space
npm install
npm run dev
```

The game is client-side and persists the current game in browser local storage. No database or environment variables are required for the core game.

## Multiplayer Server (Sprint 7 foundation)

Start the authoritative WebSocket room server separately:

```bash
cd nextjs_space
npm run multiplayer:server
```

The server listens on `ws://localhost:3001` by default. Set `MULTIPLAYER_PORT` to change the port and `MULTIPLAYER_TURN_MS` to change the 60-second turn limit. The current server foundation supports room codes, reconnect tokens, host migration, presence, chat, reactions, server-validated reducer actions, and public state broadcasts with RNG internals removed. The browser game client still needs a multiplayer lobby adapter before online rooms are exposed in the UI.
