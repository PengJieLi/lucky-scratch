<script setup lang="ts">
import StatCard from "../StatCard.vue";

defineProps<{
    coins: number;
    pendingRewards: number;
    totalWon: number;
    level: number;
}>();
</script>

<template>
    <div class="stats-grid">
        <StatCard label="可用金币" :value="coins.toLocaleString()" icon="🪙" accent="gold" />
        <StatCard label="待兑奖" :value="pendingRewards.toLocaleString()" icon="🎟️" />
        <StatCard label="累计中奖" :value="totalWon" icon="🏆" />
        <StatCard label="玩家等级" :value="`Lv.${level}`" icon="⭐" />
    </div>
</template>
