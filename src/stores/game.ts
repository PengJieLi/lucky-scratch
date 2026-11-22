import { computed, ref } from "vue";
import { defineStore } from "pinia";

import type { GameState, LotteryConfig, Result, TalentKey, Ticket, VerifyTask } from "../types/game";

import { INITIAL_COINS, INITIAL_TALENT_POINTS, LOTTERIES, WAITING_QUEUE_CAPACITY } from "../config/game";

import { spend } from "../domain/economy";

import { recoverMachine, startTask, submitWinner, tickMachine } from "../domain/machine";

import { upgradeTalent } from "../domain/talent";

import { generateOutcome, migrateTicket } from "../domain/lottery";

import { createId } from "../utils/id";
import { detectClockAnomaly } from "../domain/clock";
import { loadGame, saveGame } from "../utils/storage";

/**
 * 创建初始状态。
 */
function freshState(): GameState {
	return {
		version: 1,

		coins: INITIAL_COINS,

		player: {
			level: 1,
			experience: 0,
			talentPoints: INITIAL_TALENT_POINTS
		},
talentResetCount: 0,
		talents: {
			luck: 0,
			wealth: 0,
			efficiency: 0,
			device: 0,
			automation: 0
		},

		statistics: {
			totalScratched: 0,
			totalWon: 0,
			totalEarned: 0,
			totalSpent: 0
		},

		tickets: [],

		machine: {
			currentTask: null,
			queue: [],
			maxQueue: WAITING_QUEUE_CAPACITY
		},

		transactions: [],
		lastActiveAt: Date.now()
	};
}

/**
 * 旧版彩票配置兼容。
 */
function legacyConfig(ticket: Partial<Ticket>): LotteryConfig {
	return {
		id: ticket.gameId ?? "legacy",
		name: ticket.name ?? "旧版彩票",
		description: "旧版本存档彩票",
		price: ticket.price ?? 0,
		baseWinRate: ticket.baseWinRate ?? 0.3,
		basePrize: ticket.basePrize ?? 10,
		enabled: true,
		unlockCondition: "旧存档",
		scratchDuration: 900,
		verifyDuration: 5000,
		isFree: ticket.isFree ?? false,
		gameType: "number-match",
		cellCount: 3,
		rewards: {
			triple: ticket.basePrize ?? 10,
			special777: ticket.basePrize ?? 10
		}
	};
}

/**
 * 兼容旧版本存档。
 */
function normalizeState(saved: GameState | null): GameState {
	const initial = freshState();

	if (!saved) {
		return initial;
	}

	const talents = {
		...initial.talents,
		...(saved.talents ?? {})
	};

	const tickets = (saved.tickets ?? []).map((rawTicket) => {
		const config = LOTTERIES.find((item) => item.id === rawTicket.gameId) ?? legacyConfig(rawTicket);

		return migrateTicket(rawTicket, config, talents.luck, talents.wealth, talents.efficiency);
	});

	return {
		...initial,
		...saved,

		player: {
			...initial.player,
			...(saved.player ?? {})
		},

		talents,

		statistics: {
			...initial.statistics,
			...(saved.statistics ?? {})
		},

		tickets,

		machine: {
			...initial.machine,
			...(saved.machine ?? {}),
			currentTask: saved.machine?.currentTask ?? null,
			queue: saved.machine?.queue ?? []
		},

		transactions: saved.transactions ?? [],
		lastActiveAt: saved.lastActiveAt ?? Date.now()
	};
}

export const useGameStore = defineStore("game", () => {
	const loaded = loadGame();

	const state = ref<GameState>(normalizeState(loaded));

	const initialClockCheck = loaded ? detectClockAnomaly(loaded.lastActiveAt, Date.now()) : { detected: false };

	const notice = ref(initialClockCheck.detected ? "检测到系统时间发生异常变化；本版本仅记录提示，不提供防作弊保证。" : "");

	// 当前可继续刮奖的彩票。
	const activeTicket = computed(() => [...state.value.tickets].reverse().find((ticket) => ["purchased", "scratching", "scratched"].includes(ticket.status)) ?? null);

	// 尚未完成验票的中奖金额。
	const pendingRewards = computed(() => state.value.tickets.filter((ticket) => ticket.isWinner && ticket.status !== "completed").reduce((sum, ticket) => sum + ticket.prize, 0));

	const waitingCapacity = computed(() => Math.max(0, WAITING_QUEUE_CAPACITY - state.value.machine.queue.length));

	function persist() {
		state.value.lastActiveAt = Date.now();

		try {
			saveGame(state.value);
		} catch {
			notice.value = "存档失败：浏览器存储空间可能不足";
		}
	}

	function message(text: string) {
		notice.value = text;
	}

	/**
	 * 创建彩票。
	 *
	 * 在这里一次性生成开奖结果并持久化。
	 * 后续刮奖过程不会再次抽取中奖结果。
	 */
	function createTicket(config: LotteryConfig, ticketId = createId("ticket")): Result<Ticket> {
		if (!config.enabled) {
			return {
				ok: false,
				error: "该种彩票暂不可使用"
			};
		}

		const outcome = generateOutcome(config, state.value.talents.luck, state.value.talents.wealth, state.value.talents.efficiency);

		const ticket: Ticket = {
			id: ticketId,
			gameId: config.id,
			name: config.name,
			price: config.price,
			isFree: config.isFree,

			gameType: config.gameType,
			cellCount: config.cellCount,

			results: outcome.results,
			revealedCells: [],

			winLevel: outcome.winLevel,

			baseWinRate: config.baseWinRate,
			basePrize: config.basePrize,

			prize: outcome.prize,
			isWinner: outcome.isWinner,

			status: "purchased",
			settled: false,

			createdAt: Date.now(),

			talentSnapshot: outcome.talentSnapshot
		};

		state.value.tickets.push(ticket);

		persist();

		return {
			ok: true,
			data: ticket
		};
	}

	/**
	 * 免费基础彩票。
	 *
	 * 不需要购买或领取，不检查金币余额。
	 */
	function startFreeTicket(): Result<Ticket> {
		const config = LOTTERIES.find((item) => item.id === "free");

		if (!config) {
			return {
				ok: false,
				error: "免费彩票配置不存在"
			};
		}

		const result = createTicket(config);

		if (result.ok) {
			message("已开始一张免费的幸运小票");
		}

		return result;
	}

	/**
	 * 购买付费彩票。
	 */
	function purchase(gameId: string): Result<Ticket> {
		const config = LOTTERIES.find((item) => item.id === gameId);

		if (!config || !config.enabled) {
			return {
				ok: false,
				error: "该种彩票暂不可购买"
			};
		}

		if (config.isFree || config.price === 0) {
			return {
				ok: false,
				error: "免费彩票无需购买，请直接开始刮奖"
			};
		}

		// 先生成 ID，购买流水与彩票使用同一个 ID。
		const id = createId("ticket");

		const paid = spend(state.value, config.price, "ticket_purchase", id);

		if (!paid.ok) {
			return paid;
		}

		const result = createTicket(config, id);

		if (!result.ok) {
			state.value.coins += config.price;
			state.value.statistics.totalSpent -= config.price;
			return result;
		}

		persist();

		message(`已购买「${config.name}」，可以开始刮奖`);

		return result;
	}

	/**
	 * 揭晓一个独立刮奖区域。
	 *
	 * 最后一个区域揭晓后，才进入 scratched 状态。
	 */
	function revealCell(ticketId: string, index: number): Result<Ticket> {
		const ticket = state.value.tickets.find((item) => item.id === ticketId);

		if (!ticket) {
			return {
				ok: false,
				error: "彩票不存在"
			};
		}

		if (ticket.status !== "purchased" && ticket.status !== "scratching") {
			return {
				ok: false,
				error: "该彩票当前不能继续刮奖"
			};
		}

		if (!Number.isInteger(index) || index < 0 || index >= ticket.cellCount) {
			return {
				ok: false,
				error: "刮奖区域索引无效"
			};
		}

		// 已经揭晓的区域不能重复揭晓。
		if (ticket.revealedCells.includes(index)) {
			return {
				ok: true,
				data: ticket
			};
		}

		ticket.status = "scratching";

		ticket.revealedCells.push(index);

		ticket.revealedCells.sort((a, b) => a - b);

		// 全部区域揭晓后，才完成刮奖。
		if (ticket.revealedCells.length === ticket.cellCount) {
			ticket.status = "scratched";
			ticket.scratchedAt = Date.now();

			state.value.statistics.totalScratched += 1;

			if (ticket.isWinner) {
				state.value.statistics.totalWon += 1;
			}

			message(ticket.isWinner ? "全部数字已揭晓，恭喜中奖！" : "全部数字已揭晓，继续努力！");
		}

		// 每次揭晓都持久化。
		persist();

		return {
			ok: true,
			data: ticket
		};
	}

	/**
	 * 提交已完整刮开的彩票。
	 *
	 * 中奖票和未中奖票都需要经过验票机。
	 */
	function submitTicket(ticketId: string): Result<VerifyTask> {
		const ticket = state.value.tickets.find((item) => item.id === ticketId);

		if (!ticket) {
			return {
				ok: false,
				error: "彩票不存在"
			};
		}

		const config = LOTTERIES.find((item) => item.id === ticket.gameId);

		const duration = config?.verifyDuration ?? 5000;

		const result = submitWinner(state.value, ticket, Date.now(), duration);

		if (result.ok) {
			persist();
			message("彩票已进入验票流程");
		}

		return result;
	}

	/**
	 * 推进验票机。
	 */
	function tick() {
		const currentTicketId = state.value.machine.currentTask?.ticketId;

		tickMachine(state.value);

		if (currentTicketId) {
			const completed = state.value.tickets.find((ticket) => ticket.id === currentTicketId && ticket.status === "completed");

			if (completed) {
				message(completed.isWinner ? `验票完成，获得 ${completed.prize.toLocaleString()} 金币` : "验票完成，本张彩票未中奖");
			}
		}

		persist();
	}

	function recover() {
		recoverMachine(state.value);
		persist();
	}

	/**
	 * 暂停当前异常任务。
	 */
	function failCurrentTask(reason = "验票过程发生异常") {
		const task = state.value.machine.currentTask;

		if (!task || task.status !== "verifying") {
			return;
		}

		task.remainingDuration = Math.max(0, (task.endAt ?? Date.now()) - Date.now());

		task.status = "failed";
		task.failedAt = Date.now();
		task.failureReason = reason;
		task.startedAt = undefined;
		task.endAt = undefined;

		persist();

		message("验票已暂停，任务和队列均已保留");
	}

	/**
	 * 恢复异常任务。
	 */
	function resumeTask(taskId: string): Result {
		const task = state.value.machine.currentTask;

		if (!task || task.id !== taskId || task.status !== "failed") {
			return {
				ok: false,
				error: "没有可恢复的异常任务"
			};
		}

		task.duration = task.remainingDuration ?? task.duration;

		task.remainingDuration = undefined;
		task.failureReason = undefined;
		task.failedAt = undefined;

		startTask(state.value, task, Date.now());

		persist();

		return {
			ok: true,
			data: undefined
		};
	}

	/**
	 * 升级天赋。
	 */
	function upgrade(key: TalentKey) {
		const result = upgradeTalent(state.value, key);

		if (result.ok) {
			persist();
			message("天赋升级成功");
		}

		return result;
	}

	/**
	 * 重置存档。
	 */
	function resetSave() {
		state.value = freshState();

		persist();

		message("已创建新存档");
	}

	// 旧存档迁移后立即保存，避免刷新时重复生成结果。
	if (loaded) {
		persist();
	}

	recover();

	// 验票机轮询。
	window.setInterval(() => {
		const task = state.value.machine.currentTask;

		if (task?.status === "verifying" && (task.endAt ?? Infinity) <= Date.now()) {
			tick();
		}
	}, 200);

	window.addEventListener("beforeunload", persist);

	return {
		state,
		notice,

		activeTicket,
		pendingRewards,
		waitingCapacity,

		lotteries: LOTTERIES,

		purchase,
		startFreeTicket,
		revealCell,
		submitTicket,

		tick,
		recover,
		failCurrentTask,
		resumeTask,

		upgrade,
		resetSave,
		persist
	};
});
