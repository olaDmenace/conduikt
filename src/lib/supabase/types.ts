// Convenience re-export of the generated Supabase types so call sites can
// write `import type { Tables } from "@/src/lib/supabase/types"`.
// The source of truth is src/types/database.ts (regenerate, never edit).
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "@/src/types/database";
export { Constants } from "@/src/types/database";

/** Row type of a public table, e.g. `ProfileRow = Row<"profiles">`. */
export type Row<T extends keyof import("@/src/types/database").Database["public"]["Tables"]> =
  import("@/src/types/database").Database["public"]["Tables"][T]["Row"];
