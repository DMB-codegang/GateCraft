import {Hono} from 'hono'
import {trpcServer} from '@hono/trpc-server'
import {verify} from 'hono/jwt'

import {appRouter} from './trpc/router'
import {createDb} from './db'
import {users} from './db/schema'
import {authConfig} from './utils/config'
import {eq} from 'drizzle-orm'
import {sign} from 'hono/jwt'
import type {Env} from './db'

const app = new Hono<{ Bindings: Env }>()
/**
 * 使用trpc实现web交互
 */
app.use(
    '/trpc/*',
    async (c, next) => {
        const db = createDb(c.env.db)

        let user: { name: string; role: string } | null = null
        const authHeader = c.req.header('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7)
            try {
                const secret = await c.env.kv.get('secret')
                if (secret) {
                    const payload = await verify(token, secret, 'HS256')
                    user = {name: payload.user as string, role: payload.role as string}
                }
            } catch {
                // token 无效或过期，user 保持 null
            }
        }

        return trpcServer({
            router: appRouter,
            createContext: () => ({db, kv: c.env.kv, user}),
        })(c, next)
    }
)

/**
 * 映射R2对象存储
 */
app.get('/files/:path{.*}', async (c) => {
    const url = c.req.url
    const prefix = '/files/'
    const startIndex = url.indexOf(prefix)
    if (startIndex === -1) {
        return c.json({error: 'Invalid path'}, 400)
    }
    let key = url.slice(startIndex + prefix.length)
    const qIndex = key.indexOf('?')
    if (qIndex !== -1) key = key.slice(0, qIndex)
    try {
        key = decodeURIComponent(key)
    } catch {
        return c.json({error: 'Invalid path encoding'}, 400)
    }

    const object = await c.env.bucket.get(key)

    if (!object) {
        return c.json({error: 'Not found'}, 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    return new Response(object.body, {headers})
})

app.get('/api/auth/qq/url', async (c) => {
    const {QQ_APP_ID, QQ_REDIRECT_URI} = c.env
    if (!QQ_APP_ID || !QQ_REDIRECT_URI) {
        return c.json({error: 'QQ登录未配置'}, 500)
    }
    const state = crypto.randomUUID()
    await c.env.kv.put(`qq_state:${state}`, '1', {expirationTtl: 300})
    const url = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${QQ_APP_ID}&redirect_uri=${encodeURIComponent(QQ_REDIRECT_URI)}&state=${state}`
    return c.json({url})
})

app.get('/api/auth/qq/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const frontendBase = new URL(c.req.url).origin

    if (!code) {
        return c.redirect(`${frontendBase}/login?error=no_code`)
    }

    if (state) {
        const storedState = await c.env.kv.get(`qq_state:${state}`)
        if (!storedState) {
            return c.redirect(`${frontendBase}/login?error=invalid_state`)
        }
        await c.env.kv.delete(`qq_state:${state}`)
    }

    const {QQ_APP_ID, QQ_APP_KEY, QQ_REDIRECT_URI} = c.env
    if (!QQ_APP_ID || !QQ_APP_KEY || !QQ_REDIRECT_URI) {
        return c.redirect(`${frontendBase}/login?error=not_configured`)
    }

    const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${QQ_APP_ID}&client_secret=${QQ_APP_KEY}&code=${code}&redirect_uri=${encodeURIComponent(QQ_REDIRECT_URI)}`
    const tokenRes = await fetch(tokenUrl)
    const tokenText = await tokenRes.text()
    const cleanedTokenText = tokenText.replace(/^callback\s*\(/, '').replace(/\)\s*;?\s*$/, '')
    const tokenParams = new URLSearchParams(cleanedTokenText)
    const accessToken = tokenParams.get('access_token')

    if (!accessToken) {
        return c.redirect(`${frontendBase}/login?error=token_failed`)
    }

    const openidUrl = `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}`
    const openidRes = await fetch(openidUrl)
    const openidText = await openidRes.text()
    const openidMatch = openidText.match(/"openid"\s*:\s*"([^"]+)"/)
    const openid = openidMatch?.[1]

    if (!openid) {
        return c.redirect(`${frontendBase}/login?error=openid_failed`)
    }

    const userInfoUrl = `https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${QQ_APP_ID}&openid=${openid}`
    const userInfoRes = await fetch(userInfoUrl)
    const qqUser = await userInfoRes.json() as {
        nickname?: string;
        figureurl_qq_2?: string;
        figureurl_qq_1?: string;
        figureurl?: string
    }

    const db = createDb(c.env.db)
    let [user] = await db.select().from(users).where(eq(users.qqOpenId, openid))

    if (!user) {
        const randomName = `qq_${openid.slice(0, 8)}`
        const [newUser] = await db.insert(users).values({
            password: null,
            name: randomName,
            nickname: qqUser.nickname || randomName,
            email: `${randomName}@qq.placeholder`,
            qqOpenId: openid,
            avatar: qqUser.figureurl_qq_2 || qqUser.figureurl_qq_1 || qqUser.figureurl || null,
        }).returning()
        user = newUser
    }

    let secret = await c.env.kv.get('secret')
    if (!secret) {
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        secret = btoa(String.fromCharCode(...bytes))
        await c.env.kv.put('secret', secret)
    }
    const payload = {
        user: user!.name,
        role: user!.role,
        exp: Math.floor(Date.now() / 1000 + authConfig.tokenExpirySeconds),
        iat: Math.floor(Date.now() / 1000),
    }
    const jwt = await sign(payload, secret)

    return c.redirect(`${frontendBase}/login?token=${jwt}`)
})

export default app