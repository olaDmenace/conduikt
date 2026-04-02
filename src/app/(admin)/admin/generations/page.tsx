import { getAllGenerations } from "@/src/lib/admin/queries";
import { AdminGenerationsClient } from "./generations-client";

export const dynamic = "force-dynamic";

export default async function AdminGenerationsPage() {
  const generations = await getAllGenerations();
  return <AdminGenerationsClient generations={generations} />;
}
