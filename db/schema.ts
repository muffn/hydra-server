import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/sqlite-core";
import type { TaskType } from "../tasks/TaskMap";

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id").notNull().unique(),
    isSubscribed: integer("is_subscribed", { mode: "boolean" }),
    pushToken: text("push_token"),
    createdAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("customer_customer_id_idx").on(table.customerId),
    index("customer_created_at_idx").on(table.createdAt),
    index("customer_updated_at_idx").on(table.updatedAt),
  ],
);

export const redditAccounts = sqliteTable(
  "reddit_accounts",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    username: text("username").notNull(),
    session: text("session").notNull(),
    lastMessageId: text("last_message_id"),
    lastCheckedAt: text("last_checked_at"),
    createdAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("reddit_account_customer_id_idx").on(table.customerId),
    index("reddit_account_username_idx").on(table.username),
    uniqueIndex("reddit_account_customer_username_idx").on(
      table.customerId,
      table.username,
    ),
    index("reddit_account_created_at_idx").on(table.createdAt),
    index("reddit_account_updated_at_idx").on(table.updatedAt),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey(),
    type: text().notNull().$type<TaskType>(),
    data: text({ mode: "json" }),
    error: text(),
    startedAt: text(),
    failedAt: text(),
    completedAt: text(),
    createdAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("task_created_at_idx").on(table.createdAt),
    index("task_updated_at_idx").on(table.updatedAt),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;

export const aiRequests = sqliteTable(
  "ai_requests",
  {
    id: integer("id").primaryKey(),
    customerId: text("customer_id").notNull(),
    month: text("month").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalSpent: real("total_spent").notNull().default(0),
    createdAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text()
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("ai_requests_customer_id_idx").on(table.customerId),
    index("ai_requests_month_idx").on(table.month),
    uniqueIndex("ai_requests_customer_month_idx").on(
      table.customerId,
      table.month,
    ),
    index("ai_requests_created_at_idx").on(table.createdAt),
    index("ai_requests_updated_at_idx").on(table.updatedAt),
  ],
);
