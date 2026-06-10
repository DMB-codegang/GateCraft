
export type Context = {
    db: ReturnType<typeof import('./db')['createDb']>
    kv: KVNamespace
    env: Env
    user: {
        id: number
        name: string
        role: string
        onlyUpdate: boolean
    } | null
    host: string
}


export type Env = {
  db: D1Database
  bucket: R2Bucket
  kv: KVNamespace
  QQ_APP_ID: string
  QQ_APP_KEY: string
}