import { redirect } from "next/navigation";
import { site } from "@/lib/site";

export default function MaintainersPage() {
  redirect(site.team + "#maintainers");
}
