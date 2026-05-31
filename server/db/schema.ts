import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nickname: text('nickname').notNull(),
  password: text('password'),
  role: text('role', { 
    enum: ['admin', 'user', 'guest'] 
  }).default('user').notNull(),
  email: text('email'),
  qqOpenId: text('qq_open_id').unique(),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})