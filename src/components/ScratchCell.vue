
<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

const props = defineProps<{
  values: number[];
  revealed: boolean;
  threshold?: number;
}>();

const emit = defineEmits<{
  reveal: [];
  progress: [value: number];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);

let context: CanvasRenderingContext2D | null = null;
let drawing = false;
let finished = false;
let lastProgress = 0;

function paintCover() {
  const element = canvas.value;

  if (!element || props.revealed) return;

  const rect = element.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;

  element.width = Math.round(rect.width * dpr);
  element.height = Math.round(rect.height * dpr);

  context = element.getContext('2d');

  if (!context) return;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.globalCompositeOperation = 'source-over';

  const gradient = context.createLinearGradient(
    0,
    0,
    rect.width,
    rect.height,
  );

  gradient.addColorStop(0, '#dce3eb');
  gradient.addColorStop(0.5, '#aeb9c8');
  gradient.addColorStop(1, '#e7edf4');

  context.fillStyle = gradient;
  context.fillRect(0, 0, rect.width, rect.height);

  // 涂层装饰纹理
  context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  context.lineWidth = 1;

  for (let x = -rect.height; x < rect.width; x += 18) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + rect.height, rect.height);
    context.stroke();
  }

  context.fillStyle = '#53647a';
  context.font = '800 18px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.fillText(
    '刮开涂层，揭晓幸运数字',
    rect.width / 2,
    rect.height / 2,
  );

  // 后续绘制使用 destination-out 擦除涂层
  context.globalCompositeOperation = 'destination-out';
}

function getPoint(event: PointerEvent) {
  const element = canvas.value;

  if (!element) return null;

  const rect = element.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function checkProgress() {
  const element = canvas.value;
  const ctx = context;

  if (!element || !ctx || finished) return;

  const pixels = ctx.getImageData(
    0,
    0,
    element.width,
    element.height,
  ).data;

  let transparent = 0;
  let sampled = 0;

  const stride = 4 * 16;

  for (let i = 3; i < pixels.length; i += stride) {
    sampled += 1;

    if (pixels[i] < 32) {
      transparent += 1;
    }
  }

  const ratio = sampled > 0
    ? transparent / sampled
    : 0;

  const progress = Math.min(
    100,
    Math.round(ratio * 100),
  );

  if (progress !== lastProgress) {
    lastProgress = progress;
    emit('progress', progress);
  }

  if (ratio >= (props.threshold ?? 0.42)) {
    reveal();
  }
}

function reveal() {
  if (finished) return;

  finished = true;
  drawing = false;
  lastProgress = 100;

  const element = canvas.value;

  if (context && element) {
    context.clearRect(
      0,
      0,
      element.width,
      element.height,
    );
  }

  emit('progress', 100);
  emit('reveal');
}

function pointerDown(event: PointerEvent) {
  if (props.revealed || finished) return;

  drawing = true;

  canvas.value?.setPointerCapture(event.pointerId);

  pointerMove(event);
}

function pointerMove(event: PointerEvent) {
  if (!drawing || !context || !canvas.value) {
    return;
  }

  const p = getPoint(event);

  if (!p) return;

  context.beginPath();
  context.arc(
    p.x,
    p.y,
    18,
    0,
    Math.PI * 2,
  );
  context.fill();

  checkProgress();
}

function pointerUp(event: PointerEvent) {
  drawing = false;

  const element = canvas.value;

  if (
    element &&
    element.hasPointerCapture(event.pointerId)
  ) {
    element.releasePointerCapture(event.pointerId);
  }
}

watch(
  () => props.revealed,
  async value => {
    if (value) {
      finished = true;
      drawing = false;
      lastProgress = 100;

      await nextTick();

      if (context && canvas.value) {
        context.clearRect(
          0,
          0,
          canvas.value.width,
          canvas.value.height,
        );
      }
    }
  },
);

onMounted(() => {
  nextTick(paintCover);
});

onBeforeUnmount(() => {
  drawing = false;
});

defineExpose({ reveal });
</script>

<template>
  <div
    class="scratch-area"
    :class="{ 'is-revealed': revealed }"
  >
    <!-- 数字始终存在于底层，由 Canvas 涂层遮挡 -->
    <div class="scratch-numbers">
      <div
        v-for="(value, index) in values"
        :key="index"
        class="scratch-number"
      >
        {{ value }}
      </div>
    </div>

    <canvas
      v-if="!revealed"
      ref="canvas"
      class="scratch-area-cover"
      @pointerdown.prevent="pointerDown"
      @pointermove.prevent="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="pointerUp"
    />
  </div>
</template>

<style scoped>
.scratch-area {
  position: relative;
  height: 112px;
  padding: 0 12px;
  border: 2px solid rgba(125, 82, 25, .35);
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(145deg, #fff8dc, #f8d77f);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 8px rgba(119, 77, 24, .12);
}

.scratch-numbers {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  text-align: center;
}

.scratch-number {
  font: 900 42px/1 system-ui;
  color: #8a4c13;
  text-shadow: 0 1px 0 #fff;
  user-select: none;
}

.scratch-area-cover {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.scratch-area.is-revealed {
  border-color: #e9b94f;
  box-shadow:
    0 0 0 2px rgba(233, 185, 79, .16),
    inset 0 2px 8px rgba(119, 77, 24, .12);
}

@media (max-width: 480px) {
  .scratch-number {
    font-size: 36px;
  }
}
</style>
