
<script setup lang="ts">
import { computed } from 'vue';
import { getTalentCost } from '../domain/talent';
import { useGameStore } from '../stores/game';
import type { TalentKey } from '../types/game';

const game = useGameStore();

const talents = computed(() => [
  {
    key: 'luck' as TalentKey,
    name: '幸运',
    icon: '🍀',
    desc: '提高新彩票生成时的中奖概率。',
    effect: `当前 +${game.state.talents.luck}%`,
    next: '+1% 中奖概率',
  },
  {
    key: 'wealth' as TalentKey,
    name: '财富',
    icon: '💰',
    desc: '提高新彩票生成时的中奖奖金。',
    effect: `当前 +${game.state.talents.wealth * 5}%`,
    next: '+5% 奖金倍率',
  },
  {
    key: 'efficiency' as TalentKey,
    name: '效率',
    icon: '⚡',
    desc: '缩短自动刮奖时逐个揭晓数字的间隔。',
    effect: `当前等级 Lv.${game.state.talents.efficiency}`,
    next: '自动刮奖间隔减少 5%',
  },
]);

function upgrade(key: TalentKey) {
  const result = game.upgrade(key);

  if (!result.ok) {
    game.notice = result.error;
  }
}
</script>

<template>
  <section class="page-heading">
    <span class="eyebrow">TALENT TREE</span>
    <h1>天赋 <em>成长路线</em></h1>
    <p class="muted">
      天赋效果在创建彩票时生成快照，
      不会改变已经生成的彩票开奖结果。
    </p>
  </section>

  <section class="panel talent-summary">
    <div>
      <span class="eyebrow">AVAILABLE POINTS</span>
      <h2>可用天赋点</h2>
    </div>

    <strong>✦ {{ game.state.player.talentPoints }}</strong>
  </section>

  <div class="talent-grid">
    <section
      v-for="talent in talents"
      :key="talent.key"
      class="panel talent-detail"
    >
      <div class="talent-icon">
        {{ talent.icon }}
      </div>

      <div class="talent-title">
        <h2>{{ talent.name }}系</h2>
        <span class="pill">
          Lv.{{ game.state.talents[talent.key] }}
        </span>
      </div>

      <p class="muted">
        {{ talent.desc }}
      </p>

      <div class="talent-effect">
        <small>当前效果</small>
        <b>{{ talent.effect }}</b>
      </div>

      <div class="talent-effect">
        <small>下一级效果</small>
        <b>{{ talent.next }}</b>
      </div>

      <div class="upgrade-cost">
        <span>升级消耗</span>

        <b>
          {{
            getTalentCost(
              talent.key,
              game.state.talents[talent.key],
            ) === null
              ? '待配置'
              : `🪙 ${getTalentCost(
                  talent.key,
                  game.state.talents[talent.key],
                )}`
          }}
        </b>
      </div>

      <button
        class="primary-btn full"
        :disabled="
          getTalentCost(
            talent.key,
            game.state.talents[talent.key],
          ) === null ||
          game.state.player.talentPoints < 1
        "
        @click="upgrade(talent.key)"
      >
        升级天赋
      </button>

      <small
        v-if="
          getTalentCost(
            talent.key,
            game.state.talents[talent.key],
          ) === null
        "
        class="hint"
      >
        该天赋升级价格尚未配置。
      </small>
    </section>
  </div>

  <section class="panel talent-notes">
    <h2>天赋生效规则</h2>

    <ul>
      <li>幸运系：每级中奖概率增加 1%，最高中奖概率为 80%。</li>
      <li>财富系：每级奖金倍率增加 5%。</li>
      <li>效率系：每级自动刮奖间隔减少 5%，最低保留基础间隔的 20%。</li>
      <li>天赋只影响之后创建的彩票；已经生成的数字、中奖结果和奖金不会变化。</li>
    </ul>
  </section>
</template>
