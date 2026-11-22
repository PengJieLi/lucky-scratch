
<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';

import { useGameStore } from '../stores/game';

const game = useGameStore();

const now = ref(Date.now());

let timer = 0;

const current = computed(
  () => game.state.machine.currentTask,
);

const currentTicket = computed(() =>
  current.value
    ? game.state.tickets.find(
        ticket => ticket.id === current.value!.ticketId,
      )
    : null,
);

const remaining = computed(() =>
  current.value?.status === 'failed'
    ? current.value.remainingDuration ?? 0
    : Math.max(
        0,
        (current.value?.endAt ?? now.value) - now.value,
      ),
);

const progress = computed(() =>
  current.value
    ? Math.min(
        100,
        Math.max(
          0,
          100 -
            remaining.value /
              current.value.duration *
              100,
        ),
      )
    : 0,
);

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now();
  }, 100);
});

onUnmounted(() => {
  clearInterval(timer);
});

function resume() {
  if (current.value) {
    const result = game.resumeTask(current.value.id);

    if (!result.ok) {
      game.notice = result.error;
    }
  }
}
</script>

<template>
  <section class="page-heading">
    <span class="eyebrow">MACHINE CONTROL CENTER</span>

    <h1>验票机 <em>控制中心</em></h1>

    <p class="muted">
      单机处理，FIFO 先进先出。
      当前任务完成后自动处理下一张彩票。
    </p>
  </section>

  <div class="machine-layout">
    <section class="panel current-machine">
      <div class="section-heading">
        <div>
          <span class="eyebrow">CURRENT TASK</span>
          <h2>当前验票任务</h2>
        </div>

        <span
          class="pill"
          :class="
            current?.status === 'failed'
              ? 'warning-pill'
              : 'success-pill'
          "
        >
          {{
            !current
              ? '空闲'
              : current.status === 'failed'
                ? '异常暂停'
                : '验票中'
          }}
        </span>
      </div>

      <div class="machine-hero">
        <span class="machine-big">🎰</span>

        <div>
          <h3>
            {{ currentTicket?.name ?? '验票机正在待命' }}
          </h3>

          <p class="muted">
            {{
              current
                ? `任务编号：${current.id}`
                : '提交一张已刮开的彩票，验票机就会启动；未中奖票也会完成验票。'
            }}
          </p>

          <b v-if="current">
            🪙 {{ current.reward.toLocaleString() }}
          </b>
        </div>
      </div>

      <template v-if="current">
        <div class="progress-track">
          <div
            class="progress-value"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <div class="progress-meta">
          <span>
            {{
              current.status === 'failed'
                ? '任务已暂停'
                : `已完成 ${progress.toFixed(0)}%`
            }}
          </span>

          <b>{{ (remaining / 1000).toFixed(1) }}s</b>
        </div>

        <div
          v-if="current.status === 'failed'"
          class="failure-box"
        >
          <b>⚠ {{ current.failureReason }}</b>

          <p>
            任务已保留，等待你手动恢复。
            队列中的其他任务不会越过当前任务。
          </p>

          <button
            class="primary-btn"
            @click="resume"
          >
            恢复验票
          </button>
        </div>
      </template>

      <div
        v-else
        class="idle-note"
      >
        ✨ 当前没有正在处理的任务
      </div>

      <p class="machine-note">
        基础验票时间：5 秒 · 当前任务不占用等待队列容量
      </p>
    </section>

    <section class="panel queue-panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">WAITING LINE</span>
          <h2>等待队列</h2>
        </div>

        <span class="pill">
          {{ game.state.machine.queue.length }} / 5
        </span>
      </div>

      <div class="queue-slots">
        <div
          v-for="(task, index) in game.state.machine.queue"
          :key="task.id"
          class="queue-item"
        >
          <span class="queue-number">
            {{ index + 1 }}
          </span>

          <div>
            <b>
              {{
                game.state.tickets.find(
                  ticket => ticket.id === task.ticketId,
                )?.name ?? '未知彩票'
              }}
            </b>

            <small>
              任务 {{ task.id.slice(-8) }}
            </small>
          </div>

          <strong>
            🪙 {{ task.reward.toLocaleString() }}
          </strong>
        </div>

        <div
          v-if="!game.state.machine.queue.length"
          class="queue-empty"
        >
          等待队列为空，新的已刮开彩票可以进入验票机。
        </div>
      </div>

      <div class="queue-footer">
        <span>剩余等待位</span>
        <b>{{ game.waitingCapacity }}</b>
      </div>
    </section>
  </div>

  <section class="panel machine-rules">
    <h2>验票规则</h2>

    <div class="rule-grid">
      <div>
        <b>FIFO</b>
        <small>先提交先验票</small>
      </div>

      <div>
        <b>1 张</b>
        <small>同时处理任务数</small>
      </div>

      <div>
        <b>5 张</b>
        <small>最大等待队列</small>
      </div>

      <div>
        <b>5 秒</b>
        <small>基础验票时间</small>
      </div>
    </div>
  </section>
</template>
