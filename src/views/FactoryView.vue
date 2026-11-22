<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import MachineView from './MachineView.vue'
import AutomationView from './AutomationView.vue'

const route = useRoute()
const activeTab = ref<'machine' | 'automation'>('machine')
onMounted(() => {
  if (route.query.tab === 'automation') activeTab.value = 'automation'
})
watch(activeTab, () => {
  window.scrollTo({ top: 0, behavior: 'auto' })
})
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div><span class="eyebrow">OPERATIONS CENTER</span><h1>经营工厂</h1><p>管理验票产线，配置自动化流程，让彩票事业持续运转</p></div>
      <div class="factory-emblem">🏭</div>
    </div>
    <div class="sub-nav">
      <button :class="{ active: activeTab === 'machine' }" @click="activeTab = 'machine'">⚙️ 验票设备</button>
      <button :class="{ active: activeTab === 'automation' }" @click="activeTab = 'automation'">🤖 自动化</button>
    </div>
    <MachineView v-if="activeTab === 'machine'" />
    <AutomationView v-else />
  </div>
</template>
