import { and, eq, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db } from "../db/db";
import { customers, redditAccounts } from "../db/schema";
import Task from "../tasks/Task";

const scheduleTasks = async () => {
  const accs = await db
    .select({
      id: redditAccounts.id,
    })
    .from(redditAccounts)
    .leftJoin(customers, eq(redditAccounts.customerId, customers.customerId))
    .where(
      and(
        or(
          lte(
            redditAccounts.lastCheckedAt,
            new Date(Date.now() - 1_000 * 60).toISOString(),
          ),
          isNull(redditAccounts.lastCheckedAt),
        ),
        eq(customers.isSubscribed, true),
        isNotNull(customers.pushToken),
      ),
    )
    .execute();
  for (const acc of accs) {
    Task.create("CheckForMessages", { redditAccountId: acc.id });
  }
};

export default async function checkForMessagesSchedule() {
  scheduleTasks();
  setInterval(
    () => {
      scheduleTasks();
    },
    1_000 * 60 * 2,
  ); // 2 minutes
}
