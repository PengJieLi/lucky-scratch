
import type {
  LotteryConfig,
  Ticket,
  TicketTalentSnapshot,
} from '../types/game';

import {
  calculatePrize,
  calculateWinRate,
  rollWin,
} from './probability';

export interface GeneratedOutcome {
  results: number[];
  isWinner: boolean;
  winLevel?: string;
  prize: number;
  winRate: number;
  talentSnapshot: TicketTalentSnapshot;
}

function randomInt(
  maxExclusive: number,
  random: () => number,
): number {
  return Math.min(
    maxExclusive - 1,
    Math.floor(random() * maxExclusive),
  );
}

/**
 * 创建彩票时一次性生成完整开奖结果。
 *
 * 中奖概率只在这里抽取一次。
 * 数字组合由抽取结果决定，避免中奖概率与数字组合不一致。
 */
export function generateOutcome(
  config: LotteryConfig,
  luckLevel: number,
  wealthLevel: number,
  efficiencyLevel: number,
  random: () => number = Math.random,
): GeneratedOutcome {
  const winRate = calculateWinRate(
    config.baseWinRate,
    luckLevel,
  );

  const isWinner = rollWin(winRate, random);

  let results: number[];
  let winLevel: string | undefined;
  let baseReward = 0;

  if (isWinner) {
    // 中奖时生成三连号。
    const digit = randomInt(10, random);

    results = Array(config.cellCount).fill(digit);

    if (digit === 7) {
      winLevel = 'special777';
    } else {
      winLevel = `triple${String(digit).repeat(config.cellCount)}`;
    }

    // 优先使用具体组合奖金，其次使用普通三连号奖金。
    baseReward =
      config.rewards[winLevel] ??
      config.rewards.triple ??
      config.basePrize;
  } else {
    // 未中奖时生成互不相同的数字。
    // 避免出现数字三连号但系统判定未中奖的情况。
    const digits: number[] = [];

    while (digits.length < config.cellCount) {
      const digit = randomInt(10, random);

      if (!digits.includes(digit)) {
        digits.push(digit);
      }
    }

    results = digits;
  }

  const prize = isWinner
    ? calculatePrize(baseReward, wealthLevel)
    : 0;

  return {
    results,
    isWinner,
    winLevel,
    prize,
    winRate,

    talentSnapshot: {
      luck: luckLevel,
      wealth: wealthLevel,
      efficiency: efficiencyLevel,
      winRate,
      prizeMultiplier: 1 + wealthLevel * 0.05,
    },
  };
}

/**
 * 为旧存档的彩票补齐新字段。
 *
 * 已经确定的中奖结果和奖金不会被重新抽取。
 */
export function migrateTicket(
  ticket: Partial<Ticket> &
    Pick<
      Ticket,
      | 'id'
      | 'gameId'
      | 'name'
      | 'price'
      | 'baseWinRate'
      | 'basePrize'
      | 'createdAt'
    >,
  config: LotteryConfig,
  luckLevel: number,
  wealthLevel: number,
  efficiencyLevel: number,
): Ticket {
  // 新版本彩票已经有结果，直接使用原有数据。
  if (
    Array.isArray(ticket.results) &&
    ticket.results.length === config.cellCount
  ) {
    return {
      ...ticket,
      isFree: ticket.isFree ?? config.isFree,
      gameType: ticket.gameType ?? config.gameType,
      cellCount: ticket.cellCount ?? config.cellCount,

      revealedCells:
        ticket.revealedCells ??
        (
          ticket.status === 'scratched' ||
          ticket.status === 'queued' ||
          ticket.status === 'verifying' ||
          ticket.status === 'completed'
            ? Array.from(
                { length: config.cellCount },
                (_, index) => index,
              )
            : []
        ),

      settled: ticket.settled ?? ticket.status === 'completed',
      prize: ticket.prize ?? 0,
      isWinner: ticket.isWinner ?? false,
    } as Ticket;
  }

  // 旧版本彩票没有数字结果，需要迁移一次。
  const outcome = generateOutcome(
    config,
    luckLevel,
    wealthLevel,
    efficiencyLevel,
  );

  const wasAlreadyScratched =
    ticket.status === 'scratched' ||
    ticket.status === 'queued' ||
    ticket.status === 'verifying' ||
    ticket.status === 'completed';

  const hadLegacyResult =
    typeof ticket.isWinner === 'boolean';

  const isWinner =
    ticket.isWinner ?? outcome.isWinner;

  const prize =
    ticket.isWinner === true
      ? ticket.prize ?? ticket.basePrize
      : ticket.isWinner === false
        ? 0
        : outcome.prize;

  const results = hadLegacyResult
    ? (
        isWinner
          ? Array(config.cellCount).fill(7)
          : outcome.results
      )
    : outcome.results;

  return {
    ...ticket,

    isFree: ticket.isFree ?? config.isFree,
    gameType: config.gameType,
    cellCount: config.cellCount,

    results,

    revealedCells: wasAlreadyScratched
      ? Array.from(
          { length: config.cellCount },
          (_, index) => index,
        )
      : [],

    winLevel:
      ticket.winLevel ??
      (
        hadLegacyResult
          ? (isWinner ? 'triple' : undefined)
          : outcome.winLevel
      ),

    prize,
    isWinner,

    settled:
      ticket.settled ??
      ticket.status === 'completed',

    talentSnapshot:
      ticket.talentSnapshot ??
      outcome.talentSnapshot,
  } as Ticket;
}
