import { NextResponse } from "next/server";
import { getReferences } from "@/lib/yaml";

// The sidebar mounts outside the /references page tree (it's rendered by
// ConditionalSidebar at the root layout), so it can't receive the page's
// server-fetched props and needs its own way to reach data/References.json
// client-side. Same pattern as /api/api-map.
export async function GET() {
  const references = await getReferences();
  return NextResponse.json(references);
}
