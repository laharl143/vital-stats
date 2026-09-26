<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Workflow rules

`CLAUDE.md` always wins over any skill, including the pipeline skills below. In particular:

- Ask Ed before any Playwright or browser check, every time, including `/check verify`. An earlier yes never covers a later change.
- Never commit, push or open a PR without Ed's explicit go ahead.
- The local database is the real production database (Supabase; there is no staging). Never run a destructive write (DELETE, bulk update, anything that changes or removes existing records). New test records are fine; put `TEST` in their name or email.
- Never stop a dev server you did not start.

## Git

- integration: on
- commit: manual (skills may suggest a commit, never make one; they never push)

## Testing

Tests use `node:test` and run with `npm test`. The `test` script in `package.json` lists every test file by name, so a new test file must be added to that list or it never runs. There is no Vitest here.

## Agent skills

- [checkpoint-progress](.claude/skills/checkpoint-progress/): save a ticket's progress to project memory before compacting or ending a session
- [domain-modeling](.claude/skills/domain-modeling/): build the domain glossary (`CONTEXT.md`) and record decisions as ADRs
- [grill-with-docs](.claude/skills/grill-with-docs/): a grilling interview that also writes the glossary and ADRs
- [grilling](.claude/skills/grilling/): stress test a plan or decision with rounds of questions
- [review-pr](.claude/skills/review-pr/): production safety and code quality review of a vital-stats PR before Ed merges it
- [thermo-nuclear-code-quality-review](.claude/skills/thermo-nuclear-code-quality-review/): very strict maintainability review

Pipeline skills from jsmastery-pro/skills, installed globally in `~/.claude/skills/`: /scope, /architect, /develop, /check, /test, /debug, /document, /sync, /audit

## Project tracking

Jira project VS (`vital-stats.atlassian.net`). The self service ordering slice is epic VS-251 (features VS-252 to VS-261). Until this repo has its own `docs/scope/scope.md`, the plan and order across both repos is Phase 7 of `docs/scope/scope.md` in the OMS repo (`C:\Projects\order-management-system`).
