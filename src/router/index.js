import { createRouter, createWebHistory } from 'vue-router'

// Import views
const HomeView = () => import('../views/HomeView.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/:uuid(.+)', // Match any non-empty string as UUID
    name: 'Analysis',
    component: HomeView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
