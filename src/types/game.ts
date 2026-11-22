
export type TicketStatus =
  | 'purchased'
  | 'scratching'
  | 'scratched'
  | 'queued'
  | 'verifying'
  | 'completed';

export type TaskStatus =
  | 'queued'
  | 'verifying'
  | 'failed'
  | 'completed';

// 五系天赋
export type TalentKey =
  | 'luck'
  | 'wealth'
  | 'efficiency'
  | 'device'
  | 'automation';

// 自动化能力解锁状态
export interface AutomationUnlocks {
  autoSubmit: boolean;
  autoClaim: boolean;
  autoScratch: boolean;
  autoBuy: boolean;
  fullAutomation: boolean;
}

export type LotteryGameType = 'number-match' | 'symbol-match';

export interface LotteryConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  baseWinRate: number;
  basePrize: number;
  enabled: boolean;
  unlockCondition: string;
  scratchDuration: number;
  verifyDuration: number;
  isFree: boolean;
  gameType: LotteryGameType;
  cellCount: number;
  rewards: Record<string, number>;
}

export interface TicketTalentSnapshot {
  luck: number;
  wealth: number;
  efficiency: number;
  winRate: number;
  prizeMultiplier: number;
}

export interface Ticket {
  id: string;
  gameId: string;
  name: string;
  price: number;
  isFree: boolean;

  gameType: LotteryGameType;
  cellCount: number;

  /** 完整开奖结果，创建彩票时生成并持久化 */
  results: number[];

  /** 已经揭晓的区域索引 */
  revealedCells: number[];

  /** 中奖等级 */
  winLevel?: string;

  baseWinRate: number;
  basePrize: number;

  /** 最终中奖奖金 */
  prize: number;

  /** 创建彩票时已经确定，不在刮奖过程中重新抽取 */
  isWinner: boolean | null;

  status: TicketStatus;

  /** 是否已经完成验票结算 */
  settled: boolean;

  createdAt: number;
  scratchedAt?: number;
  submittedAt?: number;
  completedAt?: number;

  talentSnapshot?: TicketTalentSnapshot;
}

export interface VerifyTask {
  id: string;
  ticketId: string;
  reward: number;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  duration: number;
  endAt?: number;
  remainingDuration?: number;
  completedAt?: number;
  settled: boolean;
  failedAt?: number;
  failureReason?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  reason:
    | 'ticket_purchase'
    | 'ticket_reward'
    | 'talent_upgrade'
    | 'talent_reset';
  referenceId: string;
  createdAt: number;
}

export interface GameState {
  version: number;
  coins: number;

  player: {
    level: number;
    experience: number;
    talentPoints: number;
  };

  /** 五系天赋等级 */
  talents: Record<TalentKey, number>;

  /** 天赋重置次数，用于计算下次重置费用 */
  talentResetCount: number;

  statistics: {
    totalScratched: number;
    totalWon: number;
    totalEarned: number;
    totalSpent: number;
  };

  tickets: Ticket[];

  machine: {
    currentTask: VerifyTask | null;
    queue: VerifyTask[];
    maxQueue: number;
  };

  transactions: Transaction[];
  lastActiveAt: number;
}

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
