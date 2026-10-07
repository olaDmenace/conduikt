"use client";

// The one import path for icons (docs/DESIGN.md §Icons). @icon-park/react
// creates React context at module load and ships without a "use client"
// directive, so importing it from a Server Component crashes the render.
// Re-exporting through this client module makes every icon safe to use
// anywhere. Add names here as the lucide-react migration proceeds.
export {
  Add,
  Analysis,
  Attention,
  Brain,
  Calendar,
  ChartLine,
  CheckOne,
  Close,
  Command,
  Cycle,
  Down,
  Edit,
  FolderOpen,
  HamburgerButton,
  Home,
  Left,
  Lightning,
  Link,
  Lock,
  Logout,
  Mail,
  MenuFoldOne,
  MenuUnfoldOne,
  Peoples,
  Plan,
  Plug,
  Plus,
  Refresh,
  Right,
  Search,
  SendEmail,
  SendOne,
  SettingTwo,
  Voice,
  Write,
} from "@icon-park/react";
