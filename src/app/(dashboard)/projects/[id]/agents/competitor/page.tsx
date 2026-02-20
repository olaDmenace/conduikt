// Competitor Agent — /projects/[id]/agents/competitor
import { redirect } from "next/navigation";

export default function CompetitorAgentPage() {
  redirect("../content?skill=competitor-analysis");
}
