# Agent Guide

This file is the first-read operating guide for AI agents working in this repo.

## Read Order

1. Read this file first.
2. Read `README.md` immediately after.
3. Follow the rules and current state documented there.
4. Check recent commits and file structure before making changes.
5. Ask for clarification instead of guessing when details are missing.

## Project Overview

- Early-stage shared project for 4 coworkers.
- Shared workspace for a Start Hack Zurich prototype around SIX's "Build the Company Brain" challenge.
- Current product scope: preserve and operationalize expert knowledge in the SIX Financial Information / regulatory-data domain.
- Reference material is heterogeneous and noisy across PDFs, transcripts, spreadsheets, and mislabeled files, so agents should verify actual contents instead of trusting filenames or extensions.
- Multiple contributors may be active in GitHub at the same time.
- Detailed implementation choices are still open and should not be invented.

## Operating Rules

- Treat `README.md` as the source of truth for repo rules.
- If this file and `README.md` conflict, `README.md` wins.
- Keep changes small and scoped.
- Do not invent missing setup, architecture, or product details.
- Prefer updating existing top-level docs over creating conflicting guidance.
- If a durable top-level fact changes, update this file and `README.md` in the same change when practical.

## Maintenance

Update this file when any of the following change:

- project purpose or scope
- team workflow or collaboration rules
- setup or runtime assumptions
- repo layout or top-level documentation
- other information an agent should know before working
