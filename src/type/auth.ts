// types/auth.ts
export interface User {
    id: number
    username: string
    nickname: string
    email: string | null
    role: 'admin' | 'user' | 'guest'
    avatar?: string | null
}

export interface LoginCredentials {
    username: string
    password: string
}

export interface RegisterCredentials {
    username: string
    nickname: string
    password: string
    email: string
}