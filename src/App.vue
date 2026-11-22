<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from './stores/game'

const route = useRoute()
const router = useRouter()
const store = useGameStore()
const profileOpen = ref(false)
const nav = [
  { path: '/', label: '彩票大厅', short: '大厅', icon: '🎟️' },
  { path: '/factory', label: '经营工厂', short: '经营', icon: '🏭' },
  { path: '/growth', label: '成长中心', short: '成长', icon: '🌟' },
]
const active = computed(() => route.path)

// 每次切换主导航页面后回到顶部，避免沿用上一页的滚动位置。
watch(() => route.fullPath, async () => {
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'auto' })
}, { flush: 'post' })
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand" @click="router.push('/')">
        <span class="brand-mark">🍀</span>
        <div><b>LUCKY SCRATCH</b><small>幸运刮刮乐 · 放置经营</small></div>
      </div>
      <div class="topbar-right">
        <div class="top-resources">
          <div><small>可用金币</small><b>🪙 {{ store.game.coins.toLocaleString() }}</b></div>
          <div><small>待兑奖</small><b>🎟️ {{ store.pendingRewards.toLocaleString() }}</b></div>
          <div><small>天赋点</small><b>✨ {{ store.game.player.talentPoints }}</b></div>
        </div>
        <button class="avatar-button" aria-label="玩家中心" @click="profileOpen = true">👤</button>
      </div>
    </header>

    <nav class="main-nav" aria-label="主导航">
      <button v-for="item in nav" :key="item.path" :class="{ active: active === item.path }" @click="router.push(item.path)">
        <span>{{ item.icon }}</span>{{ item.label }}
      </button>
    </nav>

    <main><RouterView /></main>

    <nav class="bottom-nav" aria-label="底部导航">
      <button v-for="item in nav" :key="item.path" :class="{ active: active === item.path }" @click="router.push(item.path)">
        <span>{{ item.icon }}</span><small>{{ item.short }}</small>
      </button>
    </nav>

    <div v-if="profileOpen" class="profile-backdrop" @click.self="profileOpen = false">
      <section class="panel profile-panel">
        <button class="profile-close" aria-label="关闭" @click="profileOpen = false">×</button>
        <div class="profile-avatar">👤</div>
        <span class="eyebrow">PLAYER PROFILE</span>
        <h2>我的玩家档案</h2>
        <p class="profile-subtitle">经营你的刮刮乐事业，逐步解锁更多能力</p>
        <div class="profile-stats">
          <div><small>可用金币</small><b>🪙 {{ store.game.coins.toLocaleString() }}</b></div>
          <div><small>待兑奖</small><b>🎟️ {{ store.pendingRewards.toLocaleString() }}</b></div>
          <div><small>天赋点</small><b>✨ {{ store.game.player.talentPoints }}</b></div>
        </div>
        <button class="btn secondary full" @click="router.push('/growth'); profileOpen = false">查看成长与成就</button>
        <button class="profile-reset" @click="store.resetSave(); profileOpen = false">重置游戏存档</button>
      </section>
    </div>

    <div v-if="store.offlineSummary" class="modal-backdrop">
      <section class="panel offline-dialog">
        <span class="eyebrow">WELCOME BACK</span><h2>离线经营报告</h2>
        <p>离线时长：{{ Math.floor(store.offlineSummary.seconds / 60) }} 分钟</p>
        <div class="offline-result">
          <div><small>自动化处理周期</small><b>{{ store.offlineSummary.processed }}</b></div>
          <div><small>离线获得金币</small><b>+{{ store.offlineSummary.earned.toLocaleString() }}</b></div>
        </div>
        <button class="btn primary full" @click="store.dismissOfflineSummary()">收下成果</button>
      </section>
    </div>
    <div v-if="store.notice" class="toast" @click="store.setNotice('')">{{ store.notice }} <span>×</span></div>
    <footer>LUCKY SCRATCH <span>虚拟金币 · 单机体验 · 好运由你创造</span></footer>
  </div>
</template>
