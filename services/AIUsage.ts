import { db } from "../db/db";
import { aiRequests } from "../db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

const INPUT_TOKEN_COST = 0.05 / 1_000_000;
const OUTPUT_TOKEN_COST = 0.08 / 1_000_000;
const MONTHLY_COST_LIMIT = 2.0;

export class AIUsage {
  static async trackUsage(customerId: string, usage: Usage) {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    await db
      .insert(aiRequests)
      .values({
        customerId,
        month: currentMonth,
        requestCount: 1,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
      })
      .onConflictDoUpdate({
        target: [aiRequests.customerId, aiRequests.month],
        set: {
          requestCount: sql`${aiRequests.requestCount} + 1`,
          inputTokens: sql`${aiRequests.inputTokens} + ${usage.promptTokens}`,
          outputTokens: sql`${aiRequests.outputTokens} + ${usage.completionTokens}`,
        },
      });
  }

  static isOverLimit(customerId: string): boolean {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const usage = db
      .select({
        inputTokens: aiRequests.inputTokens,
        outputTokens: aiRequests.outputTokens,
      })
      .from(aiRequests)
      .where(
        and(
          eq(aiRequests.customerId, customerId),
          eq(aiRequests.month, currentMonth),
        ),
      )
      .get();

    if (!usage) {
      return false;
    }

    const totalCost =
      usage.inputTokens * INPUT_TOKEN_COST +
      usage.outputTokens * OUTPUT_TOKEN_COST;
    return totalCost >= MONTHLY_COST_LIMIT;
  }
}
