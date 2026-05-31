/// <reference types="../../worker-configuration.d.ts" />
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Env = {
  db: D1Database
  bucket: R2Bucket
  kv: KVNamespace
  QQ_APP_ID: string
  QQ_APP_KEY: string
  QQ_REDIRECT_URI: string
}

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export { schema }