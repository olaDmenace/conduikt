import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  expandedProjectIds: string[];

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  toggleProjectExpanded: (id: string) => void;
  setProjectExpanded: (id: string, expanded: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      expandedProjectIds: [],

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
    }),
    {
      name: "conduikt-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedProjectIds: state.expandedProjectIds,
      }),
    }
  )
);
