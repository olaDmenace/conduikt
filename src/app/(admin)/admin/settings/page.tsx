import { getAdminUsers } from "@/src/lib/admin/queries";
import { AdminSettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admins = await getAdminUsers();
  return <AdminSettingsClient admins={admins} />;
}
