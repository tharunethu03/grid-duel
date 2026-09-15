# Grid Duel

A real-time 2-player game built with Next.js, deployable on Vercel.

One player picks a number from a scattered board of numbers; the other player
has to find it on their own board while the first player races to cross off
squares on a grid. Whoever finds/crosses fastest swaps roles — first to fully
cross their grid wins.

## Architecture

Runs entirely on standard Vercel serverless/Node functions — no custom server:

- **Next.js API routes** (`app/api/room/[action]/route.ts`) hold all game logic.
- **Upstash Redis** stores each room's state (rooms auto-expire after 6 hours).
- **Pusher Channels** pushes state updates to both players in real time.

## Setup

1. Create a free Redis database at [Upstash](https://console.upstash.com) (or
   add the Upstash integration from the Vercel Marketplace) and copy its REST
   URL + token.
2. Create a free app at [Pusher Channels](https://dashboard.pusher.com) and
   copy its app id, key, secret, and cluster.
3. Copy `.env.example` to `.env.local` and fill in those values.

```bash
npm install
npm run dev
```

Open http://localhost:3000, create a room, and share the code with a friend
(or open a second tab) to join.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add the same variables from `.env.example` under Project → Settings →
   Environment Variables (or connect the Upstash/Pusher integrations, which
   set them automatically).
3. Deploy — no other configuration needed.
