<script setup lang="ts">
import { useRouter, RouterView } from 'vue-router'
import { useAuth } from '@/stores/auth'

const router = useRouter()
const { state, isLoggedIn, clearAuth } = useAuth()

const handleLogout = () => {
  clearAuth()
  router.push('/')
}
</script>

<template>
  <el-container>
    <el-header style="display: flex; align-items: center;">
      <el-menu mode="horizontal" router style="flex-grow: 1; border-bottom: none;">
        <el-menu-item index="/">主页</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
      </el-menu>
      <template v-if="isLoggedIn">
        <span style="margin-right: 12px; font-size: 14px; color: #606266;">
          {{ state.user?.nickname || state.user?.name }}
        </span>
        <el-button @click="handleLogout" size="small">退出登录</el-button>
      </template>
      <el-button v-else @click="router.push('/login')" type="primary" size="small">
        登录
      </el-button>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>
