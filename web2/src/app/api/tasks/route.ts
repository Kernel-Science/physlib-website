import { parseTaskQuery, searchTasks, TaskQueryError } from "@/lib/task-discovery";

export async function GET(request: Request) {
  try {
    const query = parseTaskQuery(new URL(request.url).searchParams);
    return Response.json(await searchTasks(query));
  } catch (error) {
    if (error instanceof TaskQueryError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
