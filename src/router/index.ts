import { createRouter, createWebHashHistory } from 'vue-router';
import GameView from '../views/GameView.vue';
import MachineView from '../views/MachineView.vue';
import TalentView from '../views/TalentView.vue';
export default createRouter({ history: createWebHashHistory(), routes: [
  { path: '/', component: GameView },
  { path: '/machine', component: MachineView },
  { path: '/talents', component: TalentView }
] });
