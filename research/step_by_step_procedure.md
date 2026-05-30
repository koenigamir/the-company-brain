# Step-by-Step Procedure: 24-Hour Company Brain Build

> **Goal:** turn the research in `research/group_idea_research.md` into a clickable, governed knowledge assistant demo that four collaborators can build in one day.
>
> **Core principle:** do not try to build the entire vision at full depth in 24 hours. Build one strong vertical slice that proves the system can ingest messy knowledge, respect role-based access, answer with citations, show freshness and provenance, and route knowledge gaps back to the right role.

## 0. What We Are Actually Building

The winning 24-hour scope is:

1. Ingest a mixed corpus of documents, transcripts, and at least one non-text source type.
2. Extract text, metadata, source role, and version/provenance information.
3. Index content for hybrid retrieval.
4. Enforce access by role group, not by individual employee.
5. Produce grounded answers with citations and freshness indicators.
6. Detect knowledge gaps and route them to the responsible role.
7. Present the result in a simple demo UI with trust signals.
8. Make the demo reachable from a QR code that opens a public website immediately on a phone.

The following ideas are **must-have** for the demo:

- hybrid retrieval, using RAG by default and graph-based reasoning where it helps,
- role-linked ownership and access control,
- provenance and version history,
- freshness / deprecation states,
- knowledge-gap detection and routing,
- a visible user experience that explains why an answer is trusted,
- a public website that opens directly from a QR code with no login wall,
- a mobile-first query page that supports query, check, and retrieve from one URL.

The following are **stretch goals** if the core slice is stable:

- living answer cards,
- topic coverage heatmap,
- handover mode,
- contradiction detection,
- trusted bookmarks / canonical answers,
- meeting-memory enrichment.

## 0.1 Recommended Technical Shape for This Repo

The README explicitly says the repo does not yet have a validated stack. For this 24-hour build, use the following as the **recommended default path** so the team can move fast without pretending these are already committed repo facts.

### Default stack

- `frontend/`: React + TypeScript + Vite, deployed as a static SPA.
- `backend/`: Node.js / TypeScript AWS Lambda handlers behind API Gateway HTTP API.
- `data/normalized/`: JSON exports for normalized sources and chunks.
- `data/governance/`: JSON exports for roles, permissions, freshness, and gap-routing rules.
- `data/retrieval/`: embeddings, keyword index data, and lightweight graph adjacency data.
- raw / derived storage: Amazon S3.
- mutable workflow state: Amazon DynamoDB only for knowledge-gap tickets.
- model provider: Amazon Bedrock **if already enabled**, otherwise any existing model API behind one small adapter.

### Why this is the right default

- the public corpus is small enough that you do not need heavy infra just to prove the idea,
- static frontend + serverless API is the fastest path to a stable public demo URL,
- S3 is enough for read-mostly demo artifacts,
- DynamoDB is enough for the one mutable workflow object: the gap ticket,
- precomputed retrieval artifacts let ingestion and query workstreams move independently,
- a lightweight graph export is enough to prove ownership, provenance, and routing without standing up a full graph database.

### Do not default to these unless someone already knows them well

- OpenSearch Serverless,
- Neo4j / Neptune / a separate graph database,
- Cognito or SSO flows,
- containerized microservices,
- a custom design system or component framework.

## 1. Team Split: Four Parallel Workstreams

Each collaborator owns one stream. No one should wait for the others except at the integration checkpoints.

### Collaborator A: Ingestion and Corpus Normalization

**Owns:** source discovery, extraction, chunking, metadata, and source manifest.

**Purpose:** turn messy files into reliable machine-readable records.

**Responsibilities:**

1. Inventory the sample sources.
2. Identify file types by actual content, not by extension.
3. Extract text, tables, and structure.
4. Capture source metadata: filename, source type, timestamp, owner role if known, version, and confidence.
5. Create a normalized source manifest that the rest of the system can consume.
6. Produce a small, stable test corpus for the other three collaborators.

**Definition of done:**

- every demo source has a normalized record,
- the pipeline can distinguish text, PDF, transcript, and video-derived content,
- the output is structured enough for indexing and graph enrichment.

### Collaborator B: Role Model, Access Control, and Provenance

**Owns:** role schema, permission mapping, provenance links, freshness states, and gap routing data.

**Purpose:** make the system governed instead of just searchable.

**Responsibilities:**

1. Define stable role entities and role groups.
2. Map source material to owning role(s).
3. Define access rules by role group.
4. Define provenance fields: source id, version, extracted-from, derived-from, timestamp.
5. Define freshness states: verified, unverified, deprecated, stale.
6. Define the knowledge-gap object and the routing rule to the responsible role.

**Definition of done:**

- every answerable record can point to a role owner,
- access can be filtered by role group,
- the system can mark an item as verified or stale,
- every missing answer can become a routed gap.

### Collaborator C: Retrieval and Answer Synthesis

**Owns:** search, ranking, answer assembly, citations, and abstention logic.

**Purpose:** return grounded answers from the indexed corpus.

**Responsibilities:**

1. Build hybrid retrieval: vector search plus keyword / metadata filters.
2. Add graph-aware expansion for ownership, provenance, and relationship-heavy questions.
3. Add a reranking step if the stack supports it quickly.
4. Build answer synthesis that always returns sources.
5. Add abstention / fallback behavior when evidence is weak.
6. Make sure the retrieval layer respects role filters before the model sees context.

**Definition of done:**

- a natural-language query returns a grounded answer,
- the answer includes citations,
- weak evidence produces a gap or safe refusal instead of hallucination,
- the result changes when role filters change.

### Collaborator D: UI, Demo Flow, and Integration

**Owns:** the visible product experience, integration glue, QR delivery, and demo readiness.

**Purpose:** turn the backend into something a judge can understand in 30 seconds.

**Responsibilities:**

1. Build the search/ask interface.
2. Render answer cards with citations, role owner, freshness, and provenance.
3. Show access-aware behavior clearly.
4. Show a knowledge-gap action that routes unresolved questions.
5. Build the public landing page that the QR code opens.
6. Add the mobile-friendly query/check/retrieve layout.
7. Generate the QR code from the production URL and place it in the demo deck and landing page.
8. Prepare the demo script and fallback paths.
9. Act as integration captain after the first checkpoint so merges stay coordinated.

**Definition of done:**

- the demo can be shown end-to-end without explanation from code,
- trust signals are visible in the UI,
- the gap-routing flow is clickable or at least visibly represented,
- the QR code opens the correct production site immediately on a phone,
- the page works well on mobile without login or install friction,
- the team has a rehearsed pitch path.

## 2. The First Hour: Freeze the Shared Contract

This hour is about preventing parallel work from colliding later.

### Step 1: Agree on the one-page contract

Freeze these shared objects before anyone builds logic:

- `source record`
- `chunk record`
- `role record`
- `answer record`
- `gap ticket`
- `provenance record`
- `permission rule`

Minimum required fields:

- `source record`: `source_id`, `title`, `source_type`, `mime_type`, `owner_role_ids`, `permission_groups`, `version_id`, `last_modified_at`, `content_hash`, `storage_uri`
- `chunk record`: `chunk_id`, `source_id`, `chunk_index`, `text`, `page_or_time_ref`, `topic_tags`, `keyword_terms`, `embedding_ref`
- `role record`: `role_id`, `role_name`, `role_group_id`, `responsibility_tags`, `can_receive_gaps`
- `answer record`: `answer_text`, `citations`, `freshness_state`, `owner_roles`, `confidence`, `gap_required`
- `gap ticket`: `gap_id`, `question`, `requested_role_group`, `routed_role_id`, `reason`, `created_at`, `status`
- `provenance record`: `source_id`, `version_id`, `derived_from`, `extracted_at`, `extractor`, `confidence`
- `permission rule`: `role_group_id`, `allowed_source_ids`, `allowed_topic_tags`, `denied_source_ids`

Freeze the first shared file outputs as well:

- `data/normalized/sources.json`
- `data/normalized/chunks.json`
- `data/governance/roles.json`
- `data/governance/permissions.json`
- `data/governance/gap_routes.json`
- `data/retrieval/embeddings.json`
- `data/retrieval/keyword_index.json`
- `data/retrieval/graph.json`

### Step 2: Decide the MVP boundary

Use this rule:

- if a feature does not help the demo show trust, governance, or role-based knowledge flow, it is a stretch goal.

### Step 3: Freeze the implementation stack

Pick the stack the team already knows best. Do not spend more than 30 minutes debating framework choices, database choices, or search backend choices.

The reason is simple:

- the demo is won by product clarity and trust, not by stack novelty,
- parallel work only works if the interfaces are frozen quickly,
- a known stack reduces integration risk inside the 24-hour window.

Recommended stack freeze:

- UI: React + TypeScript + Vite
- styling: plain CSS or Tailwind, whichever the UI owner already knows
- API: API Gateway HTTP API with Lambda proxy integration
- storage: S3 for all read-mostly artifacts
- mutable writes: DynamoDB for `gap ticket`
- retrieval: keyword search + embedding search inside the query Lambda over prebuilt JSON artifacts
- graph layer: `graph.json` adjacency data loaded in memory, not a separate graph server
- model access: one `llmClient` wrapper so the provider can change without touching UI or retrieval logic

### Step 3.5: Create the repo skeleton before writing feature logic

Create these folders first so each collaborator can work without re-litigating structure:

- `frontend/`
- `frontend/src/components/`
- `frontend/src/lib/`
- `backend/handlers/query/`
- `backend/handlers/source/`
- `backend/handlers/gap/`
- `backend/handlers/roles/`
- `scripts/ingest/`
- `scripts/build-retrieval/`
- `data/normalized/`
- `data/governance/`
- `data/retrieval/`
- `docs/demo/`

### Step 4: Pick the minimum source set

Choose a tiny but representative set:

- one policy or regulatory PDF,
- one transcript or meeting source,
- one structured or tabular source,
- one video-derived or multimedia-derived example if available.

### Step 5: Lock the demo questions

Pick 3 to 5 questions the system must answer. They should cover:

- direct lookup,
- role-owned knowledge,
- freshness or provenance,
- a gap / missing knowledge case,
- a permission-sensitive case.

## 3. Hours 1 to 4: Build in Parallel

This is the main parallel build window.

### Collaborator A tasks

1. Build the source manifest.
2. Write the extraction / normalization path.
3. Produce the first canonical chunk set.
4. Expose a small sample output that the others can consume.

Expected outputs by hour 4:

- `data/normalized/sources.json`
- `data/normalized/chunks.json`
- one example row per source type in `docs/demo/source_examples.md`

### Collaborator B tasks

1. Write the role schema and role group mapping.
2. Define the provenance and freshness fields.
3. Define the gap ticket structure.
4. Add the access rules that filter records by role group.

Expected outputs by hour 4:

- `data/governance/roles.json`
- `data/governance/permissions.json`
- `data/governance/gap_routes.json`
- one shared schema note that explains freshness states and routing rules

### Collaborator C tasks

1. Build the query path.
2. Implement the retrieval ranking logic.
3. Wire in citations and answer assembly.
4. Add a weak-evidence fallback that creates a gap instead of guessing.

Expected outputs by hour 4:

- `backend/handlers/query/`
- `backend/handlers/source/`
- `backend/handlers/roles/`
- one mocked `answer record` JSON that D can render before the API is fully live

### Collaborator D tasks

1. Build the UI skeleton.
2. Wire in the query input and answer panel.
3. Create placeholder states for citations, freshness, and ownership.
4. Prepare the demo shell and the sample prompts.

Expected outputs by hour 4:

- `frontend/` bootstrapped and deployed to a preview URL
- one mock-driven answer screen that already renders trust signals
- one mobile layout pass tested on an actual phone viewport

### Handoff rules for hours 1 to 4

1. A and B ship JSON contracts first, even if they are incomplete.
2. D should build against mocked `answer record` data immediately and not wait for C.
3. C should consume local JSON artifacts before connecting any LLM.
4. No one should block on cloud deployment during the first four hours.

## 4. First Integration Checkpoint

At the first integration point, verify only the interfaces, not perfection.

### Integration checklist

1. Can a source record produced by A be consumed by C?
2. Can B’s role filter hide content from the wrong role?
3. Can C show citations and provenance fields from B?
4. Can D render the answer without custom glue for every new field?

If any answer is no, stop and fix the contract before adding new features.

A working checkpoint should produce all of the following:

- `GET /api/roles` returns role options from B’s file,
- `GET /api/query` can read A’s chunks and B’s permissions,
- D can render one real answer returned by C,
- one demo question already works end-to-end, even if it is ugly.

## 5. Hours 4 to 8: Connect the Trust Layer

The product becomes compelling only when trust is visible.

### Collaborator A

1. Add one more source type if the first pass is too narrow.
2. Make sure the manifest includes timestamps and source lineage.

### Collaborator B

1. Add freshness states and deprecation flags.
2. Connect unresolved questions to the owning role.
3. Make the provenance trail explicit enough for the UI to display.

### Collaborator C

1. Tighten retrieval so answers are role-aware.
2. Add a stronger abstention threshold for uncertain answers.
3. Ensure all answers can explain which source version they used.

### Collaborator D

1. Surface the trust signals in the UI.
2. Show role ownership and freshness next to the answer.
3. Add a visible "create knowledge gap" action.

## 6. Hours 8 to 12: Add the Graph Layer Where It Pays Off

Do not build a full graph platform. Build only the graph elements that improve the demo.

### Build graph nodes for:

- roles,
- documents,
- chunks,
- topics,
- decisions,
- gaps,
- provenance links.

### Build graph edges for:

- owns,
- derived-from,
- cites,
- updates,
- conflicts-with,
- belongs-to,
- routed-to.

### Practical rule

Use the graph for:

- ownership,
- provenance,
- multi-hop relationships,
- gap routing,
- relationship-heavy queries.

Use simple retrieval for:

- direct lookup,
- citation-backed answer generation,
- fast demo behavior.

Implementation rule:

- store the graph first as `data/retrieval/graph.json` with nodes and edges,
- load it into memory inside the query Lambda,
- only move to a real graph backend if someone has already shipped one before and it will save time rather than cost time.

## 7. Hours 12 to 18: Make It Pitch-Ready

At this stage the prototype needs to feel like a product, not a lab demo.

### Collaborator A

1. Add one more realistic source if coverage is too thin.
2. Clean up noisy metadata so the provenance view looks believable.

### Collaborator B

1. Finalize the role coverage view.
2. Show which topics are owned, stale, or missing.
3. Make the knowledge-gap routing visible and understandable.

### Collaborator C

1. Improve answer formatting.
2. Ensure citations are stable and readable.
3. Make sure the system can answer at least the demo questions reliably.

### Collaborator D

1. Turn the UI into a narrated demo flow.
2. Add a "before/after" story for lost knowledge versus governed memory.
3. Prepare fallback screenshots or static states in case one service fails.

## 8. Hours 18 to 24: Harden and Rehearse

This is the final stabilization phase.

### Final hardening checklist

1. Run the demo questions repeatedly.
2. Confirm role filtering still behaves correctly.
3. Confirm stale or weak answers do not present as certain.
4. Confirm every answer can show where it came from.
5. Confirm the gap action routes to the right role.
6. Rehearse the 60-second pitch and the 3-minute product demo.

### Final output checklist

- working prototype,
- visible trust layer,
- visible role ownership,
- visible provenance,
- visible gap workflow,
- stable demo script.

## 9. Suggested Ownership Model for the Four People

If the team wants a simple assignment model, use this:

1. **Person 1:** ingestion, normalization, OCR/transcript/video handling.
2. **Person 2:** role model, access control, provenance, freshness, gap routing.
3. **Person 3:** retrieval, ranking, answer synthesis, citations, abstention.
4. **Person 4:** UI, integration, demo flow, story, final coordination.

This split is good because:

- each person owns a subsystem with a clear output,
- the outputs meet at simple contracts,
- there is only one final integration surface,
- the demo person can keep the story coherent while the others build.

## 10. Coordination Rules

To keep four people from blocking each other:

1. Use one shared schema document and do not rename shared fields casually.
2. Merge only at the agreed checkpoints.
3. Keep one person as integration captain after the first checkpoint.
4. If a decision affects two streams, decide it in the shared contract, not in private code.
5. Prefer thin adapters over cross-team rewrites.
6. If something is not essential to the demo, cut it immediately.

## 11. Definition of Done

The 24-hour build is done when all of the following are true:

- a user can ask a natural-language question,
- the system retrieves from mixed sources,
- access is role-aware,
- the answer has citations and provenance,
- freshness or verification state is visible,
- unresolved questions become gaps routed to the owning role,
- the demo is understandable without technical explanation,
- the team can explain why this is more than a plain search box.

## 12. What Not to Spend Time On

Do **not** spend the day on:

- a perfect long-term data model,
- fully automated connector coverage,
- full graph completeness,
- custom ML training,
- fancy UI polish before the trust flow works,
- building every stretch feature listed in the research memo.

The goal is not completeness. The goal is to prove the product thesis in one convincing slice.

## 13. Website and QR delivery

This is the exact path for making the demo easy to access in the room.

### Recommended web stack

Use a single public web app served from AWS.

Recommended implementation:

- front end: React + TypeScript + Vite SPA.
- hosting: AWS Amplify Hosting.
- dynamic endpoints: AWS Lambda + API Gateway HTTP API.
- artifact storage: S3.
- gap workflow storage: DynamoDB.
- public demo URL: Amplify production URL first, custom domain second.
- preview URLs: only for internal testing.

Why this is the right shape:

- AWS Amplify Hosting serves the web app and supports custom domains.
- API Gateway and Lambda let the same project expose query and gap APIs without owning a server.
- S3 keeps the read path simple for normalized and indexed artifacts.
- DynamoDB handles the one thing that actually changes during the demo: gap tickets.
- Preview deployments are convenient for development, but the QR code should never point at a random preview host.
- The QR code must resolve to one stable URL so attendees can scan it repeatedly without ambiguity.
- A public demo QR code needs a stable HTTPS endpoint with low ops risk.
- The whole path stays AWS-managed and easier to support during the demo.

### Exact AWS build order

1. Pick one region and keep everything there.
   - Recommendation: `eu-central-1` to stay geographically close to Zurich and avoid needless cross-region confusion.
2. Create one S3 bucket for demo artifacts.
   - Example prefixes: `raw/`, `normalized/`, `governance/`, `retrieval/`, `screenshots/`.
3. Upload the outputs from A, B, and C into S3.
   - `normalized/sources.json`
   - `normalized/chunks.json`
   - `governance/roles.json`
   - `governance/permissions.json`
   - `governance/gap_routes.json`
   - `retrieval/embeddings.json`
   - `retrieval/keyword_index.json`
   - `retrieval/graph.json`
4. Create one DynamoDB table for gaps.
   - Table name: `company-brain-gaps`
   - Partition key: `gap_id`
   - Useful attributes: `status`, `created_at`, `routed_role_id`
5. Create four Lambda functions.
   - `queryHandler`
   - `sourceHandler`
   - `gapHandler`
   - `rolesHandler`
6. Add environment variables to the Lambdas.
   - `S3_BUCKET`
   - `SOURCES_KEY`
   - `CHUNKS_KEY`
   - `ROLES_KEY`
   - `PERMISSIONS_KEY`
   - `GAP_ROUTES_KEY`
   - `EMBEDDINGS_KEY`
   - `KEYWORD_INDEX_KEY`
   - `GRAPH_KEY`
   - `MODEL_PROVIDER`
   - `MODEL_NAME`
7. Create one API Gateway HTTP API and attach the four routes.
   - `GET /api/query`
   - `GET /api/source/{id}`
   - `POST /api/gap`
   - `GET /api/roles`
8. Enable CORS for the Amplify frontend domain and local dev origin.
9. Deploy the frontend to Amplify and set `VITE_API_BASE_URL` to the API Gateway base URL.
10. Use the Amplify production URL for the QR code first.
11. Only add Route 53 and a custom domain if the site is already stable and someone can do it without slowing the main demo path.

### Backend implementation steps

Build the backend in this order:

1. `rolesHandler`
   - Return the allowed demo role groups from `roles.json`.
   - This unblocks the UI immediately.
2. `queryHandler`
   - Load JSON artifacts from S3 on cold start.
   - Apply role-group filtering before any retrieval.
   - Run keyword scoring.
   - Run embedding similarity over the top role-allowed chunks.
   - Merge scores into one ranked list.
   - Expand with `graph.json` only for ownership, provenance, and routing fields.
   - Pass only the top evidence set to the model.
   - Return `gap_required` when evidence is too weak.
3. `sourceHandler`
   - Return the full provenance trail for one source id so the UI can open a drawer or modal.
4. `gapHandler`
   - Write one item to DynamoDB and return the routed role.

Practical rule:

- if the retrieval Lambda can answer demo questions from prebuilt JSON artifacts, do not lose time standing up OpenSearch.
- if the model provider is not ready, return extractive answers first and add synthesis later.

### Frontend implementation steps

Build the frontend as one mobile-first screen before adding any second page.

Recommended component order:

1. `Hero`
   - one-sentence value proposition
   - short explanation that answers are evidence-backed and role-aware
2. `RoleSelector`
   - dropdown or pill selector driven by `GET /api/roles`
3. `QuestionBox`
   - textarea or input
   - submit button
   - sample prompt chips
4. `AnswerCard`
   - answer text
   - confidence label
   - freshness badge
   - owner role badge
5. `CitationList`
   - source title
   - page or time reference
   - snippet preview
6. `SourceDrawer`
   - provenance trail
   - source version
   - last updated timestamp
7. `GapAction`
   - visible button when `gap_required = true`
   - success state after `POST /api/gap`

Implementation order:

1. Build the layout with mocked data.
2. Connect the role selector.
3. Connect the query form.
4. Render loading, empty, success, weak-evidence, and error states.
5. Connect the source drawer.
6. Connect gap submission.
7. Test on a phone viewport before adding polish.

### API contract

Keep the front end and the backend extremely small:

- `GET /api/query?q=...&role=...`
  - returns `answer_text`, `citations`, `freshness_state`, `owner_roles`, `confidence`, `gap_required`
- `GET /api/source/{id}`
  - returns source trail, version, provenance, and timestamps
- `POST /api/gap`
  - creates a gap item and returns the routed role
- `GET /api/roles`
  - populates the role selector

Suggested query response shape:

```json
{
  "answer_text": "SIX covers this instrument type through the Regulatory Navigator package when the classification attributes are present.",
  "confidence": "medium",
  "freshness_state": "verified",
  "owner_roles": [
    {
      "role_id": "regulatory-analyst",
      "role_name": "Regulatory Analyst"
    }
  ],
  "citations": [
    {
      "source_id": "product-coverage-transcript",
      "title": "Product Coverage transcript",
      "page_or_time_ref": "00:02:13-00:02:48",
      "snippet": "Coverage depends on whether the product can be classified with existing attributes.",
      "version_id": "v1"
    }
  ],
  "gap_required": false
}
```

### QR code rules

1. Generate the QR code from the production URL only.
2. Render it as SVG for crisp slide output.
3. Export PNG as a fallback for documents and handouts.
4. Use high error correction.
5. Print a short human-readable URL beneath the QR code.
6. Keep the QR code large enough to scan from the room.

### Website layout

The landing page should be one screen on mobile:

- title and one-sentence value proposition,
- a large labeled query field,
- sample question chips,
- role selector or demo mode selector,
- answer card area,
- source/provenance drawer,
- freshness badge,
- gap action button,
- copy-link fallback.

Page behavior rules:

- the first screen should already show sample prompts so the user is never staring at an empty box,
- provenance should open inline on mobile instead of navigating to a different page,
- role switching should visibly change the available result or the permission message,
- every demo question should be answerable from the same URL without login.

### Accessibility rules

- Use native `<button>`, `<input>`, and `<a>` elements where possible.
- Provide visible focus states.
- Label every form control.
- Keep a single-column mobile layout.
- Do not rely on color alone for freshness or access states.
- Make every interactive area touch-friendly.
- Avoid any login or install requirement before first query.

### Optional PWA add-on

If time allows, add a manifest and service worker so the site can be installed like an app on phones.

Minimum manifest fields:

- `name`
- `short_name`
- `start_url`
- `display: standalone`
- `icons` at 192x192 and 512x512

The PWA layer is a friction reducer, not a dependency for the demo.

## 14. Fallback Rules If the Stack Slips

These are cut rules, not nice-to-haves.

1. If the model provider is not working by hour 8, ship extractive answers assembled from top citations.
2. If graph logic is not working by hour 10, keep only role ownership and provenance links in `graph.json`.
3. If the custom domain is not ready by hour 12, keep the QR code pointed at the Amplify production URL.
4. If the live API is unstable by hour 16, freeze one stable dataset and serve it reliably rather than chasing freshness.
5. If the UI is unstable by hour 18, switch to one scripted demo path and add screenshots for backup.
