import type { GameState, Result, Transaction } from '../types/game';
import { createId } from '../utils/id';
export function recordTransaction(state: GameState, type: Transaction['type'], amount: number, reason: Transaction['reason'], referenceId: string, now = Date.now()): void {
  state.transactions.unshift({ id: createId('txn'), type, amount, reason, referenceId, createdAt: now });
  if (state.transactions.length > 500) state.transactions.length = 500;
}
export function spend(state: GameState, amount: number, reason: Transaction['reason'], referenceId: string, now = Date.now()): Result {
  if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: '金额必须是非负整数' };
  if (state.coins < amount) return { ok: false, error: '金币不足' };
  state.coins -= amount; state.statistics.totalSpent += amount; recordTransaction(state, 'expense', amount, reason, referenceId, now); return { ok: true, data: undefined };
}
export function earn(state: GameState, amount: number, referenceId: string, now = Date.now()): void {
  state.coins += amount; state.statistics.totalEarned += amount; recordTransaction(state, 'income', amount, 'ticket_reward', referenceId, now);
}
