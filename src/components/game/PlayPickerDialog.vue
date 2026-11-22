<script setup lang="ts">
import type { PlayType } from "../../types/game";
import { PLAY_TYPES } from "../../config/playTypes";
defineProps<{ visible: boolean; lotteryName: string; price: number }>();
const emit = defineEmits<{ close: []; select: [playType: PlayType] }>();
</script>

<template>
    <div v-if="visible" class="modal-backdrop game-modal-backdrop" @click.self="emit('close')">
        <section class="panel game-dialog play-picker-dialog">
            <button class="modal-close" @click="emit('close')">×</button>
            <span class="eyebrow">SELECT GAME MODE</span>
            <h2>选择 {{ lotteryName }} 的玩法</h2>
            <p class="dialog-description">选择一种玩法，系统会在购票时固定生成开奖结果。</p>
            <div class="play-picker-grid">
                <button v-for="play in PLAY_TYPES" :key="play.id" @click="emit('select', play.id)">
                    <span>{{ play.icon }}</span>
                    <div><b>{{ play.name }}</b><small>{{ play.description }}</small></div>
                    <strong>›</strong>
                </button>
            </div>
            <div class="dialog-footer">
                <span>票价 <b>{{ price === 0 ? "免费" : `${price.toLocaleString()} 金币` }}</b></span>
                <span>购买后立即打开刮奖窗口</span>
            </div>
        </section>
    </div>
</template>
