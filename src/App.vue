<script lang="ts" setup>
import { useRouter, useRoute, RouterView } from 'vue-router'
import { useAuthStore } from '@/store/index.ts'
import { onMounted } from "vue";

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}

onMounted(() => {
  authStore.initFromStorage()
})
</script>
<template>
  <RouterView v-if="route.meta.layout == 'blank'"/>
  <template v-else>
  <el-container>
    <el-header style="display: flex; align-items: center; justify-content: space-between;">
      <el-menu mode="horizontal" router style="flex-grow: 1; border-bottom: none;">
        <el-menu-item index="/">主页</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
      </el-menu>
      <div v-if="authStore.user" style="display: flex; align-items: center; gap: 12px;">
        <el-avatar v-if="authStore.user?.avatar" :size="32" :src="authStore.user.avatar" />
        <span>欢迎您，{{ authStore.user?.nickname }}</span>
        <el-button size="small" type="danger" @click="handleLogout">退出</el-button>
      </div>
      <el-button v-else size="small" type="primary" @click="router.push('/login')">登录</el-button>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
  </template>
</template>