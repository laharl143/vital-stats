---
name: checkpoint-progress
description: Use when the user wants to save/checkpoint the current session's progress before compacting, ending the session, or switching context — especially mid-ticket work that spans many turns (code changes, verification runs, Slack/Jira coordination). Triggers on "compact this session", "checkpoint progress", "save our progress", "save progress before compacting", or "/checkpoint-progress". Writes a structured project memory file capturing ticket status, code/git state, verification status, and outstanding coordination — so nothing is lost regardless of when automatic compaction happens or if the session ends and a new one picks up later.
---

# Checkpoint Progress

Claude Code compacts context automatically and there's no tool to trigger that
manually. What this skill does instead: write everything that actually matters
about the current work into a **project memory file**, so it survives
regardless of compaction timing — and is retrievable in a brand-new session
too, not just this one.

This is NOT a substitute for the auto-memory system's normal judgment about
what's memory-worthy (see the main auto-memory instructions) — this is a
deliberate, on-demand checkpoint of an entire piece of *ongoing work*
(typically a ticket), written when the user explicitly asks for one.

---

## Step 1 — Identify what's being checkpointed

Look at the conversation for the active unit of work — usually a ticket key
(e.g. `VS-245`), but could be a feature branch or task with no ticket.
If genuinely ambiguous (multiple unrelated tickets touched this session),
ask which one, or write one memory per ticket if the user wants both.

## Step 2 — Gather the state that actually matters

Pull together, from the conversation and a quick check of the actual
repo/environment (don't just trust what was said earlier — re-verify cheap
facts like git status):

- **The problem**: one or two sentences on what the ticket/task is actually
  about — enough that a cold read makes sense without re-deriving it from
  the diff.
- **The fix/current code state**: what changed, where, and *why* (the
  reasoning behind non-obvious decisions — e.g. why a particular SQL
  rewrite was chosen — matters more than restating the diff, since the diff
  itself is always re-readable from git).
- **Verification status**: what's been proven and how (test counts, real
  execution evidence, which evidence files/zips are current vs. stale if
  multiple were generated across iterations).
- **Git status**: current branch, commit hash(es), pushed or not, MR
  opened or not, and — importantly — anything **uncommitted** that's
  pending a go-ahead. Run `git status`/`git log -1` fresh rather than
  trusting an earlier turn's memory of it.
- **Bugs found and fixed along the way**: worth listing explicitly so a
  future session doesn't accidentally re-discover and re-investigate the
  same thing. Mark them clearly as *resolved*, not open issues.
- **External coordination**: Slack threads, other teams/people involved,
  what's blocked on whom, and any commitments made ("I'll check X once Y
  happens"). This is usually the most perishable info and the easiest to
  lose — capture names and exact asks, not vague summaries.
- **The single next action**: what happens next, concretely, and who's
  waiting on it. This is the first thing a future session (or the user
  re-reading later) needs — put it near the top of the memory file, not
  buried at the end.

## Step 3 — Write the memory file

Follow the auto-memory system's file format exactly (frontmatter with
`name`/`description`/`metadata.type: project`, content structured as
fact → **Why:** → **How to apply:** where relevant). Name the file after
the ticket/task (e.g. `vs_245_progress.md`), not a generic name — if
this skill runs again later for the same ticket, overwrite/update the same
file rather than creating a second one.

If a memory file for this exact ticket already exists, **update it in
place** — read it first, merge in what's changed, don't just append a new
dated section that duplicates most of the old content.

## Step 4 — Update the index

Add or update the one-line pointer in `MEMORY.md` per the auto-memory
system's normal convention (`- [Title](file.md) — one-line hook`, under
~150 chars). If `MEMORY.md` doesn't exist yet, create it.

## Step 5 — Confirm briefly

Tell the user what got saved — a short bullet list of what the memory file
captures (problem, fix, verification, git state, next action, who's
waiting) — not a re-print of the whole file. If there was something you
couldn't verify fresh (e.g. you didn't re-run `git status` because it
wasn't safe to touch the working tree at that moment), say so rather than
implying everything was double-checked.

---

## Notes

- Don't memory-ize things that are cheaply re-derivable from the repo
  itself (file contents, current diff) — focus on the parts that decay or
  require conversation context to reconstruct: *why* decisions were made,
  *what's* still pending, *who's* waiting on what.
- This skill can run mid-session (not just right before ending) — if the
  user says "checkpoint this" partway through a long ticket, do it then;
  don't wait for a natural stopping point.
- If the user asks to checkpoint but the session hasn't actually made
  progress worth recording (e.g. pure Q&A, no code/state changes), say so
  plainly rather than writing a memory file with nothing in it.
