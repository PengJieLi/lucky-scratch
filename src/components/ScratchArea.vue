<script setup lang="ts">
import { computed } from "vue";
import type { PlayType } from "../types/game";
import { PLAY_LAYOUT } from "../utils/playLayout";
import { useScratchCanvas } from "../composables/useScratchCanvas";

const props = defineProps<{
    values: (string | number)[];
    revealedCells: number[];
    cellProgress: number[];
    playType: PlayType;
    prizes?: number[];
    target?: string | number;
}>();
const emit = defineEmits<{
    reveal: [index: number];
    progress: [index: number, value: number];
}>();

const layout = () => PLAY_LAYOUT[props.playType];
const heading: Record<PlayType, string> = {
    "number-match": "MATCH YOUR NUMBERS",
    "symbol-match": "FIND THE SYMBOLS",
    "three-match": "TRIPLE MATCH",
    "line-match": "LUCKY LINE",
    "number-compare": "HIGHER NUMBER WINS",
    "number-sum": "SUM CHALLENGE",
    "direct-prize": "INSTANT PRIZE",
    coordinate: "LUCKY COORDINATE",
    "step-walk": "LUCKY PATH"
};
const isNumberMatch = computed(() => props.playType === "number-match");
const scratchStartIndex = () => (isNumberMatch.value ? 1 : 0);
const progress = computed(() => {
    const values = isNumberMatch.value ? props.cellProgress.slice(1) : props.cellProgress;
    return values.length ? Math.max(...values) : 0;
});
const allRevealed = () => props.values
    .slice(scratchStartIndex())
    .every((_, offset) => props.revealedCells.includes(offset + scratchStartIndex()));
const matchedIndices = computed(() => props.values
    .slice(1)
    .map((value, index) => value === props.target ? index : -1)
    .filter((index) => index >= 0));
const matchedPrize = computed(() => matchedIndices.value.reduce(
    (sum, index) => sum + (props.prizes?.[index] ?? 0), 0
));
const { canvas, down, move, up } = useScratchCanvas(
    props,
    emit,
    scratchStartIndex,
    allRevealed,
    () => progress.value
);
</script>
<template>
    <div class="play-board" :class="`play-${playType}`">
        <div class="play-heading">
            <span>{{ heading[playType] }}</span>
            <small>
                {{ isNumberMatch ? "6 个号码待刮开" : `${values.length} 个内容区域 · 整张彩票共用一层涂层` }}
            </small>
        </div>

        <div v-if="isNumberMatch" class="scratch-area number-match-area">
            <section class="lucky-number-section">
                <div class="number-section-title">
                    <span>★ 中奖号码 ★</span>
                    <small>LUCKY NUMBER</small>
                </div>
                <div class="lucky-number-card number-revealed">
                    <strong>{{ values[0] }}</strong>
                    <small>无需刮开 · 对照下方号码</small>
                </div>
            </section>

            <section class="my-numbers-section">
                <div class="number-section-title">
                    <span>我的号码</span>
                    <small>MY NUMBERS · MATCH & WIN</small>
                </div>
                <div class="my-number-scratch-area">
                    <div class="my-number-grid">
                        <article
                            v-for="(value, index) in values.slice(1)"
                            :key="index"
                            class="my-number-card"
                            :class="{
                                'number-revealed': revealedCells.includes(index + 1),
                                'number-match-win': revealedCells.includes(index + 1) && value === target
                            }"
                        >
                            <span class="number-index">号码 {{ index + 1 }}</span>
                            <strong>{{ value }}</strong>
                            <small class="number-prize">{{ (prizes?.[index] ?? 0).toLocaleString() }} 金币</small>
                            <b
                                v-if="revealedCells.includes(index + 1) && value === target"
                                class="match-ribbon"
                            >🎉 中奖</b>
                        </article>
                    </div>
                    <canvas
                        ref="canvas"
                        @pointerdown="down"
                        @pointermove="move"
                        @pointerup="up"
                        @pointercancel="up"
                    />
                </div>
            </section>

            <div v-if="allRevealed()" class="number-match-result">
                <div class="number-match-summary">
                    <div>
                        <span>开奖结果</span>
                        <b>{{ matchedIndices.length ? `${matchedIndices.length} 个号码匹配` : "未中奖 · 谢谢参与" }}</b>
                    </div>
                    <div>
                        <span>本票累计奖金</span>
                        <strong>{{ matchedPrize.toLocaleString() }} 金币</strong>
                    </div>
                </div>
                <ul v-if="matchedIndices.length" class="number-match-details">
                    <li v-for="index in matchedIndices" :key="index">
                        号码 {{ index + 1 }} 匹配，中奖 {{ (prizes?.[index] ?? 0).toLocaleString() }} 金币
                    </li>
                </ul>
            </div>
        </div>

        <template v-else>
            <div
                class="play-labels"
                :style="{ gridTemplateColumns: `repeat(${layout().columns}, minmax(0, 1fr))` }"
            >
                <span v-for="(label, index) in layout().labels" :key="index">{{ label }}</span>
            </div>
            <div
                class="scratch-area"
                :style="{
                    gridTemplateColumns: `repeat(${layout().columns}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${layout().rows}, minmax(0, 1fr))`
                }"
            >
                <div
                    v-for="(value, index) in values"
                    :key="index"
                    class="scratch-value"
                    :class="[`cell-${index}`, { revealed: revealedCells.includes(index) }]"
                >
                    <strong>{{ value }}</strong>
                </div>
                <canvas
                    ref="canvas"
                    @pointerdown="down"
                    @pointermove="move"
                    @pointerup="up"
                    @pointercancel="up"
                />
            </div>
        </template>

        <p class="scratch-hint">
            {{ isNumberMatch ? "滑动刮开下方「我的号码」，上方中奖号码无需刮开" : "用鼠标或手指在彩票表面滑动，刮开同一整层银色涂层" }}
        </p>
    </div>
</template>
<style scoped src="../styles/scratch-area.css"></style>
