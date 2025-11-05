import { createRouter, createWebHistory } from 'vue-router'

// Import views
const HomeView = () => import('../views/HomeView.vue')
const WorkspaceView = () => import('../views/WorkspaceView.vue')
const ChatView = () => import('../views/ChatView.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/workspace/:id',
    name: 'Workspace',
    component: WorkspaceView,
    props: true
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatView
  },
  {
    path: '/chat/:conversationId',
    name: 'ChatConversation',
    component: ChatView,
    props: true
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
