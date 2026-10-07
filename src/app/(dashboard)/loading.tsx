import { PageSkeleton } from "@/src/components/ui/skeleton";

// docs/DESIGN.md §States · Loading: a skeleton in the shape of the final
// layout, never a centred spinner.
export default function DashboardLoading() {
  return <PageSkeleton />;
}
