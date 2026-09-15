# Grid Duel

A real-time 2-player game built with Next.js and Socket.IO.

One player picks a number from a scattered board of numbers; the other player
has to find it on their own board while the first player races to cross off
squares on a grid. Whoever finds/crosses fastest swaps roles — first to fully
cross their grid wins.

## Running

```bash
npm install
npm run dev
```

Open http://localhost:3000, create a room, and share the code with a friend
(or open a second tab) to join.

Uses a custom Node server (`server.ts`) so Socket.IO can run alongside
Next.js — `npm run build && npm start` for production.
# grid-duel
