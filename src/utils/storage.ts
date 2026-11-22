import type { GameState } from '../types/game';
export const SAVE_KEY = 'lucky-scratch-save';
export function loadGame(): GameState | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const parsed = JSON.parse(raw) as GameState; if (parsed.version !== 1 || !Number.isFinite(parsed.coins) || !Array.isArray(parsed.tickets) || !parsed.machine) return null; return parsed; }
  catch { return null; }
}
export function saveGame(state: GameState): void { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
