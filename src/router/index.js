import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history works inside the Capacitor WebView without server rewrites.
export default createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { tab: true } },
    { path: '/payday', name: 'payday', component: () => import('@/views/PaydayView.vue'), meta: { tab: true } },
    { path: '/cards', name: 'cards', component: () => import('@/views/CardsView.vue'), meta: { tab: true } },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue'), meta: { tab: true } },
    { path: '/cards/:id', name: 'card', component: () => import('@/views/CardDetailView.vue'), meta: { back: true, title: '' } },
    { path: '/items/:id', name: 'item', component: () => import('@/views/ItemDetailView.vue'), meta: { back: true, title: '' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { back: true, title: 'Settings' } },
    { path: '/settings/accounts', name: 'accounts', component: () => import('@/views/AccountsView.vue'), meta: { back: true, title: 'Accounts' } },
    { path: '/settings/paydays', name: 'paydays', component: () => import('@/views/PaydaysView.vue'), meta: { back: true, title: 'Paydays' } },
    { path: '/settings/reminders', name: 'reminders', component: () => import('@/views/RemindersView.vue'), meta: { back: true, title: 'Reminders' } },
  ],
})
