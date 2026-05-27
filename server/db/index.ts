/// <reference types="../../worker-configuration.d.ts" />
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type Env = {
  db: D1Database
  bucket: R2Bucket
  kv: KVNamespace
}

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export { schema }