import {Hono} from 'hono'
import {trpcServer} from '@hono/trpc-server'
import {verify} from 'hono/jwt'

import {appRouter} from './trpc/router'
import {yggdrasil} from './yggdrasil'
import {createDb} from './db'
import {api} from './api'
import type {Env} from './type'
import {getSecret} from "./utils/secret";
import {TRPCError} from "@trpc/server";

const app = new Hono<{ Bindings: Env }>({strict: false})

/**
 * 使用trpc实现web交互
 */
app.use(
    '/trpc/*',
    async (c, next) => {
        const db = createDb(c.env.db)

        let user: { id: number, name: string; role: string; onlyUpdate: boolean } | null = null
        const authHeader = c.req.header('Authorization')
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7)
            try {
                const secret = await getSecret(c.env.kv)
                const payload = await verify(token, secret, 'HS256')
                if (payload.type != 'web') return new TRPCError({code: 'FORBIDDEN', message: '你使用了不合规的token'})
                user = {
                    id: payload.id as number,
                    name: payload.user as string,
                    role: payload.role as string,
                    onlyUpdate: !!payload.onlyUpdate,
                }
            } catch {
                // token 无效或过期，user 保持 null
            }
        }

        const handler = trpcServer({
            router: appRouter,
            createContext: () => ({db, kv: c.env.kv, env: c.env, user, host: new URL(c.req.url).host}),
        })
        return handler(c, next)
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

app.route('/api', api)
app.route('/yggdrasil', yggdrasil)


export default app