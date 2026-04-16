/**
 * Robustly extract and parse JSON from an LLM response string.
 *
 * LLMs sometimes wrap JSON in markdown code fences, add preamble text,
 * or include trailing explanation. This function handles all those cases:
 *
 * 1. Try direct JSON.parse (response is pure JSON)
 * 2. Try extracting from ```json ... ``` or ``` ... ``` code fences
 * 3. Fall back to finding the first balanced { ... } block
 *
 * Throws if no valid JSON can be extracted.
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

  // Walk forward counting braces to find the balanced end
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        const candidate = trimmed.slice(startIdx, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          // This balanced block wasn't valid JSON, keep looking
          // (shouldn't normally happen, but be safe)
          break;
        }
      }
    }
  }

  // Last resort: greedy regex (original behavior)
  const greedyMatch = trimmed.match(/\{[\s\S]*\}/);
  if (greedyMatch) {
    return JSON.parse(greedyMatch[0]);
  }

  throw new Error("Failed to extract valid JSON from response");
}
