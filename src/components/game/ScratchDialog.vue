<script setup lang="ts">
import type { LotteryConfig, PlayType, Ticket } from "../../types/game";
import ScratchArea from "../ScratchArea.vue";
defineProps<{
    visible: boolean;
    ticket: Ticket | null;
    lottery: LotteryConfig;
    playType: PlayType;
    values: (string | number)[];
    prizes: number[];
    target?: string | number;
}>();
const emit = defineEmits<{
    close: [];
    reveal: [index: number];
    progress: [index: number, value: number];
}>();
</script>

<template>
    <div v-if="visible && ticket" class="modal-backdrop game-modal-backdrop scratch-modal-backdrop" @click.self="emit('close')">
        <section class="panel game-dialog scratch-dialog">
            <div class="ticket-art scratch-ticket-modal" :class="lottery.theme" style="-webkit-user-select: none; user-select: none; -webkit-touch-callout: none;" @selectstart.prevent @dragstart.prevent>
                <ScratchArea
                    :play-type="playType"
                    :values="values"
                    :revealed-cells="ticket.revealedCells"
                    :cell-progress="ticket.cellProgress"
                    :prizes="prizes"
                    :target="target"
                    @progress="(index, value) => emit('progress', index, value)"
                    @reveal="(index) => emit('reveal', index)"
                />
            </div>
        </section>
    </div>
</template>
