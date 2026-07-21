import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  nickname: text('nickname').notNull(),
  password: text('password'),

  // ======账号信息=======
  role: text('role', {
    // 账号权限：管理员 用户
    enum: ['admin', 'user']
  }).default('user').notNull(),
  status: text('status', {
    // 账号状态：正常 待验证 停用
    enum: ['active', 'pending', 'suspended'],
  }).default('active').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),

  // ======Yggdrasil部分=====
  uuid: text('uuid').notNull().unique(),

  // ========三方登录部分======
  email: text('email'),
  qqUnionId: text('qq_union_id').unique(),
  // 以下内容并无实装
  // githubOpenId: text('github_open_id').unique(),
  // wechatOpenId: text('wechat_open_id').unique(),

  avatar: text('avatar'),
})

export const airTrafficWaypoint = sqliteTable('air_traffic_waypoint', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  identifier: text('identifier').notNull().unique(), // 航路点标识符（如 "BIGGO", "SALAD"），必须唯一
  name: text('name'), // 航路点全称
  x: integer('x').notNull(), // 航路点x坐标值
  z: integer('z').notNull(), // 航路点z坐标值

  // 航路点类型
  type: text('type',{
    enum: [
      'enroute', //航路点 用于高空/低空航路巡航阶段
      'sid', //标准仪表离场点
      'star', //标准仪表入场点
    ]
  }).notNull(),

  // 航路点限制（JSON 格式）
  restrictions: text('restrictions', { mode: 'json' })
  .$type<{
    // 高度限制（英尺）
    altitude?: {
      min?: number;   // 最低高度
      max?: number;   // 最高高度
      recommend?: number; // 推荐高度
    };
    // 速度限制（节）
    speed?: {
      min?: number;   // 最低速度
      max?: number;   // 最大速度
      // 可选的附加说明
      note?: string;  // 如 "AT/BELOW 250KT"
    };
  } | null>()
  .default(sql`NULL`),

    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
})