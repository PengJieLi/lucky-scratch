
import type { LotteryConfig, TalentKey } from '../types/game';

export const INITIAL_COINS = 100;
export const INITIAL_TALENT_POINTS = 3;

export const MAX_WIN_RATE = 0.8;
export const WAITING_QUEUE_CAPACITY = 5;
export const SCRATCH_CLEAR_THRESHOLD = 0.42;

// 彩票配置
export const LOTTERIES: LotteryConfig[] = [
  {
    id: 'free',
    name: '幸运小票',
    description: '免费无限使用，三个数字相同即可中奖',
    price: 0,
    baseWinRate: 0.3,
    basePrize: 10,
    enabled: true,
    unlockCondition: '始终开放',
    scratchDuration: 900,
    verifyDuration: 5000,
    isFree: true,
    gameType: 'number-match',
    cellCount: 3,
    rewards: {
      triple: 10,
      special777: 50,
    },
  },
  {
    id: 'gold',
    name: '黄金彩票',
    description: '黄金票面，三连号赢取高额奖金',
    price: 100,
    baseWinRate: 0.25,
    basePrize: 300,
    enabled: true,
    unlockCondition: '默认解锁',
    scratchDuration: 900,
    verifyDuration: 5000,
    isFree: false,
    gameType: 'number-match',
    cellCount: 3,
    rewards: {
      triple: 300,
      special777: 1000,
    },
  },
  {
    id: 'diamond',
    name: '钻石彩票',
    description: '钻石主题数字票，挑战稀有大奖',
    price: 1000,
    baseWinRate: 0.2,
    basePrize: 3500,
    enabled: true,
    unlockCondition: '默认解锁',
    scratchDuration: 1100,
    verifyDuration: 5000,
    isFree: false,
    gameType: 'number-match',
    cellCount: 3,
    rewards: {
      triple: 3500,
      special777: 17500,
    },
  },
  {
    id: 'lucky777',
    name: '幸运777',
    description: '终极数字挑战，挑战特别大奖',
    price: 5000,
    baseWinRate: 0.15,
    basePrize: 20000,
    enabled: true,
    unlockCondition: '默认解锁',
    scratchDuration: 1300,
    verifyDuration: 5000,
    isFree: false,
    gameType: 'number-match',
    cellCount: 3,
    rewards: {
      triple: 20000,
      special777: 100000,
    },
  },
];

// 五系天赋配置
export const TALENT_CONFIG = {
  luck: {
    baseCost: 20,
    costGrowth: 1.35,
    maxLevel: 20,
    pointsPerLevel: 1,
  },
  wealth: {
    baseCost: 25,
    costGrowth: 1.35,
    maxLevel: 20,
    pointsPerLevel: 1,
  },
  efficiency: {
    baseCost: 20,
    costGrowth: 1.35,
    maxLevel: 20,
    pointsPerLevel: 1,
    effectPerLevel: 0.05,
    minTimeRatio: 0.2,
  },
  device: {
    baseCost: 35,
    costGrowth: 1.35,
    maxLevel: 20,
    pointsPerLevel: 1,
    effectPerLevel: 0.1,
    minTimeRatio: 0.2,
  },
  automation: {
    baseCost: 50,
    costGrowth: 1.35,
    maxLevel: 8,
    pointsPerLevel: 1,
    unlockLevels: {
      autoSubmit: 1,
      autoClaim: 2,
      autoScratch: 3,
      autoBuy: 5,
      fullAutomation: 8,
    },
  },
};

export const TALENT_RESET_BASE_COST = 500;
export const TALENT_RESET_COST_GROWTH = 1.5;

// 兼容旧代码中的价格配置引用
export const TALENT_INITIAL_COST: Record<TalentKey, number | null> = {
  luck: 20,
  wealth: 25,
  efficiency: 20,
};

export const TALENT_COST_MULTIPLIER = 1;
