# the-company-brain

Shared workspace for a Start Hack Zurich prototype around SIX's "Build the Company Brain" challenge. The project is about capturing expert knowledge, preserving its context and reasoning, and making it reusable across the organization instead of leaving it trapped in individual employees, siloed tools, or one-off conversations.

## Challenge Context

The challenge material positions this work inside SIX Financial Information. In the reference presentation, SIX describes that business as transforming raw data from more than 5,000 global sources into structured, client-ready market, reference, regulatory, and tax insights. This repo is focused on the knowledge layer around that work: how to retain internal expertise so teams can answer questions consistently even when the original subject-matter expert is unavailable.

## Problem Statement

- Critical knowledge is tied to individuals and gets lost when people change roles or leave.
- Information exists across documents, systems, emails, transcripts, and conversations, but context, reasoning, and decision history are hard to recover.
- New employees and adjacent teams struggle to find the right information quickly enough for onboarding, daily work, and customer-facing support.
- Sensitive knowledge must remain governed, traceable, and access-aware, so the target solution cannot be an ungoverned search box or black-box chatbot.

## Expected Outcome

- An AI-enabled solution that captures both tacit and explicit knowledge.
- Transparent, evidence-based answers with visible sources and rationale.
- Governance, traceability, and access control built into the knowledge workflow.
- A clickable prototype plus a credible implementation path.
- A solution that scales beyond one expert or one team.

## Primary Users

The challenge deck states that the solution is for the entire organization. Based on the case material, the highest-value users are likely to be:

- new employees who need faster onboarding into complex regulatory and product domains,
- compliance, legal, customer service, and operations staff who need reliable answers,
- teams that depend on SMEs for product coverage, regulatory interpretation, and issue resolution.

## Domain Scope

The provided sample materials are heavily focused on regulatory, tax, and reference-data workflows. The main topics repeatedly present in the source pack are:

- MiFID II / MiFIR investor protection, product governance, transparency, and reference-data reporting,
- SFDR / ESG disclosures, classifications, and templates,
- FATCA and broader tax-compliance workflows,
- instrument suitability, complexity, sanctions / AML / KYC, crypto regulations, risk reporting, and trade surveillance,
- master data opening / mutations and reference-data operations.

SIX product names and propositions that appear in the reference material include Regulatory Navigator, Tax Navigator, and Master Data - Opening & Mutations.

## Representative Knowledge Tasks

The project should plausibly support questions such as:

- Is a specific instrument or product type covered by an existing SIX compliance or regulatory package?
- How is an instrument classified, and which attributes drive that classification?
- Which regulatory data points matter for a given workflow, product, or client question?
- What is the supporting rationale and source trail behind a compliance-related answer?
- How can other teams reuse an SME's reasoning after that person leaves or changes roles?

One sample transcript in the reference pack shows a concrete case: a client asks whether ESG-linked structured products are covered, and the answer depends on instrument classification, available attributes, and whether additional onboarding is required. That is exactly the kind of context-dependent expert knowledge this project is meant to preserve.

## User Journey to Support

The challenge presentation frames a compliance-oriented journey roughly as:

1. Discover relevant regulatory changes or incoming questions.
2. Investigate impact, classification, and required data.
3. Prepare an approach, controls, and supporting rationale.
4. Implement the operational or policy response.
5. Monitor adherence, exceptions, and follow-up questions.

The knowledge system should help at each stage, not only at simple lookup time.

## Data and Reference Material

The challenge slides say the broader case should include about 30 files and roughly 200 MB of public information and dummy data, plus videos and transcripts. The public reference repo currently used as guidance is [starthack26/SIX_Hack_Zurich](https://github.com/starthack26/SIX_Hack_Zurich).

From reviewing that repo, the current public sample pack includes:

- the SIX challenge presentation,
- SIX brochures / handbooks / factsheets,
- EU and US regulatory source documents,
- a small spreadsheet of SIX data attributes,
- transcript-style sample material.

The challenge deck also names likely internal knowledge platforms and systems such as SharePoint, Teams, Outlook, OneNote, Word, Excel, Confluence, Jira, the SIX documentation center, and product websites. Those should be treated as important context for future ingestion or prototype design.

## Data Characteristics and Caveats

- The sample corpus is heterogeneous and imperfect by design.
- File names and extensions in the public reference pack are not always trustworthy; several ".docx" or ".xlsx" files are actually PDFs.
- Some documents appear duplicated, mislabeled, or loosely curated.
- The current public clone contains 19 files totaling about 43 MB, and 17 of those files are actually PDFs even when the extension suggests otherwise.

This is important project context, not just housekeeping: ingestion, provenance checking, validation, and evidence display are core parts of the problem.

## Success Criteria

The challenge material explicitly emphasizes:

- a clear user journey from SME knowledge capture to end-user access,
- transparent and trustworthy answers,
- practical feasibility and scalability,
- clear differentiation from generic knowledge bases or copilots,
- tangible business value.

## Current Repository Status

This repo is currently a documentation-first workspace. At the moment there is no validated application stack, local setup, environment contract, run/test/build command set, or production architecture committed here.

That is not an omission in this README. It reflects the current repo state. The challenge material explicitly gives teams freedom in technology choice, so implementation details should only be added once they are actually decided.

## Collaboration Rules

- Treat this repo as shared work.
- Pull before you push.
- Avoid overwriting other people's changes.
- Keep commits small and descriptive.
- Use branches and pull requests for non-trivial work.
- If you introduce a durable repo-level rule or workflow change, update this README and `AGENTS.md`.

## For AI Agents

- Read `AGENTS.md` first, then this README.
- Treat this README as the source of truth for repo-level facts and rules.
- Do not invent missing setup, architecture, or implementation details.
- Verify reference-material file types and actual contents instead of trusting filenames or extensions.
- If a top-level fact changes, update `AGENTS.md` with the new overview when practical.
