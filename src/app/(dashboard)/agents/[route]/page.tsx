import { notFound } from "next/navigation";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";
import { AgentSandbox } from "./agent-sandbox";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  const agent = AGENT_REGISTRY.find(
    (a) => a.route === route && a.status === "active"
  );
  if (!agent) notFound();
  return <AgentSandbox agent={agent} />;
}
