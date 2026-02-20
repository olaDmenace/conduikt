// Email Agent — /projects/[id]/agents/email
import { redirect } from "next/navigation";

export default function EmailAgentPage() {
  redirect("../content?skill=email-sequence");
}
