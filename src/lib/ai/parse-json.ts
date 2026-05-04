/**
 * Robustly extract and parse JSON from an LLM response string.
 *
 * LLMs sometimes wrap JSON in markdown code fences, add preamble text,
 * include trailing explanation, or get cut off by max_tokens before the
 * closing brace. This function handles all those cases:
 *
 * 1. Try direct JSON.parse (response is pure JSON)
 * 2. Try extracting from ```json ... ``` or ``` ... ``` code fences
 * 3. Find the first balanced { ... } block walking braces
 * 4. Truncation repair: trim to the last complete element + close structures
 *
 * Throws if no valid JSON can be extracted even after repair.
 */
export function parseJsonResponse(response: string): unknown {
  const trimmed = response.trim();

  // 1. Direct parse — response is pure JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // Not pure JSON, try extraction
  }

  // 2. Extract from markdown code fences: ```json\n{...}\n``` or ```\n{...}\n```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Code fence content wasn't valid JSON, continue
    }
  }

  // 3. Find the first { and its balanced closing }
  const startIdx = trimmed.indexOf("{");
  if (startIdx === -1) {
    throw new Error("No JSON object found in response");
  }

  // Walk forward counting braces to find the balanced end. Returns the
  // candidate index OR the deepest "last complete element" position so
  // we can attempt a truncation repair if the JSON never closes.
  const walked = walkAndExtract(trimmed, startIdx);
  if (walked.balanced) {
    try {
      return JSON.parse(walked.balanced);
    } catch {
      // Brace-balanced but invalid JSON (e.g., unescaped quote). Fall
      // through to truncation repair which trims to a known-good prefix.
    }
  }

  // 4. Truncation repair. Common case: model hit max_tokens mid-string,
  // leaving an unbalanced object like `{"emails":[{...}, {...}, {`. We
  // trim back to the most recent place where structures were balanced
  // (end of the last complete top-level value), close any remaining
  // open arrays/objects, and try to parse the result.
  const repaired = repairTruncatedJson(trimmed, startIdx);
  if (repaired) {
    try {
      return JSON.parse(repaired);
    } catch {
      // Repair didn't yield valid JSON either. Fall through to error.
    }
  }

  // Last resort: greedy regex (preserved for back-compat with very old
  // outputs where the regex worked but the brace walker doesn't).
  const greedyMatch = trimmed.match(/\{[\s\S]*\}/);
  if (greedyMatch) {
    try {
      return JSON.parse(greedyMatch[0]);
    } catch {
      // fall through
    }
  }

  throw new Error("Failed to extract valid JSON from response");
}

interface WalkResult {
  // Exact balanced JSON substring, if walker found one.
  balanced: string | null;
  // For each depth d encountered during the walk, the position right
  // after the last fully-completed value AT THAT DEPTH (either after
  // a `}/]` that closed depth d+1, or before a `,` that separated two
  // values at depth d), plus the matching stack snapshot.
  //
  // We track per-depth so truncation repair can pick the right level:
  // commas INSIDE a partially-emitted element shouldn't pollute the
  // safe-position for the outer container.
  safeAtDepth: Array<{ pos: number; stack: ("{" | "[")[] } | undefined>;
  // Brace/bracket depth at end-of-input (0 = balanced, >0 = truncated).
  eofDepth: number;
}

function walkAndExtract(s: string, start: number): WalkResult {
  let depth = 0;
  let inString = false;
  let escape = false;
  const stack: ("{" | "[")[] = [];
  const safeAtDepth: WalkResult["safeAtDepth"] = [];

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
      depth++;
      continue;
    }
    if (ch === "}" || ch === "]") {
      stack.pop();
      depth--;
      if (depth === 0) {
        return {
          balanced: s.slice(start, i + 1),
          safeAtDepth: [],
          eofDepth: 0,
        };
      }
      // We just closed a child structure. Position after the close is
      // a safe trim point at the now-current (outer) depth.
      safeAtDepth[depth] = { pos: i + 1, stack: [...stack] };
      continue;
    }
    if (ch === "," && depth > 0) {
      // Comma at depth d separates two values at depth d. Position
      // BEFORE the comma is a clean trim point.
      safeAtDepth[depth] = { pos: i, stack: [...stack] };
    }
  }

  return { balanced: null, safeAtDepth, eofDepth: depth };
}

function repairTruncatedJson(s: string, start: number): string | null {
  const walk = walkAndExtract(s, start);
  if (walk.balanced) return walk.balanced;
  if (walk.eofDepth === 0) return null;

  // Try trim points in priority order. The most useful candidate is
  // usually `eofDepth - 1` — that level's last safe position represents
  // "the boundary before the partially-emitted element at eofDepth".
  // Fall back to shallower depths if that's missing or repair-parses fail.
  const order = new Set<number>();
  for (let d = walk.eofDepth - 1; d >= 1; d--) order.add(d);
  for (let d = walk.eofDepth; d >= 1; d--) order.add(d);

  for (const d of order) {
    const safe = walk.safeAtDepth[d];
    if (!safe) continue;
    const candidate = buildClosedPrefix(s, start, safe.pos, safe.stack);
    if (!candidate) continue;
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // This trim point produced unparseable JSON (e.g., the char-by-
      // char detector got fooled by a tricky string). Try shallower.
    }
  }
  return null;
}

function buildClosedPrefix(
  s: string,
  start: number,
  trimEnd: number,
  openStructures: ("{" | "[")[]
): string | null {
  if (trimEnd <= start) return null;
  let prefix = s.slice(start, trimEnd);
  // Strip trailing comma (some trim points land right before a comma,
  // others might land right after — be defensive).
  prefix = prefix.replace(/,\s*$/, "");
  // Close every still-open structure in reverse order of nesting.
  for (let i = openStructures.length - 1; i >= 0; i--) {
    prefix += openStructures[i] === "{" ? "}" : "]";
  }
  return prefix;
}
