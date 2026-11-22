
<script setup lang="ts">
import { computed, ref } from 'vue';
import ScratchModal from '../components/ScratchModal.vue';
import { useGameStore } from '../stores/game';
import type { Ticket } from '../types/game';

const game = useGameStore();

const modalTicketId = ref<string | null>(null);

const tickets = computed(() =>
  [...game.state.tickets].reverse(),
);

const modalTicket = computed(() =>
  modalTicketId.value
    ? game.state.tickets.find(
        ticket => ticket.id === modalTicketId.value,
      ) ?? null
    : null,
);

/**
 * 效率天赋影响自动刮奖间隔。
 * 每级减少 5%，最低保留基础时间的 20%。
 */
const autoScratchInterval = computed(() => {
  if (!modalTicket.value) return 900;

  const config = game.lotteries.find(
    item => item.id === modalTicket.value!.gameId,
  );

  const base = config?.scratchDuration ?? 900;

  const efficiencyLevel =
    game.state.talents.efficiency ?? 0;

  return Math.max(
    100,
    Math.ceil(
      base * Math.max(
        0.2,
        1 - efficiencyLevel * 0.05,
      ),
    ),
  );
});

function openTicket(ticket: Ticket) {
  if (
    ticket.status === 'purchased' ||
    ticket.status === 'scratching' ||
    ticket.status === 'scratched'
  ) {
    modalTicketId.value = ticket.id;
  }
}

/**
 * 开始免费彩票。
 */
function startFree() {
  const result = game.startFreeTicket();

  if (!result.ok) {
    game.notice = result.error;
    return;
  }

  modalTicketId.value = result.data.id;
}

/**
 * 购买付费彩票。
 */
function buy(gameId: string) {
  const result = game.purchase(gameId);

  if (!result.ok) {
    game.notice = result.error;
    return;
  }

  modalTicketId.value = result.data.id;
}

/**
 * 揭晓一个数字区域。
 */
function reveal(index: number) {
  if (!modalTicket.value) return;

  const result = game.revealCell(
    modalTicket.value.id,
    index,
  );

  if (!result.ok) {
    game.notice = result.error;
  }
}

/**
 * 提交验票。
 */
function submitCurrentTicket() {
  if (!modalTicket.value) return;

  const result = game.submitTicket(
    modalTicket.value.id,
  );

  if (!result.ok) {
    game.notice = result.error;
    return;
  }

  modalTicketId.value = null;
}

function statusLabel(ticket: Ticket) {
  const labels: Record<Ticket['status'], string> = {
    purchased: '待刮开',
    scratching: `刮奖中 ${ticket.revealedCells.length}/${ticket.cellCount}`,
    scratched: ticket.isWinner
      ? '已中奖待验票'
      : '未中奖待验票',
    queued: '等待验票',
    verifying: '验票中',
    completed: ticket.isWinner
      ? '已兑奖'
      : '验票完成',
  };

  return labels[ticket.status];
}

function canOpen(ticket: Ticket) {
  return [
    'purchased',
    'scratching',
    'scratched',
  ].includes(ticket.status);
}
</script>

<template>
  <section class="hero">
    <div>
      <p class="eyebrow">YOUR LUCKY MOMENT</p>

      <h1>
        今天的好运，<em>由你开启。</em>
      </h1>

      <p class="muted">
        亲手刮开每一个数字，全部揭晓后再提交验票，
        奖金将在验票完成后到账。
      </p>
    </div>

    <div class="hero-stats">
      <div>
        <small>待兑奖</small>
        <b>🪙 {{ game.pendingRewards.toLocaleString() }}</b>
      </div>

      <div>
        <small>累计中奖</small>
        <b>{{ game.state.statistics.totalWon }}</b>
      </div>

      <div>
        <small>已刮彩票</small>
        <b>{{ game.state.statistics.totalScratched }}</b>
      </div>
    </div>
  </section>

  <div class="game-grid">
    <section class="panel lottery-panel">
      <div class="section-heading">
        <div>
          <span class="eyebrow">01 / CHOOSE YOUR TICKET</span>
          <h2>选择你的幸运彩票</h2>
        </div>

        <span class="pill">免费 + 付费</span>
      </div>

      <div class="ticket-options">
        <article
          v-for="item in game.lotteries"
          :key="item.id"
          class="ticket-option"
          :class="{ 'free-ticket-option': item.isFree }"
        >
          <span class="ticket-mark">
            {{
              item.id === 'free'
                ? '🍀'
                : item.id === 'gold'
                  ? '🏆'
                  : item.id === 'diamond'
                    ? '💎'
                    : '🎰'
            }}
          </span>

          <span class="ticket-name">
            {{ item.name }}
          </span>

          <strong>
            {{
              item.isFree
                ? '免费'
                : `🪙 ${item.price.toLocaleString()}`
            }}
          </strong>

          <small>
            中奖率 {{ (item.baseWinRate * 100).toFixed(0) }}%
          </small>

          <small>
            基础奖金 {{ item.basePrize.toLocaleString() }}
          </small>

          <button
            v-if="item.isFree"
            class="primary-btn ticket-action"
            @click="startFree"
          >
            开始刮奖
          </button>

          <button
            v-else
            class="ghost-btn ticket-action"
            :disabled="game.state.coins < item.price"
            @click="buy(item.id)"
          >
            购买并刮奖
          </button>
        </article>
      </div>

      <div class="lottery-rule-note">
        <b>玩法规则</b>

        <span>
          刮开三个独立数字区域，三个数字相同即可中奖；
          777 为特殊大奖。中奖结果在创建彩票时生成并保存。
        </span>
      </div>

      <div class="scratch-section inventory-section">
        <div class="section-heading">
          <div>
            <span class="eyebrow">02 / YOUR TICKETS</span>
            <h2>我的彩票</h2>
          </div>

          <span class="pill">
            {{ game.state.tickets.length }} 张
          </span>
        </div>

        <div
          v-if="tickets.length"
          class="inventory-list"
        >
          <button
            v-for="ticket in tickets.slice(0, 12)"
            :key="ticket.id"
            class="inventory-ticket"
            :class="{ 'is-actionable': canOpen(ticket) }"
            :disabled="!canOpen(ticket)"
            @click="openTicket(ticket)"
          >
            <span class="inventory-icon">
              {{
                ticket.isFree
                  ? '🍀'
                  : ticket.gameId === 'gold'
                    ? '🏆'
                    : ticket.gameId === 'diamond'
                      ? '💎'
                      : '🎰'
              }}
            </span>

            <span class="inventory-ticket-info">
              <b>{{ ticket.name }}</b>

              <small>
                {{ new Date(ticket.createdAt).toLocaleString() }}
                ·
                {{ ticket.revealedCells.length }}/{{ ticket.cellCount }}
                已刮开
              </small>
            </span>

            <span
              class="inventory-ticket-status"
              :class="ticket.status"
            >
              {{ statusLabel(ticket) }}
            </span>

            <span
              v-if="canOpen(ticket)"
              class="inventory-arrow"
            >
              ›
            </span>
          </button>
        </div>

        <div
          v-else
          class="empty-ticket"
        >
          <span>🎟️</span>
          <strong>还没有彩票</strong>
          <small>
            点击上方「开始刮奖」，免费领取你的第一张幸运小票
          </small>
        </div>
      </div>
    </section>

    <aside class="side-column">
      <section class="panel machine-card">
        <div class="section-heading">
          <div>
            <span class="eyebrow">03 / VERIFY</span>
            <h2>验票机</h2>
          </div>

          <span class="status-dot">运行中</span>
        </div>

        <div class="machine-visual">
          <span class="machine-icon">🎰</span>

          <div>
            <b>
              {{
                game.state.machine.currentTask
                  ? '正在验票'
                  : '等待任务'
              }}
            </b>

            <small>
              {{
                game.state.machine.currentTask
                  ? '验票完成后自动结算'
                  : '完整刮开的彩票都可以提交验票'
              }}
            </small>
          </div>
        </div>

        <div class="machine-metrics">
          <div>
            <small>等待队列</small>
            <b>{{ game.state.machine.queue.length }} / 5</b>
          </div>

          <div>
            <small>待兑奖金额</small>
            <b>🪙 {{ game.pendingRewards.toLocaleString() }}</b>
          </div>
        </div>

        <RouterLink
          to="/machine"
          class="text-link"
        >
          查看验票队列 →
        </RouterLink>
      </section>

      <section class="panel talent-card">
        <span class="eyebrow">GROW YOUR LUCK</span>

        <h2>天赋成长</h2>

        <p class="muted">
          幸运提高中奖概率，财富提高最终奖金，
          效率缩短自动刮奖间隔。
        </p>

        <div class="talent-mini">
          <span>🍀 幸运等级</span>
          <b>Lv.{{ game.state.talents.luck }}</b>
        </div>

        <div class="talent-mini">
          <span>💰 财富等级</span>
          <b>Lv.{{ game.state.talents.wealth }}</b>
        </div>

        <div class="talent-mini">
          <span>⚡ 效率等级</span>
          <b>Lv.{{ game.state.talents.efficiency }}</b>
        </div>

        <RouterLink
          to="/talents"
          class="text-link"
        >
          查看天赋详情 →
        </RouterLink>
      </section>
    </aside>
  </div>

  <section class="recent panel">
    <div class="section-heading">
      <div>
        <span class="eyebrow">HISTORY</span>
        <h2>最近的彩票记录</h2>
      </div>

      <span class="muted">
        {{ game.state.tickets.length }} 张
      </span>
    </div>

    <div
      v-if="tickets.length"
      class="history-list"
    >
      <div
        v-for="ticket in tickets.slice(0, 5)"
        :key="ticket.id"
        class="history-row"
      >
        <span class="history-icon">
          {{ ticket.isFree ? '🍀' : '🎟️' }}
        </span>

        <div>
          <b>{{ ticket.name }}</b>
          <small>
            {{ new Date(ticket.createdAt).toLocaleString() }}
          </small>
        </div>

        <strong>
          {{
            ticket.status === 'completed'
              ? (
                  ticket.isWinner
                    ? `已兑奖 +${ticket.prize}`
                    : '验票完成'
                )
              : statusLabel(ticket)
          }}
        </strong>
      </div>
    </div>

    <p
      v-else
      class="muted"
    >
      还没有彩票记录。
    </p>
  </section>

  <ScratchModal
    v-if="modalTicket"
    :ticket="modalTicket"
    :auto-interval-ms="autoScratchInterval"
    @close="modalTicketId = null"
    @reveal="reveal"
    @submit="submitCurrentTicket"
  />
</template>

<style scoped>
.ticket-options {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ticket-option {
  align-items: flex-start;
  padding: 16px;
  gap: 7px;
}

.ticket-option .ticket-mark {
  font-size: 28px;
}

.ticket-option .ticket-name {
  font-size: 14px;
}

.ticket-option strong {
  font-size: 16px;
  color: #f5c86b;
}

.ticket-option small {
  font-size: 11px;
}

.ticket-action {
  width: 100%;
  margin-top: 7px;
  padding: 10px 8px;
  font-size: 11px;
}

.free-ticket-option {
  border-color: #b68b3d;
  background: linear-gradient(145deg, #443b2a, #1d3044);
}

.lottery-rule-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 17px;
  padding: 13px 15px;
  border: 1px solid #394c63;
  border-radius: 12px;
  background: #17283e;
  color: #94a7bf;
  font-size: 11px;
  line-height: 1.7;
}

.lottery-rule-note b {
  color: #f1c66c;
  font-size: 12px;
}

.inventory-section {
  margin-top: 24px;
}

.inventory-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inventory-ticket {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #30445c;
  border-radius: 12px;
  background: #172940;
  color: #e7edf6;
  text-align: left;
}

.inventory-ticket.is-actionable {
  cursor: pointer;
}

.inventory-ticket.is-actionable:hover {
  border-color: #d6a94e;
  background: #21344c;
}

.inventory-ticket:disabled {
  opacity: .8;
  cursor: default;
}

.inventory-icon {
  font-size: 22px;
}

.inventory-ticket-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.inventory-ticket-info b {
  font-size: 12px;
}

.inventory-ticket-info small {
  font-size: 10px;
  color: #8397af;
}

.inventory-ticket-status {
  font-size: 10px;
  color: #c3cfdd;
  white-space: nowrap;
}

.inventory-ticket-status.scratched {
  color: #f4cb72;
}

.inventory-ticket-status.completed {
  color: #7fd2a1;
}

.inventory-arrow {
  font-size: 20px;
  color: #e9bd61;
}

.empty-ticket {
  min-height: 160px;
}

.scratch-section {
  border-top: 1px solid #2b3c51;
  padding-top: 22px;
  margin-top: 8px;
}

@media (max-width: 560px) {
  .ticket-options {
    grid-template-columns: 1fr;
  }

  .inventory-ticket {
    gap: 7px;
    padding: 10px;
  }

  .inventory-ticket-status {
    font-size: 9px;
  }
}
</style>
