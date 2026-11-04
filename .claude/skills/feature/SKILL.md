---
name: feature
description: Implement a feature or page end-to-end — explore, plan, build, test, verify. Use for any non-trivial feature request.
argument-hint: <feature description>
---

Feature: $ARGUMENTS

1. **Explore** — find the code involved and existing patterns to reuse (components, hooks, utils, styles). Use the `Explore` agent if more than ~3 files are involved.
2. **Plan** — list the files to change and what changes in each, in ≤8 bullets. Ask only if a requirement is ambiguous.
3. **Build** — follow existing conventions. Server/client boundaries, loading/error/empty states, a11y.
4. **Test** — add or update unit tests for logic, and an e2e spec for new user flows.
5. **Verify** — run `/verify`.
6. **Report** — what changed (files) and anything left undone, in ≤5 lines.
