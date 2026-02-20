import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  expandedProjectIds: string[];
  theme: "dark" | "light";

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  toggleProjectExpanded: (id: string) => void;
  setProjectExpanded: (id: string, expanded: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      expandedProjectIds: [],
      theme: "dark" as const,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleMobileMenu: () =>
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

      toggleProjectExpanded: (id) =>
        set((state) => ({
          expandedProjectIds: state.expandedProjectIds.includes(id)
            ? state.expandedProjectIds.filter((pid) => pid !== id)
            : [...state.expandedProjectIds, id],
        })),

      setProjectExpanded: (id, expanded) =>
        set((state) => ({
          expandedProjectIds: expanded
            ? [...state.expandedProjectIds.filter((pid) => pid !== id), id]
            : state.expandedProjectIds.filter((pid) => pid !== id),
        })),

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          document.documentElement.classList.remove("dark", "light");
          document.documentElement.classList.add(next);
          return { theme: next };
        }),
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(theme);
        set({ theme });
      },
    }),
    {
      name: "conduikt-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedProjectIds: state.expandedProjectIds,
        theme: state.theme,
      }),
    }
  )
);
