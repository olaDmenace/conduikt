// CRO Agent — /projects/[id]/agents/cro
// Redirects to the content studio pre-filtered for Page CRO
import { redirect } from "next/navigation";

export default function CROAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Use React.use() workaround: Next.js 15 allows direct async params access in server components
  void params; // params is a Promise in Next.js 15
  redirect("../content?skill=page-cro");
}
