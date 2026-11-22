import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import GameView from './views/GameView.vue'
import FactoryView from './views/FactoryView.vue'
import GrowthView from './views/GrowthView.vue'
import { useGameStore } from './stores/game'
import './style.css'

const router = createRouter({
  history: createWebHistory(import.meta.env.PROD ? import.meta.env.BASE_URL : '/'),
  routes: [
    { path: '/', component: GameView },
    { path: '/factory', component: FactoryView },
    { path: '/growth', component: GrowthView },
    // Keep old URLs working for bookmarks and shared links.
    { path: '/machine', redirect: '/factory' },
    { path: '/automation', redirect: '/factory' },
    { path: '/talent', redirect: '/growth' },
    { path: '/achievements', redirect: '/growth' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

const app = createApp(App)
app.use(createPinia())
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
  const game = useGameStore()
  game.applyOffline()
  window.setInterval(() => game.tick(), 250)
  window.addEventListener('beforeunload', () => game.save())
})
