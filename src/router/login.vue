<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { TencentQq } from '@icon-park/vue-next'
import { useAuthStore } from '@/store'
import {trpc} from "@/trpc.ts";
import {authConfig} from "../../config.ts";

const authStore = useAuthStore()
const router = useRouter()

const activeTab = ref('login')
const loginForm = ref({ name: '', password: '' })
const registerForm = ref({ name: '', password: '', confirmPassword: '', nickname: '', email: '' })
const loading = ref(false)

const handleLogin = async () => {
  if (!loginForm.value.name || !loginForm.value.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login({username: loginForm.value.name, password: loginForm.value.password})
    ElMessage.success('登录成功')
    await router.push('/')
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  const f = registerForm.value
  if (!f.name || !f.password || !f.nickname || !f.email) {
    ElMessage.warning('请填写所有字段')
    return
  }
  if (f.password !== f.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }
  if (f.password.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }
  loading.value = true
  try {
    await authStore.register({
      username: f.name,
      password: f.password,
      nickname: f.nickname,
      email: f.email,
    })
    ElMessage.success('注册成功')
    await router.push('/')
  } catch (e: any) {
    ElMessage.error(e.message || '注册失败')
  } finally {
    loading.value = false
  }
}

const handleQQLogin = async () => {
  try {
    const res = await trpc.auth.qq.getState.query()
    if (res) {
      const params = new URLSearchParams(res as Record<string, string>)
      window.location.href = `https://graph.qq.com/oauth2.0/authorize?${params.toString()}`
    }
  } catch {
    ElMessage.error('获取QQ登录链接失败')
  }
}


</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 style="margin: 0; text-align: center;">用户登录</h2>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" @keyup.enter="handleLogin">
            <el-form-item label="用户名">
              <el-input v-model="loginForm.name" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" :loading="loading" @click="handleLogin">
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="authConfig.register" label="注册" name="register">
          <el-form :model="registerForm" @keyup.enter="handleRegister">
            <el-form-item label="用户名">
              <el-input v-model="registerForm.name" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="registerForm.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="registerForm.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="registerForm.password" type="password" placeholder="至少6位" show-password />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="registerForm.confirmPassword" type="password" placeholder="再次输入密码" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" :loading="loading" @click="handleRegister">
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <el-divider>第三方登录</el-divider>

      <div v-if="authConfig.qqLogin" class="third-party-login">
        <el-button size="large" @click="handleQQLogin" :loading="loading">
        <tencent-qq theme="outline" size="24" fill="#333"/>
          QQ登录
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
}

.login-card {
  width: 420px;
  border-radius: 12px;
}

.third-party-login {
  display: flex;
  justify-content: center;
}
</style>