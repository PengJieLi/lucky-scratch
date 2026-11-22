<script setup lang="ts">
import type { Ticket } from "../../types/game";
defineProps<{ tickets: Ticket[] }>();
const statusLabels: Record<string, string> = {
    purchased: "待刮奖",
    scratching: "刮奖中",
    scratched: "待验票",
    queued: "排队中",
    verifying: "验票中",
    completed: "已完成"
};
</script>

<template>
    <section class="panel recent-panel">
        <div class="section-head">
            <div><span class="eyebrow">YOUR COLLECTION</span><h2>最近的彩票</h2></div>
            <span class="muted">共 {{ tickets.length }} 张</span>
        </div>
        <div v-if="!tickets.length" class="empty">🎟️ 还没有彩票，选择等级和玩法，开启你的第一张幸运刮刮卡吧！</div>
        <div v-else class="ticket-list">
            <div v-for="ticket in tickets.slice(0, 5)" :key="ticket.id" class="ticket-row">
                <span class="ticket-emoji">{{ ticket.isWinner ? "🏆" : "🎫" }}</span>
                <div><b>{{ ticket.gameName }}</b><small>{{ new Date(ticket.createdAt).toLocaleString() }}</small></div>
                <span class="status" :class="ticket.status">
                    {{ ticket.status === "scratched" ? (ticket.isWinner ? "待验票" : "未中奖") : statusLabels[ticket.status] }}
                </span>
                <strong v-if="ticket.isWinner" class="reward">+{{ ticket.prize.toLocaleString() }}</strong>
            </div>
        </div>
    </section>
</template>
