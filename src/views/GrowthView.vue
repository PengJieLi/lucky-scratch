<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import TalentView from './TalentView.vue'
import AchievementView from './AchievementView.vue'

const route = useRoute()
const activeTab = ref<'talent' | 'achievements'>('talent')
onMounted(() => {
  if (route.query.tab === 'achievements') activeTab.value = 'achievements'
})
watch(activeTab, () => {
  window.scrollTo({ top: 0, behavior: 'auto' })
})
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><span class="eyebrow">PLAYER DEVELOPMENT</span><h1>成长中心</h1><p>提升经营天赋，完成挑战，记录每一次成长</p></div>
      <div class="factory-emblem">🌟</div>
    </div>
    <div class="sub-nav">
      <button :class="{ active: activeTab === 'talent' }" @click="activeTab = 'talent'">✨ 天赋研究</button>
      <button :class="{ active: activeTab === 'achievements' }" @click="activeTab = 'achievements'">🏆 成就统计</button>
    </div>
    <TalentView v-if="activeTab === 'talent'" />
    <AchievementView v-else />
  </div>
</template>
