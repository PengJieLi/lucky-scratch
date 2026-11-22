
<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
} from 'vue';
import type { Ticket } from '../types/game';
import ScratchCell from './ScratchCell.vue';

const props = defineProps<{
  ticket: Ticket;
  autoIntervalMs: number;
}>();

const emit = defineEmits<{
  close: [];
  reveal: [index: number];
  submit: [];
}>();

const autoBusy = ref(false);
const scratchProgress = ref(0);

let cancelled = false;

const allRevealed = computed(() => {
  return (
    props.ticket.revealedCells.length >= props.ticket.cellCount ||
    [
      'scratched',
      'queued',
      'verifying',
      'completed',
    ].includes(props.ticket.status)
  );
});

const showResult = computed(() => {
  return [
    'scratched',
    'queued',
    'verifying',
    'completed',
  ].includes(props.ticket.status);
});

const progress = computed(() => {
  return allRevealed.value
    ? 100
    : scratchProgress.value;
});

function wait(ms: number) {
  return new Promise<void>(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function revealAll() {
  if (allRevealed.value) return;

  scratchProgress.value = 100;

  for (
    let index = 0;
    index < props.ticket.cellCount;
    index += 1
  ) {
    if (props.ticket.revealedCells.includes(index)) {
      continue;
    }

    emit('reveal', index);
  }
}

async function autoScratch() {
  if (
    autoBusy.value ||
    allRevealed.value
  ) {
    return;
  }

  autoBusy.value = true;
  cancelled = false;

  await wait(props.autoIntervalMs);

  if (!cancelled) {
    revealAll();
  }

  autoBusy.value = false;
}

function close() {
  cancelled = true;
  emit('close');
}

function submit() {
  cancelled = true;
  emit('submit');
}

onBeforeUnmount(() => {
  cancelled = true;
});
</script>

<template>
  <Teleport to="body">
    <div
      class="scratch-modal-backdrop"
      @click.self="close"
    >
      <section
        class="scratch-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="ticket.name"
      >
        <header class="scratch-modal-header">
          <div>
            <span class="scratch-modal-eyebrow">
              LUCKY SCRATCH
            </span>

            <h2>{{ ticket.name }}</h2>
          </div>

          <button
            class="scratch-modal-close"
            aria-label="关闭刮奖弹窗"
            @click="close"
          >
            ×
          </button>
        </header>

        <p class="scratch-modal-subtitle">
          刮开整张涂层，揭晓全部三个数字
        </p>

        <div
          class="scratch-ticket-face"
          :class="`ticket-theme-${ticket.gameId}`"
        >
          <div class="scratch-ticket-brand">
            ✦ {{ ticket.name }} ✦
          </div>

          <div class="scratch-ticket-rule">
            刮开全部数字，匹配三连号赢取奖金
          </div>

          <div class="scratch-cells">
            <ScratchCell
              :values="ticket.results"
              :revealed="allRevealed"
              :threshold="0.42"
              @progress="scratchProgress = $event"
              @reveal="revealAll"
            />
          </div>

          <div class="scratch-ticket-foot">
            LUCKY NUMBERS ·
            {{ ticket.id.slice(-8).toUpperCase() }}
          </div>
        </div>

        <div class="scratch-progress-row">
          <span>整张彩票刮开进度</span>
          <span>{{ progress }}%</span>
        </div>

        <div class="scratch-progress-track">
          <div
            class="scratch-progress-value"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <!-- 始终预留结果区域，避免弹窗高度变化 -->
        <div
          class="scratch-result-slot"
          :class="{ 'is-hidden': !showResult }"
          aria-live="polite"
        >
          <div
            class="scratch-result"
            :class="ticket.isWinner ? 'is-win' : 'is-loss'"
          >
            <template v-if="ticket.isWinner">
              <strong>
                {{
                  ticket.winLevel === 'special777'
                    ? '🎉 777 特等奖！'
                    : '🎉 三连号中奖！'
                }}
              </strong>

              <span>
                中奖组合：{{ ticket.results.join(' · ') }}
              </span>

              <b>
                奖金 🪙 {{ ticket.prize.toLocaleString() }}
              </b>
            </template>

            <template v-else>
              <strong>再接再厉</strong>

              <span>
                本次号码：{{ ticket.results.join(' · ') }}
              </span>

              <small>没有匹配的三连号</small>
            </template>
          </div>
        </div>

        <div class="scratch-modal-actions">
          <button
            v-if="
              ticket.status === 'purchased' ||
              ticket.status === 'scratching'
            "
            class="ghost-btn"
            :disabled="autoBusy || allRevealed"
            @click="autoScratch"
          >
            {{
              autoBusy
                ? '自动刮开中…'
                : '⚡ 自动刮开'
            }}
          </button>

          <button
            v-if="ticket.status === 'scratched'"
            class="primary-btn"
            @click="submit"
          >
            提交验票 →
          </button>

          <button
            v-if="
              ticket.status === 'queued' ||
              ticket.status === 'verifying'
            "
            class="ghost-btn"
            disabled
          >
            已提交验票
          </button>

          <button
            v-if="ticket.status === 'completed'"
            class="ghost-btn"
            disabled
          >
            验票已完成
          </button>

          <button
            class="scratch-close-action"
            @click="close"
          >
            关闭
          </button>
        </div>

        <p class="scratch-modal-tip">
          手动刮奖：在整张涂层上滑动鼠标或手指。
          刮开面积达到 42% 后，剩余涂层会自动清除。
        </p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.scratch-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(4, 10, 19, .78);
  backdrop-filter: blur(8px);
}

.scratch-modal {
  width: min(560px, 100%);
  max-height: min(92vh, 900px);
  overflow: auto;
  padding: 24px;
  border: 1px solid #48556a;
  border-radius: 22px;
  background: linear-gradient(150deg, #1d2c42, #101b2c);
  box-shadow: 0 28px 90px rgba(0, 0, 0, .48);
  color: #f3f6fb;
}

.scratch-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scratch-modal-eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  color: #e8b957;
  font-weight: 800;
}

.scratch-modal-header h2 {
  margin: 7px 0 0;
  font-size: 24px;
}

.scratch-modal-close {
  width: 36px;
  height: 36px;
  border: 1px solid #46566d;
  border-radius: 10px;
  background: #26374d;
  color: #fff;
  font-size: 25px;
  line-height: 1;
}

.scratch-modal-subtitle {
  margin: 12px 0 18px;
  color: #9eafc4;
  font-size: 13px;
}

.scratch-ticket-face {
  padding: 20px;
  border: 2px solid #e0b452;
  border-radius: 18px;
  background: radial-gradient(
    circle at 50% 0,
    #fff0b9,
    #e9b955 62%,
    #bd8030
  );
  color: #603a12;
  box-shadow: inset 0 0 0 4px rgba(255, 255, 255, .22);
}

.ticket-theme-gold {
  background: radial-gradient(
    circle at 50% 0,
    #fff4c9,
    #e7c66b 62%,
    #9e7428
  );
}

.ticket-theme-diamond {
  background: radial-gradient(
    circle at 50% 0,
    #f0fdff,
    #9ed9e8 62%,
    #4d8caa
  );
}

.ticket-theme-lucky777 {
  background: radial-gradient(
    circle at 50% 0,
    #ffe9c9,
    #ed9d50 62%,
    #963e2c
  );
}

.scratch-ticket-brand {
  text-align: center;
  font-size: 21px;
  font-weight: 1000;
  letter-spacing: 3px;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .65);
}

.scratch-ticket-rule {
  text-align: center;
  margin: 8px 0 18px;
  font-size: 11px;
  font-weight: 700;
  opacity: .78;
}

.scratch-cells {
  width: 100%;
}

.scratch-ticket-foot {
  text-align: center;
  margin-top: 15px;
  font-size: 9px;
  letter-spacing: 2px;
  font-weight: 800;
  opacity: .55;
}

.scratch-progress-row {
  display: flex;
  justify-content: space-between;
  margin: 17px 0 8px;
  color: #aebbd0;
  font-size: 12px;
}

.scratch-progress-track {
  height: 7px;
  border-radius: 99px;
  background: #2b3b51;
  overflow: hidden;
}

.scratch-progress-value {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #d99c3d, #ffdb83);
  transition: width .2s;
}

/* 固定结果区域高度，显示结果时不再撑高弹窗 */
.scratch-result-slot {
  height: 116px;
  margin-top: 18px;
}

.scratch-result-slot.is-hidden {
  visibility: hidden;
}

.scratch-result {
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 12px;
  border-radius: 14px;
  text-align: center;
}

.scratch-result.is-win {
  border: 1px solid #80642f;
  background: rgba(111, 81, 29, .25);
  color: #ffdc8a;
}

.scratch-result.is-loss {
  border: 1px solid #40516a;
  background: rgba(40, 56, 77, .5);
  color: #c4d0df;
}

.scratch-result strong {
  font-size: 18px;
}

.scratch-result b {
  font-size: 24px;
}

.scratch-result span,
.scratch-result small {
  font-size: 12px;
}

.scratch-modal-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.scratch-close-action {
  padding: 11px 20px;
  border: 1px solid #46566d;
  border-radius: 11px;
  background: transparent;
  color: #c5d0df;
  font-weight: 700;
}

.scratch-modal-tip {
  margin: 14px 0 0;
  text-align: center;
  color: #788ba4;
  font-size: 10px;
  line-height: 1.6;
}

@media (max-width: 480px) {
  .scratch-modal {
    padding: 16px;
  }

  .scratch-ticket-face {
    padding: 14px;
  }

  .scratch-modal-header h2 {
    font-size: 21px;
  }

  .scratch-modal-subtitle {
    font-size: 12px;
  }

  .scratch-modal-backdrop {
    padding: 8px;
  }
}
</style>
