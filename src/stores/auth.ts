// src/stores/auth.ts
import { reactive, computed, watch } from 'vue'

export interface User {
    id: number
    name: string
    nickname: string
    email: string | null
    qq: string | null
}

interface AuthState {
    token: string | null
    user: User | null
}

const STORAGE_KEY = 'auth_state'

function loadState(): AuthState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            return JSON.parse(saved)
        }
    } catch {
        // 忽略解析错误
    }
    return { token: null, user: null }
}

const state = reactive<AuthState>(loadState())

// 状态变化时自动持久化到 localStorage
watch(
    () => [state.token, state.user] as const,
    () => {
        if (state.token && state.user) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user: state.user }))
        } else {
            localStorage.removeItem(STORAGE_KEY)
        }
    }
)

export function useAuth() {
    const isLoggedIn = computed(() => !!state.token)

    const setAuth = (token: string, user: User) => {
        state.token = token
        state.user = user
    }

    const clearAuth = () => {
        state.token = null
        state.user = null
    }

    return {
        state,
        isLoggedIn,
        setAuth,
        clearAuth,
    }
}