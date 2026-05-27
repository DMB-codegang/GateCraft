import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/router'
import { createDb } from './db'
import type { Env } from './db'

const app = new Hono<{ Bindings: Env }>()
/**
 * 使用trpc实现web交互
 */
app.use(
  '/trpc/*',
  async (c, next) => {
    const db = createDb(c.env.db)
    return trpcServer({
      router: appRouter,
      createContext: () => ({ db, kv: c.env.kv }),
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
    return c.json({ error: 'Invalid path' }, 400)
  }
  let key = url.slice(startIndex + prefix.length)
  const qIndex = key.indexOf('?')
  if (qIndex !== -1) key = key.slice(0, qIndex)
  try {
    key = decodeURIComponent(key)
  } catch {
    return c.json({ error: 'Invalid path encoding' }, 400)
  }

  const object = await c.env.bucket.get(key)

  if (!object) {
    return c.json({ error: 'Not found' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
})

export default app