import { describe, expect, it } from 'vitest';
import { calculatePrize, calculateWinRate, rollWin } from '../src/domain/probability';
describe('probability domain', () => {
  it('adds 1% win rate per luck level and caps at 80%', () => {
    expect(calculateWinRate(0.3, 5)).toBeCloseTo(0.35);
    expect(calculateWinRate(0.75, 10)).toBe(0.8);
  });
  it('applies 5% prize multiplier per wealth level and floors to integer', () => {
    expect(calculatePrize(100, 4)).toBe(120);
    expect(calculatePrize(101, 1)).toBe(106);
  });
  it('uses injected random source for deterministic roll', () => {
    expect(rollWin(0.3, () => 0.2)).toBe(true);
    expect(rollWin(0.3, () => 0.8)).toBe(false);
  });
});
