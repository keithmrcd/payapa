import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history works inside the Capacitor WebView without server rewrites.
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: 'Home', tab: true } },
    { path: '/payday', name: 'payday', component: () => import('@/views/PaydayView.vue'), meta: { title: 'Payday', tab: true } },
    { path: '/cards', name: 'cards', component: () => import('@/views/CardsView.vue'), meta: { title: 'Cards', tab: true } },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue'), meta: { title: 'History', tab: true } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: 'Settings', back: true } },
  ],
})
