export interface ClockAnomaly { detected: boolean; reason?: 'clock_moved_backwards' | 'large_forward_jump'; }
/** Detection only. This helper never mutates or pauses game tasks. */
export function detectClockAnomaly(previousAt: number, currentAt: number, forwardThresholdMs = 24 * 60 * 60 * 1000): ClockAnomaly {
  if (currentAt < previousAt) return { detected: true, reason: 'clock_moved_backwards' };
  if (currentAt - previousAt > forwardThresholdMs) return { detected: true, reason: 'large_forward_jump' };
  return { detected: false };
}
