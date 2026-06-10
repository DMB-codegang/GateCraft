<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/store'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const completeProfileForm = ref({ name: '', password: '', confirmPassword: ''})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

onMounted(async () => {
  const token = route.query.token as string
  const isRegistered = route.query.isRegistered as string
  const error = route.query.error as string

  if (error) {
    const errorMessages: Record<string, string> = {
      no_code: '授权失败：未获取到授权码',
      token_failed: '授权失败：获取access_token失败',
      openid_failed: '授权失败：获取openid失败',
    }
    ElMessage.error(errorMessages[error] || '登录失败')
    return
  }

  if (token) {
    if (!isRegistered) {
      try {
        await authStore.dispatch(token)
        ElMessage.success('登录成功')
        await sleep(1000)
        await router.push('/')
      } catch {
        ElMessage.error('登录失败，请重试')
      }
    } else {
      await authStore.dispatch(token, true)
    }
  } else {
    ElMessage.error(`缺少参数`)
    // await sleep(2000)
    // await router.push('/login')
  }
})

const handleCompleteProfile = async () => {
  const f = completeProfileForm.value
  if (!f.name || !f.password || !f.confirmPassword) {
    ElMessage.warning('请填写所有选项')
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
    await authStore.updateProfile(f)
    ElMessage.success('提交成功')
    await router.push('/')
  } catch (e: any) {
    ElMessage.error(e.message || '提交失败')
  } finally {
    loading.value = false
  }
}


</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 style="margin: 0; text-align: center;">请完善信息</h2>
      </template>

        <el-form :model="completeProfileForm" @keyup.enter="handleCompleteProfile">
          <el-form-item label="用户名">
            <el-input v-model="completeProfileForm.name" placeholder="此用户名将作为您登录mc的账户" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="completeProfileForm.password" type="password" placeholder="请输入密码" show-password />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input v-model="completeProfileForm.confirmPassword" type="password" placeholder="再次输入密码" show-password />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" style="width: 100%" :loading="loading" @click="handleCompleteProfile">
              提交
            </el-button>
          </el-form-item>
        </el-form>

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