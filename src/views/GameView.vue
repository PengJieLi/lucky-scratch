<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { LOTTERIES } from "../config/lottery";
import { useGameStore } from "../stores/game";
import type { PlayType } from "../types/game";
import GameStats from "../components/game/GameStats.vue";
import LotteryHall from "../components/game/LotteryHall.vue";
import GameSidebar from "../components/game/GameSidebar.vue";
import RecentTickets from "../components/game/RecentTickets.vue";
import PlayPickerDialog from "../components/game/PlayPickerDialog.vue";
import MoneyDialog from "../components/game/MoneyDialog.vue";
import ScratchDialog from "../components/game/ScratchDialog.vue";

const store = useGameStore();
const selectedLotteryId = ref("starter");
const showPlayPicker = ref(false);
const showScratchModal = ref(false);
const showMoneyModal = ref(false);
const insufficientLotteryId = ref("");
const activeTicketId = ref<string | null>(null);

const ticket = computed(() => activeTicketId.value
    ? store.game.tickets.find((item) => item.id === activeTicketId.value) ?? null
    : store.currentTicket);
const config = computed(() => LOTTERIES.find((item) => item.id === selectedLotteryId.value) ?? LOTTERIES[1]);
const insufficientLottery = computed(() => LOTTERIES.find((item) => item.id === insufficientLotteryId.value) ?? config.value);
const ticketConfig = computed(() => ticket.value
    ? LOTTERIES.find((item) => item.id === ticket.value!.gameId) ?? config.value
    : config.value);
const ticketValues = computed(() => {
    const result = ticket.value?.result;
    if (Array.isArray(result?.values)) return result.values as (string | number)[];
    return ticket.value ? [ticket.value.isWinner ? "🍀" : "—", ticket.value.prize, "★"] : [];
});
const ticketPrizes = computed(() => {
    const current = ticket.value;
    if (!current || current.playType !== "number-match") return [];
    const result = current.result;
    if (Array.isArray(result.prizes)) return result.prizes as number[];
    const matches = ticketValues.value.slice(1)
        .map((value, index) => value === result.target ? index : -1)
        .filter((index) => index >= 0);
    const prizes = Array(6).fill(0) as number[];
    if (matches.length) prizes[matches[0]] = current.prize;
    return prizes;
});
const selectedPlayType = computed(() => ticket.value?.playType ?? config.value.playType);
const ticketTarget = computed<string | number | undefined>(() => {
    const target = ticket.value?.result.target;
    return typeof target === "string" || typeof target === "number" ? target : undefined;
});

function updateTicketCellProgress(index: number, value: number) {
    if (ticket.value) store.updateCellProgress(ticket.value.id, index, value);
}

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

function buy(playType: PlayType) {
    if (config.value.price > store.game.coins) {
        insufficientLotteryId.value = selectedLotteryId.value;
        showPlayPicker.value = false;
        showMoneyModal.value = true;
        return;
    }
    store.buyLottery(selectedLotteryId.value, playType);
    showPlayPicker.value = false;
    const newTicket = store.game.tickets[0];
    if (newTicket?.gameId === selectedLotteryId.value) {
        activeTicketId.value = newTicket.id;
        showScratchModal.value = true;
    }
}

function finishScratchIfComplete() {
    const current = ticket.value;
    if (!current || current.status !== "scratched") return;
    if (current.isWinner) {
        store.submit(current.id);
        if (["queued", "verifying", "completed"].includes(current.status)) {
            store.setNotice(`🎉 恭喜中奖 ${current.prize.toLocaleString()} 金币，已自动提交验票！`);
        }
    } else {
        store.setNotice("很遗憾，这次没有中奖，再试试下一张吧！");
    }
}

function reveal(index: number) {
    if (!ticket.value) return;
    store.revealCell(ticket.value.id, index);
    finishScratchIfComplete();
}

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
watch(
    () => [showPlayPicker.value, showMoneyModal.value, showScratchModal.value],
    ([play, money, scratch]) => lockPageScroll(Boolean(play || money || scratch)),
    { immediate: true }
);
onBeforeUnmount(() => lockPageScroll(false));
</script>

<template>
    <div class="page game-page">
        <section class="hero">
            <div>
                <span class="eyebrow">LUCKY SCRATCH · IDLE TYCOON</span>
                <h1>今天的好运，<em>由你开启</em></h1>
                <p>选择彩票等级和玩法，刮开惊喜，积累财富，打造你的自动化彩票工厂。</p>
            </div>
            <div class="hero-stamp">🍀<b>GOOD<br />LUCK</b></div>
        </section>

        <GameStats
            :coins="store.game.coins"
            :pending-rewards="store.pendingRewards"
            :total-won="store.game.statistics.totalWon"
            :level="store.game.player.level"
        />
        <LotteryHall
            :lotteries="store.unlockedLotteries"
            :selected-lottery-id="selectedLotteryId"
            :coins="store.game.coins"
            :luck="store.game.talents.luck"
            @choose="chooseLottery"
        />
        <GameSidebar
            :machine="store.game.machine"
            :player="store.game.player"
            :pending-rewards="store.pendingRewards"
        />
        <RecentTickets :tickets="store.game.tickets" />
    </div>

    <PlayPickerDialog
        :visible="showPlayPicker"
        :lottery-name="config.name"
        :price="config.price"
        @close="showPlayPicker = false"
        @select="buy"
    />
    <MoneyDialog
        :visible="showMoneyModal"
        :lottery="insufficientLottery"
        :coins="store.game.coins"
        @close="showMoneyModal = false"
    />
    <ScratchDialog
        :visible="showScratchModal"
        :ticket="ticket"
        :lottery="ticketConfig"
        :play-type="selectedPlayType"
        :values="ticketValues"
        :prizes="ticketPrizes"
        :target="ticketTarget"
        @close="showScratchModal = false"
        @progress="updateTicketCellProgress"
        @reveal="reveal"
    />
</template>
