<script setup lang="ts">
import type { GameState } from "../../types/game";

defineProps<{
    machine: GameState["machine"];
    player: GameState["player"];
    pendingRewards: number;
}>();
</script>

<template>
    <div class="game-lower-grid">
        <aside class="side-column">
            <section class="panel machine-mini">
                <div class="section-head">
                    <div><span class="eyebrow">VERIFY MACHINE</span><h2>验票中心</h2></div>
                    <span class="machine-icon">⚙️</span>
                </div>
                <div class="machine-visual">
                    <div class="machine-light" />
                    <div class="machine-slot">🎟️</div>
                    <b>{{ machine.currentTask ? "正在验票" : "设备空闲" }}</b>
                    <small>Lv.{{ machine.level }} · 队列 {{ machine.queue.length }}/{{ machine.maxQueue }}</small>
                </div>
                <div class="machine-footer">
                    <span>待兑奖 <b>{{ pendingRewards.toLocaleString() }}</b></span>
                    <span>等待任务 <b>{{ machine.queue.length }}</b></span>
                </div>
            </section>
            <section class="panel growth-card">
                <span class="eyebrow">PLAYER GROWTH</span>
                <h2>成长进度</h2>
                <div class="level-row">
                    <strong>Lv.{{ player.level }}</strong>
                    <span>{{ player.experience }} / {{ player.level * 100 }} EXP</span>
                </div>
                <div class="progress-line">
                    <span :style="{ width: `${Math.min(100, (player.experience / (player.level * 100)) * 100)}%` }" />
                </div>
                <div class="growth-bottom"><span>可用天赋点</span><b>✨ {{ player.talentPoints }}</b></div>
            </section>
        </aside>
    </div>
</template>
