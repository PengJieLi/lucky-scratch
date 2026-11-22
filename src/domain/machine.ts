
import type {
  GameState,
  Result,
  Ticket,
  VerifyTask,
} from '../types/game';

import { WAITING_QUEUE_CAPACITY } from '../config/game';
import { createId } from '../utils/id';

/**
 * 提交已经刮开的彩票。
 *
 * 第三个参数保留旧版 now 参数位置，
 * 第四个参数传入验票时长。
 */
export function submitWinner(
  state: GameState,
  ticket: Ticket,
  now = Date.now(),
  duration = 5000,
): Result<VerifyTask> {
  if (
    ticket.status !== 'scratched' ||
    ticket.isWinner === null
  ) {
    return {
      ok: false,
      error: '请先完成全部刮奖区域，再提交验票',
    };
  }

  if (
    state.machine.queue.length >= WAITING_QUEUE_CAPACITY &&
    state.machine.currentTask
  ) {
    return {
      ok: false,
      error: '验票等待队列已满，请稍后再试',
    };
  }

  const task: VerifyTask = {
    id: createId('task'),
    ticketId: ticket.id,

    // 未中奖的彩票奖励为 0。
    reward: ticket.isWinner ? ticket.prize : 0,

    status: 'queued',
    createdAt: now,
    duration,
    settled: false,
  };

  ticket.status = 'queued';
  ticket.submittedAt = now;

  if (!state.machine.currentTask) {
    startTask(state, task, now);
  } else {
    state.machine.queue.push(task);
  }

  return {
    ok: true,
    data: task,
  };
}

/**
 * 启动验票任务。
 */
export function startTask(
  state: GameState,
  task: VerifyTask,
  now = Date.now(),
): void {
  task.status = 'verifying';
  task.startedAt = now;
  task.endAt = now + task.duration;

  state.machine.currentTask = task;

  const ticket = state.tickets.find(
    item => item.id === task.ticketId,
  );

  if (ticket) {
    ticket.status = 'verifying';
  }
}

/**
 * 完成当前验票任务。
 */
export function tickMachine(
  state: GameState,
  now = Date.now(),
): void {
  const task = state.machine.currentTask;

  if (
    !task ||
    task.status !== 'verifying' ||
    !task.endAt ||
    now < task.endAt
  ) {
    return;
  }

  if (!task.settled) {
    task.settled = true;
    task.status = 'completed';
    task.completedAt = now;

    const ticket = state.tickets.find(
      item => item.id === task.ticketId,
    );

    if (ticket) {
      const alreadyRewarded = state.transactions.some(
        transaction =>
          transaction.reason === 'ticket_reward' &&
          transaction.referenceId === ticket.id,
      );

      ticket.status = 'completed';
      ticket.settled = true;
      ticket.completedAt = ticket.completedAt ?? now;

      // 只有中奖且奖金大于 0 才发放金币。
      if (
        ticket.isWinner &&
        task.reward > 0 &&
        !alreadyRewarded
      ) {
        state.coins += task.reward;
        state.statistics.totalEarned += task.reward;

        state.transactions.unshift({
          id: createId('txn'),
          type: 'income',
          amount: task.reward,
          reason: 'ticket_reward',
          referenceId: ticket.id,
          createdAt: now,
        });
      }
    }
  }

  // 当前任务完成，启动下一个 FIFO 任务。
  state.machine.currentTask = null;

  const next = state.machine.queue.shift();

  if (next) {
    startTask(state, next, now);
  }
}

/**
 * 恢复已经到期的验票任务。
 */
export function recoverMachine(
  state: GameState,
  now = Date.now(),
): void {
  let guard = 0;

  while (
    state.machine.currentTask &&
    state.machine.currentTask.status === 'verifying' &&
    (state.machine.currentTask.endAt ?? Infinity) <= now &&
    guard++ < 1000
  ) {
    tickMachine(state, now);
  }
}
