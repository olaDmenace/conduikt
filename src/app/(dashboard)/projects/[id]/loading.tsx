import { Skeleton } from "@/src/components/ui/skeleton";

// docs/DESIGN.md §States · Loading: a skeleton in the shape of the final
// layout, never a centred spinner. Project pages share one shape: a page
// header (title + description + an action), a strip of counts, then a
// list panel beside a side panel.
export default function ProjectLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 bg-surface p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3 rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
