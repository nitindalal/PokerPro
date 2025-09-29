# Poker Practice Game (Engine + Web)

## Quick start
1. `npm i`
2. `npm run dev` → launches the Vite web app
3. `npm run test` → runs engine unit tests

## Repo philosophy
- Engine is **UI-agnostic** and **pure functions** (no DOM, no timers).
- Web app is the **shell** that drives the engine and handles async (human/bot input).
- Seedable RNG for reproducible runs; hand history for replays.

## Next steps
- Fill out betting logic (side pots optional in v1).
- Replace `evaluate.ts` with a fast 7-card evaluator (or wrap a library).
- Add bots in a separate package or in `engine/src/bots` behind an interface.
