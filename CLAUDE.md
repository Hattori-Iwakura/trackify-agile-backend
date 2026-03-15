# Trackify Agile — Claude Code Instructions

> **This file is for Claude Code ONLY.** It is gitignored.
> For shared project rules, read `CONTEXT.md` (committed to git, used by all AI agents).

---

## 1. Core Reference

**Read `CONTEXT.md` FIRST** — it contains:
- Tech stack, module ownership, code conventions
- Current project state (files, schema, what's built vs not)
- Git conventions and n8n automation rules
- Academic requirements (Multer, Socket.io)

Everything in `CONTEXT.md` applies here. The sections below are **Claude-specific additions**.

---

## 2. Claude-Specific Directives

- Treat both `CLAUDE.md` and `CONTEXT.md` as **living documents** — update them when significant changes occur
- When unsure about a requirement, ask — do not assume
- Prioritize **working code with tests** over perfect architecture
- Always consider the **6-person backend team** — avoid patterns that create cross-module dependencies
- Document as code: Swagger decorators ARE the API documentation

---

## 3. Session Reports (MANDATORY)

> **After every completed work session**, generate a report file in `docs/reports/`.

**Naming**: `docs/reports/YYYY-MM-DD-<short-description>.md`

**Template**:
```markdown
# Session Report — YYYY-MM-DD — <Short Title>

## Summary
Brief 1-2 sentence overview of what was accomplished.

## Changes Made
List every file created, modified, or deleted with a short description.

## Packages Installed/Removed
Table of any dependency changes.

## Tests
- Tests added and their results (pass/fail count).

## Build Status
Whether the project compiles successfully after changes.

## Notes / Decisions
Any architectural decisions, gotchas, or things the team should know.

## Next Steps
What should be done next based on this session's work.
```

After writing the report, **update `CONTEXT.md` section 10** to list the new report.

---

## 4. CONTEXT.md Maintenance (MANDATORY)

> **After every completed work session**, update `CONTEXT.md` to reflect the current project state.

What to update:
- **Section 8 (Current Project State)**: Update file tree, module status, checklist
- **Section 10 (Session Reports)**: Add the new report to the list
- **Any other section** that was affected by the session's work (new packages, new env vars, etc.)
- **Update the `Last updated` date** at the top of `CONTEXT.md`
