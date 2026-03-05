"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  AlertTriangle,
  FileText,
  TrendingUp,
  Settings,
  Calendar,
  Globe,
  Search,
  Rocket,
  Target,
  Mail,
  FolderOpen,
  Megaphone,
  Swords,
  Video,
} from "lucide-react";
import { cn } from "@/src/lib/utils/cn";

interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const agentsBase = `${base}/agents`;

  const items = [
    { name: "Overview",  href: base,                          icon: BarChart3   },
    { name: "SEO Audit", href: `${agentsBase}/seo-audit`,     icon: AlertTriangle },
    { name: "Content",   href: `${agentsBase}/content`,       icon: FileText    },
    { name: "Blog",      href: `${agentsBase}/blog`,          icon: Globe       },
    { name: "Video",     href: `${base}/video`,               icon: Video       },
    { name: "Keywords",  href: `${agentsBase}/keywords`,      icon: Search      },
    { name: "Growth",    href: `${agentsBase}/growth`,        icon: Rocket      },
    { name: "CRO",       href: `${agentsBase}/cro`,           icon: Target      },
    { name: "Analytics", href: `${base}/analytics`,           icon: TrendingUp  },
    { name: "Campaigns", href: `${base}/campaigns`,            icon: Megaphone   },
    { name: "Competitors", href: `${base}/competitors`,        icon: Swords      },
    { name: "Calendar",  href: `${agentsBase}/calendar`,      icon: Calendar    },
    { name: "Emails",    href: `${base}/emails`,              icon: Mail        },
    { name: "Library",   href: `${base}/library`,             icon: FolderOpen  },
    { name: "Settings",  href: `${base}/settings`,            icon: Settings    },
  ];

  return (
    <div className="flex items-center gap-1 mb-8 rounded-lg border border-border-default bg-surface-0 p-1 overflow-x-auto">
      {items.map((item) => {
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
