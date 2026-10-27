"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useUIStore } from "@/src/stores/ui-store";

// /projects/{id} used to be a second home screen (the agent grid). Home is
// /dashboard now (docs/DESIGN.md §App architecture). This page stays so old
// links keep working: it scopes the rail to the project and sends the user
// to their overview. A project that no longer exists gets a way out.
export default function ProjectRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const setCurrentProjectId = useUIStore((s) => s.setCurrentProjectId);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${id}`, { cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setCurrentProjectId(id);
          router.replace("/dashboard");
        } else {
          setMissing(true);
        }
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router, setCurrentProjectId]);

  if (missing) {
    return (
      <EmptyState
        title="We couldn't find that project. It may have been deleted."
        action={
          <Button asChild>
            <Link href="/dashboard">Go to your overview</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6" role="status" aria-label="Opening your overview">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
