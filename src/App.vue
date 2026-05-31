<script setup lang="ts">
import { useRouter, RouterView } from 'vue-router'
import { useAuthStore } from '@/store/index.ts'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <el-container>
    <el-header style="display: flex; align-items: center; justify-content: space-between;">
      <el-menu mode="horizontal" router style="flex-grow: 1; border-bottom: none;">
        <el-menu-item index="/">主页</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
      </el-menu>
      <div v-if="authStore.user" style="display: flex; align-items: center; gap: 12px;">
        <el-avatar v-if="authStore.user?.avatar" :src="authStore.user.avatar" :size="32" />
        <span>{{ authStore.user?.nickname }}</span>
        <el-button type="danger" size="small" @click="handleLogout">退出</el-button>
      </div>
      <el-button v-else type="primary" size="small" @click="router.push('/login')">登录</el-button>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>
