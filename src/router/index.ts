import { createRouter, createWebHistory } from 'vue-router'
import { routes as autoRoutes } from 'vue-router/auto-routes'
import login from "@/router/login.vue";

const customRoutes = [
  {
    path: '/login',
    name: 'login',
    component: login,
    meta: { layout: 'blank' },
  },
]

const routes = [...customRoutes, ...autoRoutes]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
})

export default router
