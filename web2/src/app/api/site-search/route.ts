import { searchPhyslib } from "@/lib/physlib-site-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await searchPhyslib(searchParams.get("q") ?? "", searchParams.get("scope") ?? "all");
  return Response.json(data);
}
