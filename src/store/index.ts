/**
 * 认证状态管理 Store
 * 管理用户登录态、Token 持久化、权限校验等核心认证逻辑
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {User, LoginCredentials, RegisterCredentials} from '@/type/auth.ts'
import { trpc } from '@/trpc'

export const useAuthStore = defineStore('auth', () => {

  // ─── State ───────────────────────────────────────
  /** 当前登录用户信息 */
  const user = ref<User | null>(null)
  /** JWT 访问令牌 */
  const token = ref<string | null>(null)
  /** 是否正在执行异步操作 */
  const loading = ref(false)
  /** 最近一次操作的错误信息 */
  const error = ref<string | null>(null)
  // ─── Getters ─────────────────────────────────────
  /** 是否已登录：同时校验 token 和 user 是否存在 */
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  /** 获取当前用户对象 */
  const currentUser = computed(() => user.value)
  /** 获取当前用户角色，未登录时返回 'guest' */
  const userRole = computed(() => user.value?.role ?? 'guest')
  /**
   * 权限校验函数
   * @param role - 所需的最低角色
   * @returns 当前用户是否拥有指定角色及以上的权限
   */
  const hasPermission = computed(() => (role: User['role']) => {
    const hierarchy = { admin: 3, user: 2, guest: 1 }
    return hierarchy[userRole.value] >= hierarchy[role]
  })

  // ─── Actions ──────────────────────────────────────

  /**
   * 用户登录
   * @param credentials - 登录凭证（用户名/密码）
   * @throws 登录失败时抛出错误，同时更新 error 状态
   */
  async function login(credentials: LoginCredentials) {
    loading.value = true
    error.value = null
    try {
      const res = await trpc.auth.login.mutate(credentials)
      user.value = res.user
      token.value = res.token
      localStorage.setItem('token', res.token)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 用户登出
   * 清除所有本地状态
   */
  async function logout() {
      user.value = null
      token.value = null
      localStorage.removeItem('token')
  }

  /**
   * 获取当前用户信息
   * 使用已保存的 token 向服务端请求最新的用户资料
   * 若 token 已失效则自动执行登出
   */
  async function fetchProfile() {
    if (!token.value) return
    loading.value = true
    try {
      user.value = (await trpc.auth.getProfile.mutate()).user
    } catch {
      await logout()
    } finally {
      loading.value = false
    }
  }

  async function register(registerCredentials: RegisterCredentials) {
    loading.value = true
    error.value = null
    try {
      const res = await trpc.auth.register.mutate(registerCredentials)
      user.value = res.user
      token.value = res.token
      localStorage.setItem('token', res.token)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function dispatch(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
    await fetchProfile()
  }

  /**
   * 从 localStorage 恢复登录态
   * 应用启动时调用，尝试用持久化的 token 恢复用户会话
   */
  async function initFromStorage() {
    const savedToken = localStorage.getItem('token')
    if (!savedToken) return
    token.value = savedToken
    await fetchProfile()
  }


  return {
    // state
    user, token, loading, error,
    // getters
    isLoggedIn, currentUser, userRole, hasPermission,
    // actions
    login, logout, register, initFromStorage, dispatch
  }
})