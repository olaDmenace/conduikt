// Social Agent — /projects/[id]/agents/social
import { redirect } from "next/navigation";

export default function SocialAgentPage() {
  redirect("../content?skill=social-content");
}
