import { createRouter, createWebHistory } from 'vue-router'
import { routes as autoRoutes } from 'vue-router/auto-routes'
import login from "@/router/login.vue";
import qqBack from "@/router/callback.vue";
import { useAuthStore } from '@/store'

const customRoutes = [
  {
    path: '/login',
    name: 'login',
    component: login,
    meta: { layout: 'blank' },
  },
  {
    path: '/callback',
    name: 'callback',
    component: qqBack,
    meta: { layout: 'blank' },
  }
]

// 需要登录的路径
const protectedPaths = ['/me']

const routes = [...customRoutes, ...autoRoutes]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (protectedPaths.includes(to.path) && !authStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
