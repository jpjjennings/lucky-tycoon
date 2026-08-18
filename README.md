# Lucky Tycoon

Browser-based, pass-and-play board game with a roguelite Lucky Charms system.

## Development

```bash
cd nextjs_space
npm install
npm run dev
```

The game is client-side and persists the current game in browser local storage. No database or environment variables are required for the core game.

On Windows, use `windows_scripts\start_dev.bat` to start the Next.js and multiplayer development servers in separate command windows. Use `windows_scripts\stop_dev.bat` to stop Lucky Tycoon development processes. On macOS/Linux, run `mac_scripts/start_dev` and `mac_scripts/stop_dev`. The scripts use `DEV_PORT` and `DEV_URL` when set.

## Multiplayer Server (Sprint 7 foundation)

Start the authoritative WebSocket room server separately:

```bash
cd nextjs_space
npm run multiplayer:server
```

The server listens on `ws://localhost:3001` by default. Set `MULTIPLAYER_PORT` to change the port and `MULTIPLAYER_TURN_MS` to change the 60-second turn limit. The current server foundation supports room codes, reconnect tokens, host migration, presence, chat, reactions, server-validated reducer actions, and public state broadcasts with RNG internals removed. The browser game client still needs a multiplayer lobby adapter before online rooms are exposed in the UI.
