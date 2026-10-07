import { cn } from "@/src/lib/utils/cn";

// Offsets that must mirror the sidebar width (docs/DESIGN.md §Responsive):
// none under 768px (drawer), 64px for the 768–999px icon rail, 240px at
// ≥1000px unless the user collapsed the rail.
export function railOffset(collapsed: boolean) {
  return cn("ml-0 md:ml-16", collapsed ? "min-[1000px]:ml-16" : "min-[1000px]:ml-60");
}
