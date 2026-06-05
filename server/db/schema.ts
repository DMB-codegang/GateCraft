import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  nickname: text('nickname').notNull(),
  password: text('password'),
  role: text('role', {
    // 账号权限：管理员 用户
    enum: ['admin', 'user']
  }).default('user').notNull(),
  status: text('status', {
    // 账号状态：正常 待验证 停用
    enum: ['active', 'pending', 'suspended'],
  }).default('active').notNull(),
  email: text('email'),
  qqUnionId: text('qq_union_id').unique(),
  githubOpenId: text('github_open_id').unique(),
  wechatOpenId: text('wechat_open_id').unique(),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})