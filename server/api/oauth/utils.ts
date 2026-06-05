import {sign} from 'hono/jwt'
import {eq} from 'drizzle-orm'

import {createDb, schema} from '../../db'
import {authConfig} from '../../utils/config'
import type {Env} from '../../type'
import {getSecret} from "../../utils/secret";

const {users} = schema

/**
 * 校验 OAuth 登录的 state 参数
 *
 * 从 KV 存储中读取并删除 `{provider}_state_{state}` 键，防止 CSRF 攻击。
 * 每个 state 只能使用一次，校验后即删除。
 *
 * @param kv - Cloudflare KV 命名空间实例
 * @param provider - 第三方平台标识，如 'qq'、'github'、'wechat'
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
    id: string,
    nickname: string,
    avatar: string
}) {
    const drizzle = createDb(db)
    switch (provider) {
        case 'qq':
            await drizzle
                .insert(users)
                .values({
                    name: userInfo.id,
                    nickname: userInfo.nickname,
                    qqUnionId: userInfo.id,
                    avatar: userInfo.avatar,
                })
                .returning()
            break
    }
}

/**
 * 生成 JWT 令牌
 *
 * 从环境变量中获取或自动生成签名密钥，然后签发包含用户名和角色的 HS256 签名 JWT。
 * 令牌过期时间由 {@link authConfig.tokenExpirySeconds} 配置决定。
 *
 * @param user - 用户信息，包含 name 和 role 字段
 * @param env - 运行环境，包含 KV 存储等绑定
 * @returns 签发的 JWT 字符串
 */
export async function generateJwt(user: { name: string; role: string }, env: Env) {
    const secret = await getSecret(env.kv)
    const payload = {
        user: user.name,
        role: user.role,
        exp: Math.floor(Date.now() / 1000 + authConfig.tokenExpirySeconds),
        iat: Math.floor(Date.now() / 1000),
    }
    return sign(payload, secret, 'HS256')
}

/**
 * 将 JWT 令牌以 302 重定向方式返回给前端
 *
 * 构造跳转 URL：`https://{host}/login?token={token}`，前端从 query 参数中提取令牌完成登录。
 *
 * @param host - 前端域名
 * @param token - JWT 令牌字符串
 * @returns 302 重定向的 Response 对象
 */
export function redirectWithToken(host: string, token: string) {
    return new Response(null, {
        status: 302,
        headers: {
            Location: `https://${host}/login?token=${token}`,
        },
    })
}

