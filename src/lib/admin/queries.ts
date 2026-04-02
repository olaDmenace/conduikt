import { createServiceClient } from "@/src/lib/supabase/service";

// ─── Dashboard Stats ───────────────────────────────────────────────
export async function getAdminStats() {
  const supabase = createServiceClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [usersRes, subsRes, gensRes, projectsRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("plan", "free"),
    supabase
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: usersRes.count ?? 0,
    activeSubscriptions: subsRes.count ?? 0,
    generationsThisMonth: gensRes.count ?? 0,
    totalProjects: projectsRes.count ?? 0,
  };
}

// ─── Daily Generation Counts (last 30 days) ────────────────────────
export async function getDailyGenerations() {
  const supabase = createServiceClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("ai_generations")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Group by date
  const counts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    counts[d.toISOString().split("T")[0]] = 0;
  }

  (data ?? []).forEach((row) => {
    const day = new Date(row.created_at).toISOString().split("T")[0];
    if (counts[day] !== undefined) counts[day]++;
  });

  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}

// ─── Auth user lookup (email, last sign in) ───────────────────────
async function getAuthUsers(supabase: ReturnType<typeof createServiceClient>) {
  const allUsers: Array<{ id: string; email?: string; last_sign_in_at?: string }> = [];
  let page = 1;
  const perPage = 1000;

  // Paginate through all auth users
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage });
    if (!data?.users?.length) break;
    allUsers.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at ?? undefined,
      }))
    );
    if (data.users.length < perPage) break;
    page++;
  }

  const map: Record<string, { email: string; lastSignIn: string | null }> = {};
  allUsers.forEach((u) => {
    map[u.id] = { email: u.email ?? "", lastSignIn: u.last_sign_in_at ?? null };
  });
  return map;
}

// ─── Recent Signups ────────────────────────────────────────────────
export async function getRecentSignups(limit = 10) {
  const supabase = createServiceClient();

  const [profileRes, authMap] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    getAuthUsers(supabase),
  ]);

  return (profileRes.data ?? []).map((p) => ({
    ...p,
    email: authMap[p.id]?.email ?? "",
  }));
}

// ─── All Users ─────────────────────────────────────────────────────
export async function getAllUsers() {
  const supabase = createServiceClient();

  const [profilesRes, projectsRes, authMap] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, plan, generation_count, role, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("user_id"),
    getAuthUsers(supabase),
  ]);

  const projectCounts: Record<string, number> = {};
  (projectsRes.data ?? []).forEach((p) => {
    projectCounts[p.user_id] = (projectCounts[p.user_id] ?? 0) + 1;
  });

  return (profilesRes.data ?? []).map((p) => ({
    ...p,
    email: authMap[p.id]?.email ?? "",
    lastSignIn: authMap[p.id]?.lastSignIn ?? null,
    projectCount: projectCounts[p.id] ?? 0,
  }));
}

// ─── Single User Detail ────────────────────────────────────────────
export async function getUserDetail(userId: string) {
  const supabase = createServiceClient();

  const [profileRes, authUserRes, projectsRes, generationsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, plan, generation_count, role, created_at")
      .eq("id", userId)
      .single(),
    supabase.auth.admin.getUserById(userId),
    supabase
      .from("projects")
      .select("id, name, website_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_generations")
      .select("id, agent_used, input_tokens, output_tokens, model, duration_ms, created_at, project_id")
      .eq("project_id.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Fallback: get generations via user's project IDs
  let generations = generationsRes.data ?? [];
  if (generations.length === 0 && projectsRes.data && projectsRes.data.length > 0) {
    const projectIds = projectsRes.data.map((p) => p.id);
    const { data } = await supabase
      .from("ai_generations")
      .select("id, agent_used, input_tokens, output_tokens, model, duration_ms, created_at, project_id")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false })
      .limit(50);
    generations = data ?? [];
  }

  const authUser = authUserRes.data?.user;

  return {
    profile: profileRes.data
      ? {
          ...profileRes.data,
          email: authUser?.email ?? "",
          lastSignIn: authUser?.last_sign_in_at ?? null,
        }
      : null,
    projects: projectsRes.data ?? [],
    generations,
  };
}

// ─── Admin Management ──────────────────────────────────────────────
export async function getAdminUsers() {
  const supabase = createServiceClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const authMap = await getAuthUsers(supabase);

  return (admins ?? []).map((a) => ({
    ...a,
    email: authMap[a.id]?.email ?? "",
    lastSignIn: authMap[a.id]?.lastSignIn ?? null,
  }));
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  return { error };
}

export async function findUserByEmail(email: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  return profile ? { ...profile, email: user.email } : null;
}

// ─── All Projects ──────────────────────────────────────────────────
export async function getAllProjects() {
  const supabase = createServiceClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, website_url, user_id, created_at")
    .order("created_at", { ascending: false });

  // Get owner names + emails
  const userIds = [...new Set((projects ?? []).map((p) => p.user_id))];
  const [profilesRes, authMap] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    getAuthUsers(supabase),
  ]);

  const nameMap: Record<string, string> = {};
  const emailMap: Record<string, string> = {};
  (profilesRes.data ?? []).forEach((p) => {
    nameMap[p.id] = p.full_name ?? "Unknown";
    emailMap[p.id] = authMap[p.id]?.email ?? "";
  });

  // Get generation counts per project
  const { data: gens } = await supabase
    .from("ai_generations")
    .select("project_id");

  const genCounts: Record<string, number> = {};
  (gens ?? []).forEach((g) => {
    genCounts[g.project_id] = (genCounts[g.project_id] ?? 0) + 1;
  });

  return (projects ?? []).map((p) => ({
    ...p,
    ownerName: nameMap[p.user_id] ?? "Unknown",
    ownerEmail: emailMap[p.user_id] ?? "",
    generationCount: genCounts[p.id] ?? 0,
  }));
}

// ─── All Generations ───────────────────────────────────────────────
export async function getAllGenerations() {
  const supabase = createServiceClient();

  const { data: gens } = await supabase
    .from("ai_generations")
    .select("id, agent_used, input_tokens, output_tokens, model, duration_ms, created_at, project_id")
    .order("created_at", { ascending: false })
    .limit(500);

  // Get project names
  const projectIds = [...new Set((gens ?? []).map((g) => g.project_id))];
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .in("id", projectIds.length > 0 ? projectIds : ["__none__"]);

  const projectMap: Record<string, string> = {};
  (projects ?? []).forEach((p) => {
    projectMap[p.id] = p.name;
  });

  return (gens ?? []).map((g) => ({
    ...g,
    projectName: projectMap[g.project_id] ?? "Unknown",
  }));
}

// ─── Cost Estimation ───────────────────────────────────────────────
// Pricing per million tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  default: { input: 3, output: 15 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING.default;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

// ─── Usage & Cost Data ─────────────────────────────────────────────
export async function getUsageData() {
  const supabase = createServiceClient();

  const [gensRes, projectsRes, auditsRes] = await Promise.all([
    supabase
      .from("ai_generations")
      .select("id, agent_used, input_tokens, output_tokens, model, duration_ms, created_at, project_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, website_url, user_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("audits")
      .select("id, project_id, type, url, score, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const gens = gensRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const audits = auditsRes.data ?? [];

  // Owner names
  const userIds = [...new Set(projects.map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds.length > 0 ? userIds : ["__none__"]);
  const nameMap: Record<string, string> = {};
  (profiles ?? []).forEach((p) => { nameMap[p.id] = p.full_name ?? "Unknown"; });

  // Project lookup
  const projectMap: Record<string, { name: string; website_url: string | null; user_id: string }> = {};
  projects.forEach((p) => { projectMap[p.id] = p; });

  // ── Total cost by model ──
  const modelStats: Record<string, { count: number; inputTokens: number; outputTokens: number; cost: number }> = {};
  gens.forEach((g) => {
    const m = g.model ?? "unknown";
    if (!modelStats[m]) modelStats[m] = { count: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    modelStats[m].count++;
    modelStats[m].inputTokens += g.input_tokens ?? 0;
    modelStats[m].outputTokens += g.output_tokens ?? 0;
    modelStats[m].cost += estimateCost(m, g.input_tokens ?? 0, g.output_tokens ?? 0);
  });

  // ── Per-project breakdown ──
  const projectUsage: Record<string, {
    projectId: string;
    projectName: string;
    websiteUrl: string | null;
    ownerName: string;
    agents: Record<string, number>;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    generationCount: number;
  }> = {};

  gens.forEach((g) => {
    const pid = g.project_id;
    if (!projectUsage[pid]) {
      const proj = projectMap[pid];
      projectUsage[pid] = {
        projectId: pid,
        projectName: proj?.name ?? "Unknown",
        websiteUrl: proj?.website_url ?? null,
        ownerName: nameMap[proj?.user_id ?? ""] ?? "Unknown",
        agents: {},
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        generationCount: 0,
      };
    }
    const pu = projectUsage[pid];
    pu.agents[g.agent_used] = (pu.agents[g.agent_used] ?? 0) + 1;
    pu.inputTokens += g.input_tokens ?? 0;
    pu.outputTokens += g.output_tokens ?? 0;
    pu.cost += estimateCost(g.model, g.input_tokens ?? 0, g.output_tokens ?? 0);
    pu.generationCount++;
  });

  // ── Audited websites ──
  const auditedSites = audits.map((a) => ({
    ...a,
    projectName: projectMap[a.project_id]?.name ?? "Unknown",
    websiteUrl: projectMap[a.project_id]?.website_url ?? a.url,
  }));

  // ── Totals ──
  const totalCost = Object.values(modelStats).reduce((sum, m) => sum + m.cost, 0);
  const totalInputTokens = gens.reduce((sum, g) => sum + (g.input_tokens ?? 0), 0);
  const totalOutputTokens = gens.reduce((sum, g) => sum + (g.output_tokens ?? 0), 0);

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalGenerations: gens.length,
    modelStats,
    projectUsage: Object.values(projectUsage).sort((a, b) => b.cost - a.cost),
    auditedSites,
  };
}

// ─── Subscription Distribution ─────────────────────────────────────
export async function getSubscriptionStats() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("profiles")
    .select("plan");

  const distribution: Record<string, number> = { free: 0, pro: 0, growth: 0, agency: 0 };
  (data ?? []).forEach((p) => {
    const plan = p.plan ?? "free";
    distribution[plan] = (distribution[plan] ?? 0) + 1;
  });

  return distribution;
}
