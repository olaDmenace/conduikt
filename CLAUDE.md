# Conduikt — Project Context

AI Marketing Automation SaaS. Next.js 16 + Supabase + Claude API.

## Design

`docs/DESIGN.md` is the single source of truth for colour, type, spacing, icons, components, voice and app structure (Direction C: sand ground, ink bands, one orange accent, teal for data). Tokens live only in `src/styles/globals.css`. Do not add colours, fonts or radii outside it. `npm run check:hex` must not regress. The old "Mineral" system (dark obsidian, copper, DM Serif, Outfit) is retired.

See `~/.claude/projects/C--Users-ADMIN-Desktop-projects-conduikt/memory/` for session memory (architecture, design rules, IDs, project status).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
