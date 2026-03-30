import { getIo } from "./socketHub.js";

/** @param {import("socket.io").Server} io */
function io() {
  const instance = getIo();
  if (!instance) {
    return null;
  }
  return instance;
}

// Round lifecycle (server → client)
export function emitRoundStarted(payload) {
  io()?.to("global").emit("round:started", payload);
}

export function emitRoundTick(payload) {
  io()?.to("global").emit("round:tick", payload);
}

export function emitRoundSettled(payload) {
  io()?.to("global").emit("round:settled", payload);
}

// Per-team updates
export function emitPortfolioUpdated(teamId, payload) {
  io()?.to(`team:${teamId}`).emit("portfolio:updated", payload);
}

// Leaderboard (everyone in global, including admin — admin also joined `global`)
export function emitLeaderboardUpdated(payload) {
  io()?.to("global").emit("leaderboard:updated", payload);
}

// Admin-only order book
export function emitOrderbookUpdated(payload) {
  io()?.to("admin").emit("orderbook:updated", payload);
}
