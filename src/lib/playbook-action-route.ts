/**
 * Builds a deep-link URL for a playbook action so the target page opens with
 * the right skill selected and the prompt pre-filled.
 *
 * Why: the playbook AI emits `conduikt_tool` (a human label like
 * "Social Content") and `conduikt_route` (a path segment like "content").
 * Multiple tools share the same route ("Social Content" and "Email Sequence"
 * both route to "content"), so the route alone isn't enough — we also need
 * to set the skill + seed the prompt from the action's title/description.
 */

export interface PlaybookActionLink {
  title: string;
  description?: string;
  conduikt_tool?: string;
  conduikt_route?: string;
}

/** Map the human tool label to the Content page's internal skill id. */
const TOOL_TO_CONTENT_SKILL: Record<string, string> = {
  "Social Content": "social-content",
  "Email Sequence": "email-sequence",
  "Content Studio": "copywriting",
  "Competitor Analysis": "competitor-analysis",
  "Content Strategy": "content-strategy",
  "CRO Analysis": "page-cro",
};

function seedPrompt(action: PlaybookActionLink): string {
  const title = action.title?.trim() ?? "";
  const desc = action.description?.trim() ?? "";
  if (!title && !desc) return "";
  if (!desc || desc === title) return title;
  return `${title}\n\n${desc}`;
}

export function buildPlaybookActionHref(
  projectId: string,
  action: PlaybookActionLink,
): string {
  const route = action.conduikt_route ?? "content";
  const base = `/projects/${projectId}/${route}`;
  const params = new URLSearchParams();

  if (route === "content") {
    const skill =
      (action.conduikt_tool && TOOL_TO_CONTENT_SKILL[action.conduikt_tool]) ||
      "copywriting";
    params.set("skill", skill);
    const prompt = seedPrompt(action);
    if (prompt) params.set("prompt", prompt);
  } else if (route === "blog") {
    if (action.title) params.set("topic", action.title);
  } else if (route === "keywords") {
    if (action.title) params.set("seed", action.title);
  }
  // audit + analytics + anything else: no params needed

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
