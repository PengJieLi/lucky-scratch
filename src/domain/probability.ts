import { MAX_WIN_RATE } from '../config/game';
export function calculateWinRate(baseRate: number, luckLevel: number): number { return Math.min(MAX_WIN_RATE, Math.max(0, baseRate + luckLevel * 0.01)); }
export function calculatePrize(basePrize: number, wealthLevel: number): number { return Math.floor(basePrize * (1 + wealthLevel * 0.05)); }
export function rollWin(rate: number, random = Math.random): boolean { return random() < rate; }
