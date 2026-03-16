# Agent Build Checklist

Read this file in full before building or changing any agent.

Before writing any agent code, you must:

1. Check if there is a matching skill file in .claude/marketingskills/
   If there is, read it before writing the prompt logic.
   If there is not, say so — do not invent the prompt structure.

2. Check src/lib/ai/agents/types.ts to confirm the AgentConfig
   interface you are implementing against.

3. Check src/lib/ai/agents/index.ts to confirm the agent is
   registered after you build it.

After building any agent, confirm all of the following before marking it done:

- The agent has a unique ID in agents/index.ts
- The agent writes a row to the ai_generations table on every output
- The agent is gated by the correct plan tier
- The agent route returns a typed error response, not a raw throw
- You have tested the route manually and it returns a 200 with
  the correct JSON shape
