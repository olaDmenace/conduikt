// Strategy Agent — /projects/[id]/agents/strategy
import { redirect } from "next/navigation";

export default function StrategyAgentPage() {
  redirect("../content?skill=content-strategy");
}
