import { NextResponse } from "next/server";
import { getApiMap } from "@/lib/yaml";

// The sidebar mounts outside the /api-tracker page tree (it's rendered by
// ConditionalSidebar at the root layout, see the design-language skill), so
// it can't receive the page's server-fetched props and needs its own way to
// reach data/APIMap.json client-side. It only draws the tree, so it gets the
// maps without their text and Lean references.
export async function GET() {
  const apiMap = await getApiMap();
  return NextResponse.json({
    ...apiMap,
    directories: [],
    nodes: apiMap.nodes.map((n) => ({
      ...n,
      abstract: "",
      content: [],
      leanReferences: [],
      references: [],
    })),
  });
}
