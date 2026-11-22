<script setup lang="ts">
import { useGameStore } from './stores/game';
const game = useGameStore();
</script>
<template>
  <div class="app-shell">
    <header class="topbar"><RouterLink to="/" class="brand"><span class="brand-icon">✦</span><span>幸运刮刮乐</span></RouterLink><nav><RouterLink to="/">刮彩票</RouterLink><RouterLink to="/machine">验票机</RouterLink><RouterLink to="/talents">天赋</RouterLink></nav><div class="wallet"><span>金币</span><strong>🪙 {{ game.state.coins.toLocaleString() }}</strong></div></header>
    <main class="main"><div v-if="game.notice" class="notice" @click="game.notice = ''">{{ game.notice }} <span>×</span></div><RouterView /></main>
    <footer>LUCKY SCRATCH <span>·</span> 仅供娱乐的虚拟金币游戏</footer>
  </div>
</template>
