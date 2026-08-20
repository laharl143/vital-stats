---
name: review-pr
description: Independently review a vital-stats GitHub PR for production-safety risk and code quality before Ed merges it. Gives an honest Confidence rating (High/Medium/Low, never a fabricated percentage) on whether the change is safe to merge without breaking production, plus a separate harsh structural/maintainability pass via the thermo-nuclear-code-quality-review skill. Invoke as "/review-pr <PR number>", e.g. "/review-pr #4" or "/review-pr 4".
---

# Review PR (vital-stats)

This codifies the manual review process already used for VS-140 and VS-145: pull the
real diff, grep the whole repo for other callers, check lint/build parity against
`main`, reason honestly about production impact, and give a calibrated confidence
rating instead of a made-up number — plus a separate, harsher code-quality pass.

Output is **chat only**. This skill never runs `gh pr review`, `gh pr comment`, or
anything else that posts to GitHub. If Ed wants findings posted to the actual PR after
seeing them, that's a separate explicit request each time.

## 0. Resolve the PR

Accept a bare number, `#N`, or a full PR URL. Fetch its metadata without touching Ed's
working directory:

```
gh pr view <n> --json title,body,files,additions,deletions,headRefName,baseRefName,url
```

Extract a Jira key matching `VS-\d+` from the title if present. If found, fetch that
Jira issue (summary + description) so you can later note whether the diff actually
addresses what the ticket describes.

## 1. Never touch Ed's working checkout

**Do not `git checkout` the PR branch in the main working directory.** A skip-worktree
flag on `CLAUDE.md` once silently swallowed a real edit during exactly this kind of
branch-switching earlier in this project's history — and repeated checkouts are
disruptive to whatever Ed has open (uncommitted work, a running dev server on a
different branch, etc.) regardless of that specific incident.

- Use `gh pr diff <n>` to read the diff directly — this works without any checkout.
- If `npm run lint` or `npm run build` need to actually execute against the PR's code,
  create an isolated worktree instead:
  ```
  git worktree add ../vital-stats-review-<n> <headRefName>
  ```
  Run everything inside that directory. **Always remove it when you're done, success
  or failure** (`git worktree remove ../vital-stats-review-<n>`) — don't leave stray
  worktrees lying around next to the repo.

## 2. Production-safety pass

Work through these in order; this is the pass that answers "will this break
production":

1. **Diff scope**: does the actual diff match what the PR description claims? Flag any
   silent scope creep.
2. **Callers**: full-repo grep (`Grep`, not a spot-check) for every other usage of
   anything the diff touches — functions, routes, exported values, config. Read each
   caller found and confirm it's compatible with the new behavior.
3. **Lint/build parity**: run `npm run lint` and `npm run build` in the worktree. This
   repo currently has pre-existing lint errors unrelated to most changes — if lint
   fails, run it against `main` too and only treat *new* errors (not present on `main`)
   as a blocker.
4. **Production impact reasoning**: per `CLAUDE.md`'s write-safety rule, there is no
   staging environment — the dev database is the real production database. Reason
   explicitly about what this diff touches: does it write data, call an external
   service (email, webhook), or affect a live customer-facing route? **Do not run
   Playwright or hit any live endpoint without asking first** — this skill does not get
   a standing exception to the ask-first Playwright rule; it follows the same
   verification-method options as any other interactive session.
5. **Jira alignment** (if a key was found): does the diff plausibly address what the
   ticket describes, or does it look like scope drift?

End this section with:

> **Confidence: High / Medium / Low**

immediately followed by the itemized evidence backing it (what was checked, what
passed, what — if anything — could not be verified, e.g. "no live browser/DB check
performed since that would need Ed's go-ahead"). Never state a numeric percentage —
it would just be a fabricated impression of precision this process doesn't actually
have. A PR that couldn't be fully verified should say so plainly and land at Medium or
Low rather than being rounded up to High.

## 3. Code-quality pass

Apply the `thermo-nuclear-code-quality-review` skill's standards to the same diff —
this is a genuinely different axis from step 2 (architecture/legibility, not
production risk) and must be reported as its own separate section, never blended into
the Confidence rating above. A PR can be low-risk to production and still be
structurally messy, or vice versa — don't let one score contaminate the other.

## 4. Report

Present both passes clearly separated in chat, e.g.:

```
## Production-safety review — PR #<n>: <title>

<findings>

**Confidence: <High/Medium/Low>**
<evidence>

## Code-quality review (thermo-nuclear)

<findings, using that skill's severity/output conventions>
```

Do not post any of this to GitHub. If Ed asks you to post it afterward, that's a
separate action requiring its own explicit go-ahead.
