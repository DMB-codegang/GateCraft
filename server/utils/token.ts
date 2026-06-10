import {sign} from 'hono/jwt'

import {getSecret} from './secret'
import {authConfig, yggdrasilConfig} from '../../config'

interface webUser {
    id: number
    name: string
    role: string
}

interface mcUser{
    id: number
    name: string
    clientToken: string
    uuid: string
}

/**
 * 生成 JWT 令牌
 *
 * 从环境变量中获取或自动生成签名密钥，然后签发包含用户名和角色的 HS256 签名 JWT。
 * 令牌过期时间由 {@link authConfig.tokenExpirySeconds} 配置决定。
 *
 * @param user - 用户信息，包含 name 和 role 字段
 * @param kv - KV 存储绑定
 * @param onlyUpdate - 如果是
 * @returns 签发的 JWT 字符串
 */
export async function generateJwt(user: webUser|mcUser, kv: KVNamespace, onlyUpdate: boolean = false) {
    const secret = await getSecret(kv)
    const now = Date.now() / 1000
    const type = 'role' in user ? 'web' : 'mc'
    const expirySeconds = type === 'web'
        ? onlyUpdate
            ? 10 * 60
            : authConfig.tokenExpirySeconds
        : yggdrasilConfig.accessTokenExpirySeconds

    const payload = {
        id: user.id,
        type: type,
        ...(onlyUpdate ? { onlyUpdate } : {}),
        exp: now + expirySeconds,
        iat: now,
        ...('role' in user
                ? { user: user.name, role: user.role }
                : { clientToken: user.clientToken, uuid: user.uuid }
        )
    }
    return sign(payload, secret, 'HS256')
}