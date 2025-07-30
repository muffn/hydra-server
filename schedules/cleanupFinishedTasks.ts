import { db } from "../db/db";
import { tasks } from "../db/schema";
import { isNotNull, or, inArray } from "drizzle-orm";

const MAX_FINISHED_TASKS = 100_000;
const BATCH_DELETION_SIZE = 10_000;

export default function cleanupFinishedTasks() {
  doCleanup();
  setInterval(doCleanup, 60 * 1000); // Run every minute
}

const doCleanup = async () => {
  // Count finished tasks (completed or failed)
  const finishedCount = await db.$count(
    tasks,
    or(isNotNull(tasks.completedAt), isNotNull(tasks.failedAt)),
  );
  console.log(`Found ${finishedCount} finished tasks, starting cleanup...`);
  if (finishedCount > MAX_FINISHED_TASKS) {
    const excessCount = finishedCount - MAX_FINISHED_TASKS;
    const batchesToDelete = Math.ceil(excessCount / BATCH_DELETION_SIZE);

    for (let i = 0; i < batchesToDelete; i++) {
      // Get the oldest BATCH_DELETION_SIZE tasks that need to be deleted
      const oldestTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(or(isNotNull(tasks.completedAt), isNotNull(tasks.failedAt)))
        .orderBy(tasks.createdAt)
        .limit(BATCH_DELETION_SIZE);

      if (oldestTasks.length > 0) {
        // Delete the batch of tasks
        await db.delete(tasks).where(
          inArray(
            tasks.id,
            oldestTasks.map((task) => task.id),
          ),
        );
        console.log(
          `Deleted batch ${i + 1}/${batchesToDelete} of finished tasks (${oldestTasks.length} tasks)`,
        );
      }
    }
  } else {
    console.log(`Found ${finishedCount} finished tasks, no cleanup needed`);
  }
  console.log(`Cleanup finished tasks completed`);
};
