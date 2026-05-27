import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nickname: text('nickname').notNull(),
  password: text('password').notNull(),
  email: text('email').notNull(),
  qq: text('qq').unique(),
  role: text('role').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})