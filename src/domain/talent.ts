import type {
  AutomationUnlocks,
  GameState,
  Result,
  TalentKey,
} from '../types/game';

import {
  TALENT_CONFIG,
  TALENT_RESET_BASE_COST,
  TALENT_RESET_COST_GROWTH,
} from '../config/game';

import { createId } from '../utils/id';

/**
 * 获取天赋升级价格。
 *
 * 当前等级为 0 时，表示升级到 1 级。
 *
 * 价格 = ceil(基础价格 * 增长系数 ^ 当前等级)
 */
export function getTalentCost(
  key: TalentKey,
  currentLevel: number,
): number {
  const config = TALENT_CONFIG[key];

  if (currentLevel >= config.maxLevel) {
    return Infinity;
  }

  return Math.ceil(
    config.baseCost * Math.pow(config.costGrowth, currentLevel),
  );
}

/**
 * 获取天赋重置价格。
 */
export function getTalentResetCost(resetCount: number): number {
  return Math.ceil(
    TALENT_RESET_BASE_COST *
      Math.pow(TALENT_RESET_COST_GROWTH, resetCount),
  );
}

/**
 * 计算自动化能力解锁状态。
 *
 * 这里只负责判断是否达到解锁等级，
 * 不代表对应的自动化执行流程已经启动。
 */
export function getAutomationUnlocks(
  automationLevel: number,
): AutomationUnlocks {
  const config = TALENT_CONFIG.automation;

  const levels = config.unlockLevels!;

  return {
    autoSubmit: automationLevel >= levels.autoSubmit,
    autoClaim: automationLevel >= levels.autoClaim,
    autoScratch: automationLevel >= levels.autoScratch,
    autoBuy: automationLevel >= levels.autoBuy,
    fullAutomation: automationLevel >= levels.fullAutomation,
  };
}

/**
 * 计算刮奖操作量比例。
 *
 * 当前项目使用 Canvas 刮奖，而不是倒计时刮奖。
 * 因此将效率加成映射为需要刮开的面积比例。
 *
 * 基础阈值 42%，每级减少 5%，最低为基础阈值的 20%。
 */
export function getScratchThreshold(
  efficiencyLevel: number,
  baseThreshold = 0.42,
): number {
  const config = TALENT_CONFIG.efficiency;

  const ratio = Math.max(
    1 - efficiencyLevel * config.effectPerLevel!,
    config.minTimeRatio!,
  );

  return baseThreshold * ratio;
}

/**
 * 计算最终验票时间。
 *
 * 每级设备天赋减少 10% 验票时间。
 * 最低不低于基础时间的 20%。
 */
export function getVerifyDuration(
  baseDuration: number,
  deviceLevel: number,
): number {
  const config = TALENT_CONFIG.device;

  const ratio = Math.max(
    1 - deviceLevel * config.effectPerLevel!,
    config.minTimeRatio!,
  );

  return Math.max(1, Math.ceil(baseDuration * ratio));
}

/**
 * 升级天赋。
 *
 * 必须同时满足：
 * 1. 未达到等级上限
 * 2. 技能点足够
 * 3. 金币足够
 *
 * 所有检查通过后才修改状态。
 */
export function upgradeTalent(
  state: GameState,
  key: TalentKey,
): Result {
  const config = TALENT_CONFIG[key];

  const currentLevel = state.talents[key];

  if (currentLevel >= config.maxLevel) {
    return {
      ok: false,
      error: '该天赋已经达到等级上限',
    };
  }

  const requiredPoints = config.pointsPerLevel;

  if (state.player.talentPoints < requiredPoints) {
    return {
      ok: false,
      error: `技能点不足，升级需要 ${requiredPoints} 点`,
    };
  }

  const cost = getTalentCost(key, currentLevel);

  if (state.coins < cost) {
    return {
      ok: false,
      error: `金币不足，升级需要 ${cost} 金币`,
    };
  }

  // 通过全部校验后，统一修改游戏状态。
  state.coins -= cost;

  state.statistics.totalSpent += cost;

  state.player.talentPoints -= requiredPoints;

  state.talents[key] += 1;

  state.transactions.unshift({
    id: createId('txn'),
    type: 'expense',
    amount: cost,
    reason: 'talent_upgrade',
    referenceId: key,
    createdAt: Date.now(),
  });

  return {
    ok: true,
    data: undefined,
  };
}

/**
 * 重置所有天赋。
 *
 * 规则：
 * 1. 支付重置金币
 * 2. 所有天赋等级清零
 * 3. 返还已经消耗的技能点
 * 4. 不返还升级金币
 * 5. 重置次数 +1
 */
export function resetTalents(state: GameState): Result {
  const resetCost = getTalentResetCost(
    state.talentResetCount,
  );

  if (state.coins < resetCost) {
    return {
      ok: false,
      error: `金币不足，重置天赋需要 ${resetCost} 金币`,
    };
  }

  const usedPoints = Object.values(state.talents).reduce(
    (sum, level) => sum + level,
    0,
  );

  // 先计算和校验，再统一修改。
  state.coins -= resetCost;

  state.statistics.totalSpent += resetCost;

  state.player.talentPoints += usedPoints;

  state.talents = {
    luck: 0,
    wealth: 0,
    efficiency: 0,
    device: 0,
    automation: 0,
  };

  state.talentResetCount += 1;

  state.transactions.unshift({
    id: createId('txn'),
    type: 'expense',
    amount: resetCost,
    reason: 'talent_reset',
    referenceId: `reset-${state.talentResetCount}`,
    createdAt: Date.now(),
  });

  return {
    ok: true,
    data: undefined,
  };
}

/**
 * 为玩家增加技能点。
 *
 * 供后续等级奖励、成就奖励、任务奖励调用。
 * 当前版本不擅自增加经验获取规则。
 */
export function grantTalentPoints(
  state: GameState,
  amount: number,
): Result {
  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      error: '技能点数量必须是正整数',
    };
  }

  state.player.talentPoints += amount;

  return {
    ok: true,
    data: undefined,
  };
}