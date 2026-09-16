import type { GameMode } from "./types";

export interface ModeInfo {
  emoji: string;
  title: string;
  tagline: string;
  steps: string[];
}

export const MODE_INFO: Record<GameMode, ModeInfo> = {
  classic: {
    emoji: "⚔️",
    title: "Classic",
    tagline: "The original 1v1 duel",
    steps: [
      "🧑‍🤝‍🧑 Exactly 2 players go head-to-head.",
      "🔀 One player hides a number, the other hunts for it — then you swap each round.",
      "🏆 Cross your whole grid first, or find the number first, to win the round!",
    ],
  },
  teams: {
    emoji: "🛡️",
    title: "Team",
    tagline: "Squad up and duel together",
    steps: [
      "👥 Everyone joins Team A or Team B.",
      "🔀 One team hides the number together while the other team searches for it.",
      "🏆 Roles swap each round — win a round to score a point for your team!",
    ],
  },
  cycle: {
    emoji: "🔁",
    title: "Cycle",
    tagline: "Great for 3+ players",
    steps: [
      "🎲 One random player starts as the Finder, everyone else crosses.",
      "🔎 Crossers race to fill their grid before the Finder finds the number.",
      "🔁 Whoever crossed the fewest squares becomes the next Finder!",
    ],
  },
};
