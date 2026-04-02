import { getAllUsers } from "@/src/lib/admin/queries";
import { AdminUsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAllUsers();
  return <AdminUsersClient users={users} />;
}
