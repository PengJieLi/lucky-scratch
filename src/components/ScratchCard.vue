<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  ref,
  withDefaults,
} from 'vue';

const props = withDefaults(
  defineProps<{
    ticketId: string;
    revealed: boolean;
    requiredClearRatio?: number;
  }>(),
  {
    requiredClearRatio: 0.42,
  },
);

const emit = defineEmits<{
  start: [];
  complete: [];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

let drawing = false;
let completed = false;

let ctx: CanvasRenderingContext2D | null = null;

/**
 * 初始化刮奖涂层。
 */
function paint(): void {
  const el = canvas.value;

  if (!el) return;

  const dpr = window.devicePixelRatio || 1;

  const rect = el.getBoundingClientRect();

  el.width = rect.width * dpr;
  el.height = rect.height * dpr;

  ctx = el.getContext('2d');

  if (!ctx) return;

  ctx.scale(dpr, dpr);

  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#b8c2d1';

  ctx.fillRect(
    0,
    0,
    rect.width,
    rect.height,
  );

  ctx.fillStyle = '#66758a';

  ctx.font = '700 22px system-ui';

  ctx.textAlign = 'center';

  ctx.textBaseline = 'middle';

  ctx.fillText(
    '刮开这里',
    rect.width / 2,
    rect.height / 2,
  );

  ctx.globalCompositeOperation = 'destination-out';

  if (props.revealed) {
    ctx.clearRect(
      0,
      0,
      rect.width,
      rect.height,
    );

    completed = true;
  }
}

/**
 * 获取鼠标或触摸位置。
 */
function point(event: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * 开始刮奖。
 */
function down(event: PointerEvent): void {
  if (props.revealed || completed) {
    return;
  }

  drawing = true;

  canvas.value?.setPointerCapture(
    event.pointerId,
  );

  emit('start');

  move(event);
}

/**
 * 刮除涂层。
 */
function move(event: PointerEvent): void {
  if (
    !drawing ||
    !ctx ||
    !canvas.value
  ) {
    return;
  }

  const position = point(event);

  ctx.beginPath();

  ctx.arc(
    position.x,
    position.y,
    20,
    0,
    Math.PI * 2,
  );

  ctx.fill();

  checkProgress();
}

/**
 * 停止刮奖。
 */
function up(): void {
  drawing = false;
}

/**
 * 检查当前刮开的面积。
 */
function checkProgress(): void {
  const el = canvas.value;

  if (!el || !ctx || completed) {
    return;
  }

  const data = ctx.getImageData(
    0,
    0,
    el.width,
    el.height,
  ).data;

  let clear = 0;

  let total = 0;

  // 每隔 12 个像素抽样一次，减少计算量。
  for (
    let i = 3;
    i < data.length;
    i += 4 * 12
  ) {
    total++;

    if (data[i] < 30) {
      clear++;
    }
  }

  const ratio = total > 0
    ? clear / total
    : 0;

  if (ratio >= props.requiredClearRatio) {
    finish();
  }
}

/**
 * 完成刮奖。
 */
function finish(): void {
  if (completed) {
    return;
  }

  completed = true;

  drawing = false;

  if (ctx && canvas.value) {
    const rect = canvas.value.getBoundingClientRect();

    ctx.clearRect(
      0,
      0,
      rect.width,
      rect.height,
    );
  }

  emit('complete');
}

onMounted(() => {
  paint();
});

onBeforeUnmount(() => {
  drawing = false;
  ctx = null;
});

defineExpose({
  finish,
});
</script>

<template>
  <div class="scratch-wrap">
    <div class="scratch-under">
      <slot />
    </div>

    <canvas
      ref="canvas"
      class="scratch-layer"
      @pointerdown.prevent="down"
      @pointermove.prevent="move"
      @pointerup="up"
      @pointercancel="up"
      @pointerleave="up"
    />
  </div>
</template>

<style scoped>
.scratch-wrap {
  position: relative;
  min-height: 170px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #fff3c4,
    #ffe08a
  );
}

.scratch-under {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.scratch-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
</style>