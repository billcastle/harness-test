---
name: verify
description: Verify changes before calling work done — typecheck, lint, related tests, build. Use after implementing a feature or fix.
---

Delegate to the `test-runner` agent with this checklist and wait for its report:

1. `npm run typecheck` (or `npx tsc --noEmit`)
2. `npm run lint`
3. Tests related to changed files (`git diff --name-only HEAD`); full suite only if the change is cross-cutting
4. `npm run build` — only if routing, config, or dependencies changed

Skip any script that doesn't exist in `package.json`.

If it reports failures: fix them, then run only the failed step again. Repeat until clean.
For UI changes, also check the page in the running app if a browser tool is available.
Finish with one line per step: ✅/❌ + step name.
