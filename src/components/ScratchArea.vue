<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import type { PlayType } from "../types/game";
import { PLAY_LAYOUT } from "../utils/playLayout";
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
const canvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let drawing = false;
let lastPoint: { x: number; y: number } | null = null;
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
const isNumberMatch = () => props.playType === "number-match";
const progress = () => {
    const values = isNumberMatch()
        ? props.cellProgress.slice(1)
        : props.cellProgress;
    return values.length ? Math.max(...values) : 0;
};
const matchedIndices = () =>
    props.values
        .slice(1)
        .map((value, index) => (value === props.target ? index : -1))
        .filter((index) => index >= 0);
const matchedPrize = () =>
    matchedIndices().reduce(
        (sum, index) => sum + (props.prizes?.[index] ?? 0),
        0
    );
const scratchStartIndex = () => (isNumberMatch() ? 1 : 0);
const allRevealed = () =>
    props.values
        .slice(scratchStartIndex())
        .every((_, offset) =>
            props.revealedCells.includes(offset + scratchStartIndex())
        );
function paint() {
    const el = canvas.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.max(1, Math.floor(rect.width * dpr));
    el.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width,
        h = rect.height;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#c5ccd9");
    gradient.addColorStop(0.22, "#f7f8fb");
    gradient.addColorStop(0.5, "#aeb8c9");
    gradient.addColorStop(0.78, "#eef0f5");
    gradient.addColorStop(1, "#9ba7ba");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#66738a";
    ctx.lineWidth = 1;
    for (let x = -h; x < w + h; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#56647b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 17px sans-serif";
    ctx.fillText("SCRATCH TO REVEAL", w / 2, h / 2 - 8);
    ctx.font = "600 10px sans-serif";
    ctx.fillText("刮开整张涂层，揭晓全部内容", w / 2, h / 2 + 14);
    const ratio = Math.min(0.98, progress());
    if (ratio > 0) {
        ctx.globalCompositeOperation = "destination-out";
        const count = Math.floor(ratio * 150);
        for (let i = 0; i < count; i++) {
            const x = (((i * 67) % 997) / 997) * w;
            const y = (((i * 139) % 991) / 991) * h;
            ctx.beginPath();
            ctx.arc(x, y, 11, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    }
    if (allRevealed() && props.values.length) ctx.clearRect(0, 0, w, h);
}
function erase(x: number, y: number) {
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
}
function point(e: PointerEvent) {
    if (!canvas.value) return null;
    const rect = canvas.value.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function down(e: PointerEvent) {
    if (allRevealed()) return;
    const p = point(e);
    if (!p) return;
    drawing = true;
    lastPoint = p;
    canvas.value?.setPointerCapture(e.pointerId);
    erase(p.x, p.y);
}
function move(e: PointerEvent) {
    if (!drawing || !ctx) return;
    const p = point(e);
    if (!p) return;
    if (lastPoint) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 44;
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    }
    erase(p.x, p.y);
    lastPoint = p;
}
function up() {
    if (!drawing) return;
    drawing = false;
    lastPoint = null;
    checkProgress();
}
function checkProgress() {
    const el = canvas.value;
    if (!el || !ctx) return;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 40) transparent++;
    const ratio = transparent / (data.length / 4);
    for (let i = scratchStartIndex(); i < props.values.length; i++)
        emit("progress", i, ratio);
    if (ratio >= 0.42) {
        for (let i = scratchStartIndex(); i < props.values.length; i++)
            emit("reveal", i);
    }
}
onMounted(async () => {
    await nextTick();
    paint();
    window.addEventListener("resize", paint);
});
onBeforeUnmount(() => window.removeEventListener("resize", paint));
watch(
    () => [
        props.playType,
        props.values.join(","),
        props.revealedCells.join(","),
        props.cellProgress.join(","),
        props.prizes?.join(",") ?? ""
    ],
    async () => {
        await nextTick();
        paint();
    }
);
</script>
<template>
    <div class="play-board" :class="`play-${playType}`">
        <div class="play-heading"><span>{{ heading[playType] }}</span><small>{{ isNumberMatch()?'6 个号码待刮开':`${values.length} 个内容区域 · 整张彩票共用一层涂层` }}</small></div>
        <div v-if="isNumberMatch()" class="scratch-area number-match-area">
            <section class="lucky-number-section">
                <div class="number-section-title"><span>★ 中奖号码 ★</span><small>LUCKY NUMBER</small></div>
                <div class="lucky-number-card number-revealed"><strong>{{ values[0] }}</strong><small>无需刮开 · 对照下方号码</small></div>
            </section>
            <section class="my-numbers-section">
                <div class="number-section-title"><span>我的号码</span><small>MY NUMBERS · MATCH & WIN</small></div>
                <div class="my-number-scratch-area">
                    <div class="my-number-grid">
                        <article v-for="(value,index) in values.slice(1)" :key="index" class="my-number-card" :class="{'number-revealed':revealedCells.includes(index+1),'number-match-win':revealedCells.includes(index+1)&&value===target}"><span class="number-index">号码 {{ index+1 }}</span><strong>{{ value }}</strong><small class="number-prize">{{ (prizes?.[index]??0).toLocaleString() }} 金币</small><b
                                v-if="revealedCells.includes(index+1)&&value===target" class="match-ribbon">🎉 中奖</b></article>
                    </div><canvas ref="canvas" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" />
                </div>
            </section>
            <div v-if="allRevealed()" class="number-match-result">
                <div class="number-match-summary">
                    <div><span>开奖结果</span><b>{{ matchedIndices().length?`${matchedIndices().length} 个号码匹配`:'未中奖 · 谢谢参与' }}</b></div>
                    <div><span>本票累计奖金</span><strong>{{ matchedPrize().toLocaleString() }} 金币</strong></div>
                </div>
                <ul v-if="matchedIndices().length" class="number-match-details">
                    <li v-for="index in matchedIndices()" :key="index">号码 {{ index+1 }} 匹配，中奖 {{ (prizes?.[index]??0).toLocaleString() }} 金币</li>
                </ul>
            </div>
        </div>
        <template v-else>
            <div class="play-labels" :style="{gridTemplateColumns:`repeat(${layout().columns},minmax(0,1fr))`}"><span v-for="(label,index) in layout().labels" :key="index">{{ label }}</span></div>
            <div class="scratch-area" :style="{gridTemplateColumns:`repeat(${layout().columns},minmax(0,1fr))`,gridTemplateRows:`repeat(${layout().rows},minmax(0,1fr))`}">
                <div v-for="(value,index) in values" :key="index" class="scratch-value" :class="[`cell-${index}`,{revealed:revealedCells.includes(index)}]"><strong>{{ value }}</strong></div><canvas ref="canvas" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" />
            </div>
        </template>
        <p class="scratch-hint">{{ isNumberMatch()?'滑动刮开下方「我的号码」，上方中奖号码无需刮开':'用鼠标或手指在彩票表面滑动，刮开同一整层银色涂层' }}</p>
    </div>
</template>
<style scoped>
.play-board {
    padding: 14px;
    border-radius: 14px;
    background: #17243b;
    border: 1px solid #ffffff30;
}
.play-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    color: #ffdf91;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.2px;
    margin-bottom: 10px;
}
.play-heading small {
    color: #d5d9e8;
    font-size: 9px;
    letter-spacing: 0;
    text-align: right;
}
.scratch-area {
    position: relative;
    display: grid;
    gap: 7px;
    min-height: 82px;
    isolation: isolate;
}
.scratch-value {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 72px;
    border-radius: 11px;
    background: linear-gradient(145deg, #fff8df, #f9e8b4);
    border: 1px solid #f1d88b;
    overflow: hidden;
}
.scratch-value strong {
    font-size: clamp(17px, 3.5vw, 30px);
    font-weight: 900;
    color: #9c5b13;
    overflow-wrap: anywhere;
}
.scratch-value.revealed {
    box-shadow: inset 0 0 0 2px #e6b84e;
}
.scratch-area canvas {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
    border-radius: 11px;
}
.play-symbol-match .scratch-value,
.play-line-match .scratch-value {
    background: linear-gradient(145deg, #fff4d5, #e8d2a0);
    border-radius: 50%;
}
.play-coordinate .scratch-value {
    background: linear-gradient(145deg, #d9f2e4, #a4d8bd);
    border-radius: 8px;
}
.play-step-walk .scratch-value {
    background: linear-gradient(145deg, #f0e2ff, #c8b2e8);
}
.play-direct-prize .scratch-value {
    background: linear-gradient(145deg, #fff0b8, #e9c35e);
    border: 2px solid #e7b84f;
}
.play-number-compare .scratch-value:nth-child(2),
.play-number-sum .scratch-value:nth-child(2) {
    background: linear-gradient(145deg, #d8e9ff, #a8c8ed);
}
.scratch-hint {
    margin: 9px 0 0;
    text-align: center;
    color: #aab5cf;
    font-size: 10px;
}
.number-match-area {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    background: linear-gradient(160deg, #203654, #13243c);
    min-height: 0;
}
.number-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    color: #ffe3a0;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.5px;
}
.number-section-title small {
    font-size: 9px;
    letter-spacing: 1px;
    color: #b9c9df;
}
.lucky-number-section {
    padding: 12px;
    border: 1px solid #f2c86c80;
    border-radius: 12px;
    background: linear-gradient(135deg, #5d4520, #302b25);
    text-align: center;
}
.lucky-number-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    min-height: 78px;
    border: 2px dashed #e8c46f;
    border-radius: 10px;
    background: radial-gradient(
        circle at 50% 20%,
        #fff3bd,
        #e7b84f 75%,
        #b77a22
    );
    color: #70400d;
}
.lucky-number-card strong {
    font-size: clamp(34px, 8vw, 48px);
    font-weight: 1000;
    text-shadow: 0 2px #fff8;
}
.lucky-number-card small {
    font-size: 10px;
    font-weight: 800;
    color: #754b17;
}
.my-numbers-section {
    padding: 2px 0;
}
.my-number-scratch-area {
    position: relative;
    isolation: isolate;
    border-radius: 10px;
    overflow: hidden;
}
.my-number-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}
.my-number-scratch-area canvas {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
    border-radius: 10px;
}
.my-number-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    min-height: 98px;
    padding: 8px 4px;
    border: 1px solid #c4d4e7;
    border-radius: 10px;
    background: linear-gradient(145deg, #f5f8ff, #dbe7f5);
    color: #263b59;
    overflow: hidden;
}
.number-index {
    font-size: 9px;
    color: #60748f;
    font-weight: 700;
}
.my-number-card > strong {
    font-size: clamp(23px, 5vw, 30px);
    line-height: 1.1;
    color: #173e70;
    font-weight: 1000;
}
.number-prize {
    font-size: 10px;
    color: #9a641c;
    font-weight: 900;
}
.my-number-card.number-match-win {
    border: 2px solid #f6c64e;
    background: linear-gradient(145deg, #fff4bd, #f6d46e);
    box-shadow: 0 0 0 2px #f5c54a33, inset 0 0 14px #fff8;
}
.my-number-card.number-match-win > strong {
    color: #8c4a08;
}
.match-ribbon {
    position: absolute;
    right: 0;
    top: 0;
    padding: 3px 6px;
    border-bottom-left-radius: 8px;
    background: #c64b26;
    color: white;
    font-size: 9px;
}
.number-match-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 9px;
    background: #0e1a2b;
    color: #dce8f8;
    font-size: 11px;
}
.number-match-summary div {
    display: grid;
    gap: 3px;
}
.number-match-summary span {
    color: #aabbd3;
}
.number-match-summary strong {
    color: #ffd36b;
    font-size: 15px;
}
.number-match-details {
    margin: 7px 0 0;
    padding: 8px 10px 8px 25px;
    border-radius: 8px;
    background: #fff8e5;
    color: #85521b;
    font-size: 10px;
    line-height: 1.7;
}
.number-match-details li::marker {
    color: #d99b2c;
}
@media (max-width: 420px) {
    .number-match-area {
        padding: 8px;
        gap: 9px;
    }
    .my-number-grid {
        gap: 5px;
    }
    .my-number-card {
        min-height: 88px;
    }
}
</style>
