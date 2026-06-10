<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/store'
import {sleep} from "@trpc/server/unstable-core-do-not-import";

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const loading = ref(false)

onMounted(async () => {
  const token = route.query.token as string
  const error = route.query.error as string

  if (error) {
    const errorMessages: Record<string, string> = {
      no_code: 'QQ授权失败：未获取到授权码',
      token_failed: 'QQ授权失败：获取access_token失败',
      openid_failed: 'QQ授权失败：获取openid失败',
    }
    ElMessage.error(errorMessages[error] || 'QQ登录失败')
    return
  }

  if (token) {
    loading.value = true
    try {
      await authStore.dispatch(token)
      ElMessage.success('QQ登录成功')
      await router.push('/')
    } catch {
      ElMessage.error('QQ登录失败，请重试')
    } finally {
      loading.value = false
    }
  } else {
    ElMessage.error(`缺少参数`)
    await sleep(2000)
    await router.push('/login')
  }
})
</script>