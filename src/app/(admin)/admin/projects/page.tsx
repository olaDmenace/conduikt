import { getAllProjects } from "@/src/lib/admin/queries";
import { AdminProjectsClient } from "./projects-client";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await getAllProjects();
  return <AdminProjectsClient projects={projects} />;
}
