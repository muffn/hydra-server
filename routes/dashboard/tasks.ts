import { db } from "../../db/db";
import { and, eq, isNotNull, isNull, sql, SQL } from "drizzle-orm";
import { tasks } from "../../db/schema";
import { corsHeaders } from "../../middleware/cors";
import { authenticateRequest } from "../../middleware/auth";
import type { BunRequest } from "bun";

// Helper function to parse query parameters
function getQueryParams(url: string): Record<string, string> {
  const params = new URLSearchParams(new URL(url).search);
  return Object.fromEntries(params.entries());
}

export async function getTasks(req: Request) {
  if (!(await authenticateRequest(req))) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
  const { page = "1", limit = "10", status } = getQueryParams(req.url);
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let conditions: SQL | undefined = undefined;

  // Build filter conditions
  if (status) {
    switch (status) {
      case "completed":
        conditions = isNotNull(tasks.completedAt);
        break;
      case "failed":
        conditions = isNotNull(tasks.failedAt);
        break;
      case "in_progress":
        conditions = and(
          isNotNull(tasks.startedAt),
          isNull(tasks.completedAt),
          isNull(tasks.failedAt),
        );
        break;
      case "pending":
        conditions = isNull(tasks.startedAt);
        break;
    }
  }

  // Execute queries with filters
  const allTasks = await db
    .select()
    .from(tasks)
    .where(conditions)
    .orderBy(tasks.id)
    .limit(parseInt(limit))
    .offset(offset);

  const total = await db.$count(tasks, conditions);

  return Response.json(
    {
      tasks: allTasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
    { headers: corsHeaders },
  );
}

export async function getTaskStats(req: Request) {
  if (!(await authenticateRequest(req))) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      completed: sql<number>`sum(case when ${tasks.completedAt} is not null then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${tasks.failedAt} is not null then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${tasks.startedAt} is null then 1 else 0 end)`,
      inProgress: sql<number>`sum(case when ${tasks.startedAt} is not null and ${tasks.completedAt} is null and ${tasks.failedAt} is null then 1 else 0 end)`,
    })
    .from(tasks);

  if (!row) throw new Error("getTaskStats failed");

  return Response.json(row, { headers: corsHeaders });
}

export async function getTaskById(req: BunRequest<"/api/tasks/:id">) {
  if (!(await authenticateRequest(req))) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return new Response("Invalid task ID", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const task = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task.length) {
    return new Response("Task not found", {
      status: 404,
      headers: corsHeaders,
    });
  }

  return Response.json(task[0], { headers: corsHeaders });
}
