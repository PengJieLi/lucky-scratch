<script setup lang="ts">
import type { LotteryConfig } from "../../types/game";
defineProps<{ visible: boolean; lottery: LotteryConfig; coins: number }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
    <div v-if="visible" class="modal-backdrop game-modal-backdrop" @click.self="emit('close')">
        <section class="panel game-dialog money-dialog">
            <button class="modal-close" @click="emit('close')">×</button>
            <div class="money-icon">🪙</div>
            <h2>金币不足</h2>
            <p>购买「{{ lottery.name }}」需要 <b>{{ lottery.price.toLocaleString() }}</b> 金币，你目前只有 <b>{{ coins.toLocaleString() }}</b> 金币。</p>
            <button class="btn primary full" @click="emit('close')">我知道了</button>
        </section>
    </div>
</template>
