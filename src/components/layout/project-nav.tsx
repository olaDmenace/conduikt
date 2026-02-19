"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  AlertTriangle,
  FileText,
  TrendingUp,
  Settings,
  Sparkles,
  Calendar,
  Globe,
  Search,
  Rocket,
} from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const items = [
    { name: "Overview",  href: base,                    icon: BarChart3   },
    { name: "Audit",     href: `${base}/audit`,          icon: AlertTriangle },
    { name: "Content",   href: `${base}/content`,        icon: FileText    },
    { name: "Blog",      href: `${base}/blog`,           icon: Globe       },
    { name: "Keywords",  href: `${base}/keywords`,       icon: Search      },
    { name: "Growth",    href: `${base}/growth`,         icon: Rocket      },
    { name: "Analytics", href: `${base}/analytics`,      icon: TrendingUp  },
    { name: "Calendar",  href: `${base}/calendar`,       icon: Calendar    },
    { name: "Campaigns", href: `${base}/campaigns`,      icon: Sparkles,   comingSoon: true },
    { name: "Settings",  href: `${base}/settings`,       icon: Settings    },
  ];

  return (
    <div className="flex items-center gap-1 mb-8 rounded-lg border border-border-default bg-surface-0 p-1 overflow-x-auto">
      {items.map((item) => {
        if (item.comingSoon) {
          return (
            <span
              key={item.name}
              className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-small font-medium text-text-tertiary/40 cursor-not-allowed shrink-0"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </span>
          );
        }

        // Exact match for overview; prefix match for sub-pages
        const isActive =
          item.href === base
            ? pathname === base
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-small font-medium transition-colors shrink-0",
              isActive
                ? "bg-surface-2 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
