import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { AdminShell } from "@/src/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → login
  if (!user) {
    redirect("/login");
  }

  // Not admin → dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
