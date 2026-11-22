<script setup lang="ts">
import type { LotteryConfig } from "../../types/game";

defineProps<{
    lotteries: LotteryConfig[];
    selectedLotteryId: string;
    coins: number;
    luck: number;
}>();
const emit = defineEmits<{ choose: [id: string] }>();

function lotteryIcon(id: string) {
    const icons: Record<string, string> = {
        free: "🎫",
        gold: "🥇",
        diamond: "💎",
        lucky777: "🎰"
    };
    return icons[id] ?? "🎟️";
}
</script>

<template>
    <section class="panel lottery-hall">
        <div class="section-head">
            <div><span class="eyebrow">CHOOSE YOUR LUCK</span><h2>选择彩票等级</h2></div>
            <span class="pill">金币 {{ coins.toLocaleString() }}</span>
        </div>
        <div class="lottery-picker lottery-picker-grid">
            <button
                v-for="item in lotteries"
                :key="item.id"
                :class="[{ active: selectedLotteryId === item.id }, { unaffordable: item.price > coins }]"
                @click="emit('choose', item.id)"
            >
                <span class="lottery-icon">{{ lotteryIcon(item.id) }}</span>
                <b>{{ item.name }}</b>
                <strong>{{ item.price === 0 ? "免费" : `${item.price.toLocaleString()} 金币` }}</strong>
                <small>中奖概率 {{ Math.round(Math.min(0.8, item.baseWinRate + luck * 0.01) * 100) }}%</small>
                <small>基础奖金 {{ item.basePrize.toLocaleString() }}</small>
                <i v-if="item.price > coins">金币不足</i>
                <i v-else>选择玩法 →</i>
            </button>
        </div>
    </section>
</template>
