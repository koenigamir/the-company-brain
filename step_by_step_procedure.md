# Step-by-Step Procedure: 24-Hour Company Brain Build

> **Goal:** turn the research in `group_idea_research.md` into a clickable, governed knowledge assistant demo that four collaborators can build in one day.
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

The following ideas are **must-have** for the demo:

- hybrid retrieval, using RAG by default and graph-based reasoning where it helps,
- role-linked ownership and access control,
- provenance and version history,
- freshness / deprecation states,
- knowledge-gap detection and routing,
- a visible user experience that explains why an answer is trusted.

The following are **stretch goals** if the core slice is stable:

- living answer cards,
- topic coverage heatmap,
- handover mode,
- contradiction detection,
- trusted bookmarks / canonical answers,
- meeting-memory enrichment.

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

**Owns:** the visible product experience, integration glue, and demo readiness.

**Purpose:** turn the backend into something a judge can understand in 30 seconds.

**Responsibilities:**

1. Build the search/ask interface.
2. Render answer cards with citations, role owner, freshness, and provenance.
3. Show access-aware behavior clearly.
4. Show a knowledge-gap action that routes unresolved questions.
5. Prepare the demo script and fallback paths.
6. Act as integration captain after the first checkpoint so merges stay coordinated.

**Definition of done:**

- the demo can be shown end-to-end without explanation from code,
- trust signals are visible in the UI,
- the gap-routing flow is clickable or at least visibly represented,
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

### Step 2: Decide the MVP boundary

Use this rule:

- if a feature does not help the demo show trust, governance, or role-based knowledge flow, it is a stretch goal.

### Step 3: Freeze the implementation stack

Pick the stack the team already knows best. Do not spend more than 30 minutes debating framework choices, database choices, or search backend choices.

The reason is simple:

- the demo is won by product clarity and trust, not by stack novelty,
- parallel work only works if the interfaces are frozen quickly,
- a known stack reduces integration risk inside the 24-hour window.

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

### Collaborator B tasks

1. Write the role schema and role group mapping.
2. Define the provenance and freshness fields.
3. Define the gap ticket structure.
4. Add the access rules that filter records by role group.

### Collaborator C tasks

1. Build the query path.
2. Implement the retrieval ranking logic.
3. Wire in citations and answer assembly.
4. Add a weak-evidence fallback that creates a gap instead of guessing.

### Collaborator D tasks

1. Build the UI skeleton.
2. Wire in the query input and answer panel.
3. Create placeholder states for citations, freshness, and ownership.
4. Prepare the demo shell and the sample prompts.

## 4. First Integration Checkpoint

At the first integration point, verify only the interfaces, not perfection.

### Integration checklist

1. Can a source record produced by A be consumed by C?
2. Can B’s role filter hide content from the wrong role?
3. Can C show citations and provenance fields from B?
4. Can D render the answer without custom glue for every new field?

If any answer is no, stop and fix the contract before adding new features.

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
