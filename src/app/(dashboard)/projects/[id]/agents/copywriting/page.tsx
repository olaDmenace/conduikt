// Copywriting Agent — /projects/[id]/agents/copywriting
import { redirect } from "next/navigation";

export default function CopywritingAgentPage() {
  redirect("../content?skill=copywriting");
}
