
import {eq} from 'drizzle-orm'

import {createDb, schema} from '../../db'

const {users} = schema

/**
 * 校验 OAuth 登录的 state 参数
 *
 * 从 KV 存储中读取并删除 `{provider}_state_{state}` 键，防止 CSRF 攻击。
 * 每个 state 只能使用一次，校验后即删除。
 *
 * @param kv - Cloudflare KV 命名空间实例
 * @param provider - 第三方平台标识，如 'qq'
 * @param state - 回调时传递的 state 参数
 * @returns 存储的主机名（host），校验失败返回 null
 */
export async function validateState(kv: KVNamespace, provider: string, state: string) {
    const key = `${provider}_state_${state}`
    const value = await kv.get(key)
    if (!value) return null
    await kv.delete(key)
    return value
}

/**
 * 根据第三方 ID 查找用户
 *
 * 查询数据库中是否已存在该 OpenID 对应的用户：
 * - 存在则直接返回现有用户
 *
 * @param db - D1 数据库实例
 * @param provider - 平台
 * @param id - 第三方平台返回的用户 ID
 * @returns 用户记录
 */
export async function findUserById(db: D1Database, provider: 'qq', id: string) {
    const drizzle = createDb(db)
    switch (provider) {
        case 'qq':
            const [existing] = await drizzle
                .select()
                .from(users)
                .where(eq(users.qqUnionId, id))
            return existing
        default:
            throw new Error(`Unsupported provider: ${provider}`)
    }
}

/**
 * 通过第三方登录注册账户
 *
 * @param db - D1 数据库实例
 * @param provider - 平台
 * @param userInfo - 用户信息，包含 nickname 和 avatar 字段
 */
export async function createUserById(db: D1Database, provider: 'qq', userInfo: {
    openid: string,
    nickname: string,
    avatar: string
}){
    const drizzle = createDb(db)
    switch (provider) {
        case 'qq':
                const [user] = await drizzle
                    .insert(users)
                    .values({
                        name: userInfo.openid,
                        nickname: userInfo.nickname,
                        qqUnionId: userInfo.openid,
                        uuid: crypto.randomUUID().replace(/-/g, ''),
                        avatar: userInfo.avatar,
                    })
                    .returning()
                    if (!user) throw new Error('Failed to create user')
                return user

        default: throw new Error('Unknown provider')
    }
}

/**
 * 将 JWT 令牌以 302 重定向方式返回给前端
 *
 * 构造跳转 URL：`https://{host}/login?token={token}`，前端从 query 参数中提取令牌完成登录。
 *
 * @param host - 前端域名
 * @param token - JWT 令牌字符串
 * @param register - 用户是否首次登录
 * @returns 302 重定向的 Response 对象
 */
export function redirectWithToken(host: string, token: string, register: boolean) {
    return new Response(null, {
        status: 302,
        headers: {
            Location: `https://${host}/callback?token=${token}${register?'&isRegistered=true':''}`,
        },
    })
}

