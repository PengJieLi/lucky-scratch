
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { LOTTERIES } from "../config/lottery";
import { useGameStore } from "../stores/game";
import type { PlayType } from "../types/game";
import ScratchArea from "../components/ScratchArea.vue";
import StatCard from "../components/StatCard.vue";

const store = useGameStore();

const selectedLotteryId = ref("starter");
const showPlayPicker = ref(false);
const showScratchModal = ref(false);
const showMoneyModal = ref(false);
const insufficientLotteryId = ref("");

// 固定当前正在展示的彩票 ID
const activeTicketId = ref<string | null>(null);

// 根据 ID 获取彩票，不再依赖 currentTicket 的状态筛选
const ticket = computed(() => {
    if (activeTicketId.value) {
        return (
            store.game.tickets.find(
                (item) => item.id === activeTicketId.value
            ) ?? null
        );
    }

    return store.currentTicket;
});

const config = computed(
    () =>
        LOTTERIES.find((item) => item.id === selectedLotteryId.value) ??
        LOTTERIES[1]
);

const insufficientLottery = computed(
    () =>
        LOTTERIES.find((item) => item.id === insufficientLotteryId.value) ??
        config.value
);

const ticketConfig = computed(() =>
    ticket.value
        ? LOTTERIES.find((item) => item.id === ticket.value!.gameId) ??
          config.value
        : config.value
);

const playTypes: {
    id: PlayType;
    name: string;
    description: string;
    icon: string;
}[] = [
    {
        id: "number-match",
        name: "幸运数字",
        description: "对照中奖号码，匹配即可获得对应奖金",
        icon: "🔢"
    },
    {
        id: "symbol-match",
        name: "幸运图案",
        description: "6 个图案中集齐 3 个相同图案",
        icon: "🍀"
    },
    {
        id: "three-match",
        name: "三个相同",
        description: "刮开 3 个数字，寻找相同数字",
        icon: "🎯"
    },
    {
        id: "line-match",
        name: "连线大奖",
        description: "在 2 行图案中寻找横向连线",
        icon: "〰️"
    },
    {
        id: "number-compare",
        name: "数字比大小",
        description: "比较你的数字和幸运数字",
        icon: "⚖️"
    },
    {
        id: "number-sum",
        name: "数字求和",
        description: "两个数字相加等于目标和",
        icon: "➕"
    },
    {
        id: "direct-prize",
        name: "直接奖金",
        description: "刮开一个区域，直接揭晓奖金",
        icon: "💰"
    },
    {
        id: "coordinate",
        name: "幸运坐标",
        description: "在 3×3 坐标格中寻找大奖",
        icon: "🧭"
    },
    {
        id: "step-walk",
        name: "幸运步数",
        description: "沿着 5 个路径节点抵达终点",
        icon: "👣"
    }
];

// 彩票展示数据
const ticketValues = computed(() => {
    const result = ticket.value?.result;

    if (Array.isArray(result?.values)) {
        return result.values as (string | number)[];
    }

    return ticket.value
        ? [ticket.value.isWinner ? "🍀" : "—", ticket.value.prize, "★"]
        : [];
});

// 每个中奖格对应的奖金
const ticketPrizes = computed(() => {
    const current = ticket.value;

    if (!current || current.playType !== "number-match") {
        return [];
    }

    const result = current.result;

    if (Array.isArray(result.prizes)) {
        return result.prizes as number[];
    }

    const matches = ticketValues.value
        .slice(1)
        .map((value, index) =>
            value === result.target ? index : -1
        )
        .filter((index) => index >= 0);

    const prizes = Array(6).fill(0) as number[];

    if (matches.length) {
        prizes[matches[0]] = current.prize;
    }

    return prizes;
});

const selectedPlayType = computed(
    () => ticket.value?.playType ?? config.value.playType
);

const ticketTarget = computed<string | number | undefined>(() => {
    const target = ticket.value?.result.target;

    return typeof target === "string" || typeof target === "number"
        ? target
        : undefined;
});

// 更新刮奖区域进度
function updateTicketCellProgress(index: number, value: number) {
    const current = ticket.value;

    if (!current) return;

    store.updateCellProgress(current.id, index, value);
}

// 页面滚动锁定
let bodyScrollLocked = false;
let lockedScrollY = 0;

function lockPageScroll(locked: boolean) {
    if (locked && !bodyScrollLocked) {
        lockedScrollY = window.scrollY;

        document.body.style.position = "fixed";
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.style.width = "100%";
        document.body.style.overflow = "hidden";

        bodyScrollLocked = true;
    } else if (!locked && bodyScrollLocked) {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";

        window.scrollTo(0, lockedScrollY);

        bodyScrollLocked = false;
    }
}

// 选择彩票
function chooseLottery(id: string) {
    const item = LOTTERIES.find((lottery) => lottery.id === id);

    if (!item) return;

    if (item.price > store.game.coins) {
        insufficientLotteryId.value = id;
        showMoneyModal.value = true;
        return;
    }

    selectedLotteryId.value = id;
    showPlayPicker.value = true;
}

// 购买彩票
function buy(playType: PlayType) {
    if (config.value.price > store.game.coins) {
        insufficientLotteryId.value = selectedLotteryId.value;
        showPlayPicker.value = false;
        showMoneyModal.value = true;
        return;
    }

    store.buyLottery(selectedLotteryId.value, playType);

    showPlayPicker.value = false;

    // 新购买彩票后，固定这张彩票的 ID
    const newTicket = store.game.tickets[0];

    if (newTicket?.gameId === selectedLotteryId.value) {
        activeTicketId.value = newTicket.id;
        showScratchModal.value = true;
    }
}

// 刮奖完成后的处理
function finishScratchIfComplete() {
    const current = ticket.value;

    if (!current || current.status !== "scratched") {
        return;
    }

    if (current.isWinner) {
        // 自动提交验票，但不切换当前展示的彩票
        store.submit(current.id);

        // 只有真正提交成功才显示已提交提示
        if (
            ["queued", "verifying", "completed"].includes(current.status)
        ) {
            store.setNotice(
                `🎉 恭喜中奖 ${current.prize.toLocaleString()} 金币，已自动提交验票！`
            );
        }
    } else {
        // 未中奖：保留弹窗，提示用户
        store.setNotice("很遗憾，这次没有中奖，再试试下一张吧！");
    }
}

// 刮开单个区域
function reveal(index: number) {
    const current = ticket.value;

    if (!current) return;

    store.revealCell(current.id, index);

    finishScratchIfComplete();
}

// 快速刮开全部
function revealAll() {
    const current = ticket.value;

    if (!current) return;

    store.revealAll(current.id);

    finishScratchIfComplete();
}

// 监听 Store 中当前可刮彩票的变化
// 新彩票出现时，更新固定 ID
watch(
    () => store.currentTicket,
    (value) => {
        if (value && ["purchased", "scratching"].includes(value.status)) {
            activeTicketId.value = value.id;
            showScratchModal.value = true;
        }
    },
    { immediate: true }
);

// 弹窗打开时锁定页面滚动
watch(
    () => [
        showPlayPicker.value,
        showMoneyModal.value,
        showScratchModal.value
    ],
    ([play, money, scratch]) => {
        lockPageScroll(Boolean(play || money || scratch));
    },
    { immediate: true }
);

onBeforeUnmount(() => lockPageScroll(false));
</script>

<template>
    <div class="page game-page">
        <!-- 首页头部 -->
        <section class="hero">
            <div>
                <span class="eyebrow">LUCKY SCRATCH · IDLE TYCOON</span>
                <h1>今天的好运，<em>由你开启</em></h1>
                <p>
                    选择彩票等级和玩法，刮开惊喜，积累财富，打造你的自动化彩票工厂。
                </p>
            </div>

            <div class="hero-stamp">
                🍀
                <b>GOOD<br />LUCK</b>
            </div>
        </section>

        <!-- 首页统计 -->
        <div class="stats-grid">
            <StatCard
                label="可用金币"
                :value="store.game.coins.toLocaleString()"
                icon="🪙"
                accent="gold"
            />

            <StatCard
                label="待兑奖"
                :value="store.pendingRewards.toLocaleString()"
                icon="🎟️"
            />

            <StatCard
                label="累计中奖"
                :value="store.game.statistics.totalWon"
                icon="🏆"
            />

            <StatCard
                label="玩家等级"
                :value="`Lv.${store.game.player.level}`"
                icon="⭐"
            />
        </div>

        <!-- 彩票等级选择 -->
        <section class="panel lottery-hall">
            <div class="section-head">
                <div>
                    <span class="eyebrow">CHOOSE YOUR LUCK</span>
                    <h2>选择彩票等级</h2>
                </div>

                <span class="pill">
                    金币 {{ store.game.coins.toLocaleString() }}
                </span>
            </div>

            <div class="lottery-picker lottery-picker-grid">
                <button
                    v-for="item in store.unlockedLotteries"
                    :key="item.id"
                    :class="[
                        { active: selectedLotteryId === item.id },
                        { unaffordable: item.price > store.game.coins }
                    ]"
                    @click="chooseLottery(item.id)"
                >
                    <span class="lottery-icon">
                        {{
                            item.id === "free"
                                ? "🎫"
                                : item.id === "gold"
                                  ? "🥇"
                                  : item.id === "diamond"
                                    ? "💎"
                                    : item.id === "lucky777"
                                      ? "🎰"
                                      : "🎟️"
                        }}
                    </span>

                    <b>{{ item.name }}</b>

                    <strong>
                        {{
                            item.price === 0
                                ? "免费"
                                : `${item.price.toLocaleString()} 金币`
                        }}
                    </strong>

                    <small>
                        中奖概率
                        {{
                            Math.round(
                                Math.min(
                                    0.8,
                                    item.baseWinRate +
                                        store.game.talents.luck * 0.01
                                ) * 100
                            )
                        }}%
                    </small>

                    <small>
                        基础奖金 {{ item.basePrize.toLocaleString() }}
                    </small>

                    <i v-if="item.price > store.game.coins">
                        金币不足
                    </i>
                    <i v-else>选择玩法 →</i>
                </button>
            </div>
        </section>

        <!-- 验票中心和成长进度 -->
        <div class="game-lower-grid">
            <aside class="side-column">
                <section class="panel machine-mini">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">VERIFY MACHINE</span>
                            <h2>验票中心</h2>
                        </div>

                        <span class="machine-icon">⚙️</span>
                    </div>

                    <div class="machine-visual">
                        <div class="machine-light" />
                        <div class="machine-slot">🎟️</div>

                        <b>
                            {{
                                store.game.machine.currentTask
                                    ? "正在验票"
                                    : "设备空闲"
                            }}
                        </b>

                        <small>
                            Lv.{{ store.game.machine.level }} · 队列
                            {{ store.game.machine.queue.length }}/{{
                                store.game.machine.maxQueue
                            }}
                        </small>
                    </div>

                    <div class="machine-footer">
                        <span>
                            待兑奖
                            <b>{{ store.pendingRewards.toLocaleString() }}</b>
                        </span>

                        <span>
                            等待任务
                            <b>{{ store.game.machine.queue.length }}</b>
                        </span>
                    </div>
                </section>

                <section class="panel growth-card">
                    <span class="eyebrow">PLAYER GROWTH</span>
                    <h2>成长进度</h2>

                    <div class="level-row">
                        <strong>Lv.{{ store.game.player.level }}</strong>

                        <span>
                            {{ store.game.player.experience }} /
                            {{ store.game.player.level * 100 }} EXP
                        </span>
                    </div>

                    <div class="progress-line">
                        <span
                            :style="{
                                width: `${Math.min(
                                    100,
                                    (store.game.player.experience /
                                        (store.game.player.level * 100)) *
                                        100
                                )}%`
                            }"
                        />
                    </div>

                    <div class="growth-bottom">
                        <span>可用天赋点</span>
                        <b>✨ {{ store.game.player.talentPoints }}</b>
                    </div>
                </section>
            </aside>
        </div>

        <!-- 最近的彩票 -->
        <section class="panel recent-panel">
            <div class="section-head">
                <div>
                    <span class="eyebrow">YOUR COLLECTION</span>
                    <h2>最近的彩票</h2>
                </div>

                <span class="muted">
                    共 {{ store.game.tickets.length }} 张
                </span>
            </div>

            <div v-if="!store.game.tickets.length" class="empty">
                🎟️ 还没有彩票，选择等级和玩法，开启你的第一张幸运刮刮卡吧！
            </div>

            <div v-else class="ticket-list">
                <div
                    v-for="t in store.game.tickets.slice(0, 5)"
                    :key="t.id"
                    class="ticket-row"
                >
                    <span class="ticket-emoji">
                        {{ t.isWinner ? "🏆" : "🎫" }}
                    </span>

                    <div>
                        <b>{{ t.gameName }}</b>
                        <small>
                            {{ new Date(t.createdAt).toLocaleString() }}
                        </small>
                    </div>

                    <span class="status" :class="t.status">
                        {{
                            (
                                {
                                    purchased: "待刮奖",
                                    scratching: "刮奖中",
                                    scratched: t.isWinner ? "待验票" : "未中奖",
                                    queued: "排队中",
                                    verifying: "验票中",
                                    completed: "已完成"
                                } as Record<string, string>
                            )[t.status]
                        }}
                    </span>

                    <strong v-if="t.isWinner" class="reward">
                        +{{ t.prize.toLocaleString() }}
                    </strong>
                </div>
            </div>
        </section>
    </div>

    <!-- 玩法选择弹窗 -->
    <div
        v-if="showPlayPicker"
        class="modal-backdrop game-modal-backdrop"
        @click.self="showPlayPicker = false"
    >
        <section class="panel game-dialog play-picker-dialog">
            <button
                class="modal-close"
                @click="showPlayPicker = false"
            >
                ×
            </button>

            <span class="eyebrow">SELECT GAME MODE</span>

            <h2>选择 {{ config.name }} 的玩法</h2>

            <p class="dialog-description">
                选择一种玩法，系统会在购票时固定生成开奖结果。
            </p>

            <div class="play-picker-grid">
                <button
                    v-for="play in playTypes"
                    :key="play.id"
                    @click="buy(play.id)"
                >
                    <span>{{ play.icon }}</span>

                    <div>
                        <b>{{ play.name }}</b>
                        <small>{{ play.description }}</small>
                    </div>

                    <strong>›</strong>
                </button>
            </div>

            <div class="dialog-footer">
                <span>
                    票价
                    <b>
                        {{
                            config.price === 0
                                ? "免费"
                                : `${config.price.toLocaleString()} 金币`
                        }}
                    </b>
                </span>

                <span>购买后立即打开刮奖窗口</span>
            </div>
        </section>
    </div>

    <!-- 金币不足弹窗 -->
    <div
        v-if="showMoneyModal"
        class="modal-backdrop game-modal-backdrop"
        @click.self="showMoneyModal = false"
    >
        <section class="panel game-dialog money-dialog">
            <button
                class="modal-close"
                @click="showMoneyModal = false"
            >
                ×
            </button>

            <div class="money-icon">🪙</div>

            <h2>金币不足</h2>

            <p>
                购买「{{ insufficientLottery.name }}」需要
                <b>
                    {{ insufficientLottery.price.toLocaleString() }}
                </b>
                金币，你目前只有
                <b>{{ store.game.coins.toLocaleString() }}</b>
                金币。
            </p>

            <button
                class="btn primary full"
                @click="showMoneyModal = false"
            >
                我知道了
            </button>
        </section>
    </div>

    <!-- 刮奖弹窗 -->
    <div
        v-if="showScratchModal && ticket"
        class="modal-backdrop game-modal-backdrop scratch-modal-backdrop"
        @click.self="showScratchModal = false"
    >
        <section class="panel game-dialog scratch-dialog">
            <div
                class="ticket-art scratch-ticket-modal"
                :class="ticketConfig.theme"
                style="
                    -webkit-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                "
                @selectstart.prevent
                @dragstart.prevent
            >
                <ScratchArea
                    :play-type="selectedPlayType"
                    :values="ticketValues"
                    :revealed-cells="ticket.revealedCells"
                    :cell-progress="ticket.cellProgress"
                    :prizes="ticketPrizes"
                    :target="ticketTarget"
                    @progress="updateTicketCellProgress"
                    @reveal="reveal"
                />
            </div>
        </section>
    </div>
</template>
