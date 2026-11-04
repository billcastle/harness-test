# harness-test

A small Claude Code setup for web projects.

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project context, loaded every session. Keep it short. |
| `.claude/settings.json` | Permissions (auto-allows safe commands, blocks secrets, lockfiles and build output) and the format hook |
| `.claude/hooks/format.mjs` | Runs Biome, or Prettier + ESLint, on each edited file; sends back only remaining errors |
| `.claude/skills/feature` | `/feature <desc>`: explore → plan → build → test → verify |
| `.claude/skills/verify` | `/verify`: typecheck, lint, tests, build |
| `.claude/agents/test-runner.md` | Haiku agent that runs noisy commands and returns only failures |

Built-in skills also work: `/code-review`, `/security-review`, `/simplify`, `/init`.

**Setup:** fill in the stack, commands and layout in `CLAUDE.md`. Put personal overrides in `.claude/settings.local.json` and `CLAUDE.local.md`; both are gitignored.
