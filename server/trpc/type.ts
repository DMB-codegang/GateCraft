export type Context = {
    db: ReturnType<typeof import('../db')['createDb']>
    kv: KVNamespace
    user: {
        name: string,
        role: string
    } | null
}