# Multimodal Ingestion Model Research

Date: 2026-05-30

## Scope

This note answers one concrete question for this repo:

How should the project ingest mixed enterprise content such as PDFs, Word files, spreadsheets, emails, images, screenshots, audio, and video, and normalize all of it into one governed structure that can feed the current Company Brain workflow?

The main constraint is quality. The ingestion path should optimize for reliable extraction, traceability, and grounded downstream answers, not just "supporting many file types."

Additional constraint from the team:

- the project currently has about `100 CHF` in AWS credits for the next two days,
- the project is tiny,
- so the preferred design is one that preserves quality without creating a permanent GPU burn rate.

## Current Repo Reality

The current codebase is a small RAG prototype:

- `ingest.py` extracts text, chunks it, and stores each chunk as `Document(page_content, metadata={source_file, role_owner, last_updated})`.
- `rag_engine.py` retrieves from Chroma with `sentence-transformers/all-MiniLM-L6-v2` and asks Claude to synthesize a wiki answer.
- `app.py` shows a Streamlit UI with confidence and gap-routing behavior.

Important repo-specific findings:

- The current prototype is text-first, not multimodal.
- The current metadata is too thin for real governance and provenance.
- `ingest.py` already contains one useful signal: it does not trust file extensions and tries PDF parsing first.
- `research/step_by_step_procedure.md` already defines a much richer normalization target: `source record`, `chunk record`, `role record`, `provenance record`, `permission rule`, and `gap ticket`.

That means the right next step is not "replace the whole system with one giant multimodal model." The right step is to add a proper multimodal normalization layer in front of the current retrieval and answering flow.

## Executive Recommendation

### Recommended architecture

Use a staged multimodal pipeline, not a single end-to-end model:

1. Modality-specific extraction
2. LLM-based normalization into one canonical JSON structure
3. Quality scoring, fallback extraction, and provenance capture
4. Retrieval indexing from normalized artifacts
5. Answer synthesis from normalized and cited evidence

This is the best fit for this repo because:

- it preserves the current `ingest -> index -> retrieve -> synthesize` shape,
- it upgrades quality without forcing a full architecture reset,
- it supports the richer normalized contract already described in `research/step_by_step_procedure.md`,
- it keeps answer generation separate from extraction, which is better for auditability.

### Best overall recommendation

For this repo, the strongest path is a hybrid:

- open-source multimodal extraction and normalization on AWS SageMaker or vLLM-hosted GPUs,
- existing Claude-based answer synthesis kept in place initially,
- better embeddings and reranking added before changing the user-facing retrieval flow.

In short:

- use open-source models for ingestion and structuring,
- keep the current answer model for now,
- upgrade the index quality and metadata model,
- only move to fully multimodal retrieval where the corpus actually needs it.

### Budget reality: 100 CHF in AWS credits

`100 CHF` is enough for a two-day prototype if the team uses batch ingestion and turns expensive compute off when it is idle.

It is not "infinite" if the team leaves large multimodal GPU endpoints running continuously.

Safe budget patterns:

- run ingestion as one-off or scheduled batch jobs,
- use local parsing first for documents,
- use AWS-native per-page or per-second services only where they add clear value,
- use Bedrock on-demand or batch inference rather than provisioned throughput,
- only spin up GPU inference when you are actively normalizing hard visual content.

Risky budget patterns:

- persistent `32B` VLM endpoints,
- always-on self-hosted multimodal inference,
- introducing heavyweight search infrastructure too early,
- paying external non-AWS APIs when AWS credits are available for an equivalent managed step.

Practical implication:

For today and tomorrow, the best cost-quality shape is:

- parse most docs locally or cheaply,
- reserve expensive multimodal reasoning for the minority of hard pages, images, or video segments,
- keep retrieval infra simple.

## Why A Single Multimodal LLM Is The Wrong Default

It is tempting to send every file directly into one multimodal LLM and ask for JSON. That will work for demos, but it is not the best quality architecture.

Problems with the single-model approach:

- extraction errors are hard to isolate,
- tables, layouts, timestamps, speakers, and attachments are easier to lose,
- provenance becomes vague,
- confidence is hard to measure,
- reprocessing one step requires rerunning everything,
- governance metadata is not naturally produced unless the pipeline is explicitly structured for it.

The LLM should be the normalizer and reasoning layer, not the only parser.

## Recommended Normalized Structure

The normalization target should follow the repo's existing research direction, not the current thin Chroma metadata.

Recommended minimum records:

- `source record`
- `chunk record`
- `role record`
- `provenance record`
- `permission rule`
- `gap ticket`

Recommended additions for multimodal quality:

- `source_modality`
- `extractor_name`
- `extractor_version`
- `extraction_confidence`
- `page_ref` or `time_ref`
- `speaker_id`
- `ocr_boxes`
- `table_refs`
- `image_refs`
- `content_hash`
- `raw_uri`
- `derived_uri`

Example modality mapping:

| Modality | Normalized output |
| --- | --- |
| PDF / DOCX | page-aware text blocks, headings, tables, images, layout metadata |
| Spreadsheet | sheet, table, row/column header structure, extracted business fields |
| Email | subject, sender, recipients, thread id, body, attachment links |
| Image / screenshot | OCR text, caption, detected entities, optional bounding boxes |
| Audio | transcript segments, timestamps, speakers, confidence |
| Video | transcript segments, OCR from frames, keyframe captions, scene/time references |

## Model And Tool Recommendations By Stage

### 1. Document parsing and OCR

Recommended stack:

- `Docling` as the default parser
- `DeepSeek-OCR-2` or `MinerU` as fallback for difficult scans / layout-heavy pages

Why:

- Docling already supports diverse input formats and exports structured JSON, Markdown, HTML, and WebVTT.
- Docling also supports audio and video into the same `DoclingDocument` intermediate representation.
- DeepSeek-OCR-2 is a strong specialist OCR/VLM option for difficult visual text extraction.
- MinerU is built specifically for converting PDF, image, DOCX, PPTX, and XLSX into machine-readable Markdown and JSON.

Recommended usage pattern:

- Pass standard office docs and regular PDFs through Docling first.
- If page-level extraction quality is low, fall back to DeepSeek-OCR-2 or MinerU on those pages only.
- Store both the chosen extractor and fallback history in provenance.

Why this fits the repo:

- It replaces the current `extract_text(path)` function with a richer `extract_artifact(path)` step.
- It keeps the existing idea of "do not trust extensions" but makes it production-grade.

### 2. Images, screenshots, charts, and scanned pages

Recommended open-source VLM:

- `Qwen3-VL-32B-Instruct`

Why:

- As of May 30, 2026, Qwen's official model card presents Qwen3-VL as the strongest VLM in the Qwen line.
- It explicitly claims stronger OCR, long-context handling, video understanding, and improved long-document structure parsing.
- It is Apache-2.0 licensed and has straightforward `transformers`, `vLLM`, and `SGLang` serving paths.

Lower-cost fallback:

- `Qwen2.5-VL-32B-Instruct`

When to use the VLM:

- screenshots,
- charts and slide pages,
- scans where OCR alone is weak,
- images that carry meaning through layout or visual cues,
- structured extraction to JSON when text extraction alone is ambiguous.

Important note:

Do not use the VLM as the first parser for every document page. Use it where visual reasoning adds value.

### 3. Audio and video transcription

Recommended open-source stack:

- `openai/whisper-large-v3`
- `WhisperX` for word-level timestamps
- `pyannote/speaker-diarization-community-1` via `pyannote.audio` for speakers

Why:

- Whisper large-v3 remains a strong open ASR baseline and is easy to run in Transformers.
- WhisperX adds time-accurate alignment and integrates diarization flows.
- pyannote provides a maintained open-source diarization pipeline.

Recommended output:

- transcript segments,
- word or sentence timestamps,
- speaker labels,
- per-segment confidence,
- media URI,
- optional frame-level OCR / captions for high-value segments.

For video specifically:

- do not rely only on transcript text,
- sample keyframes or scene cuts,
- run OCR and captioning on selected frames,
- merge transcript + frame text + caption into the normalized chunk set.

### 4. Multimodal embeddings and retrieval

If the system stays mostly text-first:

- `BAAI/bge-m3` for first-stage retrieval
- `Alibaba-NLP/gte-reranker-modernbert-base` for reranking

Why:

- `bge-m3` supports dense, sparse, and multi-vector retrieval patterns.
- `gte-reranker-modernbert-base` is strong on long-document reranking and easy to deploy with Hugging Face TEI.

If the system needs true cross-modal retrieval:

- `Qwen3-VL-Embedding-8B`
- `Qwen3-VL-Reranker-2B` or `Qwen3-VL-Reranker-8B`

Why:

- Qwen explicitly positions these as an end-to-end multimodal retrieval and ranking stack for text, images, screenshots, and video.
- The 8B reranker is the highest-quality option in that family; the 2B reranker is the lower-cost option.

Repo-specific guidance:

- Short term: replace `all-MiniLM-L6-v2` first. That is the easiest quality win.
- Mid term: add multimodal embeddings only for modalities that need cross-modal retrieval.
- Do not force every source type into one retrieval path immediately.

### 5. Visual document retrieval for layout-heavy corpora

Recommended optional layer:

- `ColQwen2` / `ColPali` style visual retrieval
- `VisRAG` as a reference implementation

Why:

- These approaches retrieve from page images directly instead of depending entirely on OCR text.
- This is useful for forms, slides, charts, screenshots, and visually structured compliance documents.

Important limitation for this repo:

This is excellent for retrieval quality, but it does not replace normalization. The project still needs a canonical structured representation for governance, ownership, and gap routing.

So the right use is:

- visual retrieval as an additional evidence path,
- not as the only canonical store.

### 6. Managed parsing and document AI APIs

These are not open-source, but they are real options and some are strong:

- `Mistral OCR`
- `LlamaParse`
- `Unstructured API`
- `OpenAI file inputs`

Why they matter:

- they can reduce implementation time,
- they often handle tables and layout better than basic local PDF extraction,
- some of them support structured outputs directly.

What each is good at:

- `Mistral OCR`: strong structured OCR for PDFs and office documents, with markdown output and confidence scores.
- `LlamaParse`: parsing-oriented managed service built for LLM pipelines, including structured output and spreadsheet/document parsing.
- `Unstructured`: both open-source and hosted/API modes, with broad support for document and email formats and configurable local vs API partitioning.
- `OpenAI file inputs`: useful when you want one API to read PDFs, documents, and spreadsheets; PDFs include both extracted text and page images, while spreadsheets use a spreadsheet-specific augmentation flow.

Why these are not my primary recommendation here:

- they add non-AWS spend unless you route through AWS-hosted alternatives,
- they reduce control relative to a self-hosted normalization path,
- they are good implementation options, but not necessarily the best answer to "open-source on AWS."

### 7. Retrieval backends and index options

The earlier memo focused mostly on models. That was incomplete. The retrieval backend is also a major design choice.

Real options:

- keep `Chroma` for the tiny prototype,
- move to `OpenSearch Serverless`,
- use `Qdrant`,
- use `pgvector` on Postgres / Aurora,
- use a graph-backed system alongside the vector index.

My view for this repo:

- `Chroma` is acceptable for the current tiny prototype, but weak for long-term hybrid retrieval, governance filters, and scale.
- `OpenSearch Serverless` is the strongest AWS-native search option if the team wants hybrid lexical + vector + metadata filtering. It supports vector collections, neural search, and hybrid queries.
- `Qdrant` is a strong alternative if the team wants a cleaner vector-first engine with hybrid and multivector support, and lighter operational overhead than a full OpenSearch design.
- `pgvector` is viable if the team wants the simplest operational shape and already expects relational metadata to matter more than fancy ANN tuning.

Budget note:

- `OpenSearch Serverless` is powerful, but for a very small two-day demo it may be more infrastructure than needed.
- For the hackathon window, a local or simple hosted vector store is more cost-efficient unless hybrid relevance becomes the bottleneck.

### 8. Additional embedding options

The previous recommendation favored `bge-m3` and Qwen's multimodal retrieval stack. Those are not the only credible options.

Other real options:

- `Cohere Embed v4` on Bedrock
- `Amazon Nova Multimodal Embeddings`
- `Voyage multimodal embeddings`

Where they fit:

- `Cohere Embed v4`: strong managed multimodal embedding option in Bedrock for interleaved text and image content.
- `Amazon Nova Multimodal Embeddings`: AWS-native cross-modal embedding model for text, documents, images, video, and audio.
- `voyage-multimodal-3.5`: strong external managed multimodal embedding option for screenshots, PDFs, slides, and tables.

Why I still do not rank them first for this repo:

- they are good managed retrieval options, but they do not solve normalization on their own,
- some shift cost away from AWS credits,
- the repo's biggest current weakness is extraction and metadata quality, not only embedding quality.

## Broader Option Landscape

The answer to "are these all options?" is no.

The real landscape is:

1. AWS-native managed stack
2. Open-source self-hosted stack on AWS
3. External managed document AI APIs
4. Visual-retrieval-first systems
5. Hybrid structured pipeline with graph enrichment
6. Ultra-cheap local-first pipeline with selective cloud escalation

Those are all viable. They just optimize for different things.

What I would not recommend for this repo:

- a giant always-on multimodal endpoint from day one,
- a parsing-free visual retrieval system as the only source of truth,
- committing early to expensive serverless search infra before the normalized schema is stable.

## AWS Implementation Options

### Option A: Hybrid AWS path, recommended

Use:

- S3 for raw and derived artifacts
- SageMaker AI or GPU-backed inference with `vLLM` for open-source multimodal models
- current Claude answer synthesis kept in `rag_engine.py` initially
- Chroma short term, then hybrid retrieval later

Suggested model stack:

- Docling
- DeepSeek-OCR-2 fallback
- Whisper large-v3 + WhisperX + pyannote
- Qwen3-VL-32B-Instruct for visual normalization
- bge-m3 + gte-reranker-modernbert-base

Why this is the best fit:

- highest quality path without discarding the current repo,
- answer synthesis can stay stable while ingestion quality improves,
- AWS is used where it helps most: storage, orchestration, model hosting.

### Option B: Fully open-source on AWS

Use:

- S3
- SageMaker AI or EKS
- `vLLM` for Qwen and rerankers
- self-hosted vector store / hybrid search layer

Pros:

- maximum control,
- open-source model freedom,
- easier to specialize later.

Cons:

- more ops,
- more GPU management,
- harder for a small team on a short timeline.

Recommendation:

Use this only if "open-source on AWS" is a hard requirement, not just a preference.

### Option C: Bedrock-first managed path

Use:

- Amazon Bedrock Knowledge Bases
- Bedrock Data Automation (BDA)
- Nova Multimodal Embeddings or Cohere Embed v4
- optional Textract / Transcribe

Pros:

- fastest managed path,
- least infrastructure work,
- strong AWS-native story.

Cons:

- less control over the ingestion pipeline,
- less freedom to tune or swap specialist open-source models,
- Bedrock's own comparison docs note that BDA is text-based processing and that multimodal RAG support is limited relative to fully custom pipelines.

Recommendation:

Good for a quick managed prototype. Not my first choice if quality is the top priority and open-source hosting is acceptable.

### Option D: AWS-native specialist services

Use:

- Amazon Textract for OCR, forms, tables, and layout-heavy documents
- Amazon Transcribe for audio/video speech
- Bedrock or Claude/Nova for normalization and answer generation
- OpenSearch Serverless or a lighter vector backend for retrieval

Pros:

- very good fit for the `100 CHF` budget when the corpus is small,
- per-page and per-second pricing is easy to reason about,
- AWS Free Tier helps on Textract and Transcribe for small workloads,
- less engineering than self-hosted OCR and ASR.

Cons:

- not open-source,
- less customizable than the specialist open-source stack,
- visual reasoning over complex charts/screenshots still benefits from a stronger VLM layer.

Recommendation:

This is the strongest cost-aware AWS-only option for the next two days.

### Option E: External managed parser stack with AWS storage

Use:

- S3 for raw/derived artifacts
- LlamaParse, Mistral OCR, or Unstructured API for parsing
- current answer model and retrieval path

Pros:

- fastest path to high parsing quality,
- good for tables, office docs, and layout-heavy files,
- smallest implementation burden.

Cons:

- spend is outside AWS credits,
- introduces another vendor dependency,
- less aligned with the original "open source on AWS" idea.

Recommendation:

Reasonable fallback if the team hits local parsing quality issues and speed matters more than architectural purity.

### Option F: Ultra-cheap hackathon path

Use:

- local `Docling` or `Unstructured` for most documents,
- current Chroma store,
- current Claude answer synthesis,
- AWS only for difficult OCR pages and audio/video via Textract/Transcribe,
- no persistent GPU endpoints.

Pros:

- cheapest practical path,
- likely enough for the current corpus and timeline,
- uses AWS credits only where they actually help.

Cons:

- lower ceiling than the best open-source multimodal stack,
- weaker on visual-document reasoning unless escalated case by case.

Recommendation:

This is probably the best implementation path if the team wants to stay comfortably inside the two-day AWS credit budget.

## AWS Service Choice: Bedrock vs SageMaker

AWS's own decision guide is clear:

- use Bedrock when you want pre-trained model access with minimal infrastructure management,
- use SageMaker AI when you need deeper customization, custom deployment, and control.

For this project:

- Bedrock is good for answer synthesis and fast experimentation,
- SageMaker is the better fit for self-hosted open-source multimodal ingestion models.

That makes a mixed setup very reasonable.

## Budget-Aware Recommendation For The Next Two Days

If the goal is the best outcome under the current AWS credit constraint, I would rank the options like this:

1. `Option F` for the first working version
2. `Option D` if AWS-native services are preferred
3. `Option A` if the team specifically wants open-source model hosting on AWS
4. `Option E` only if parsing quality becomes the blocking issue

The reason is simple:

- the corpus is small,
- the time horizon is short,
- the main risk is not model availability,
- the main risk is wasting time and credits on infrastructure that the prototype does not yet need.

## Best Practical Model Stack For This Repo

### If quality is the top priority

Recommended stack:

- Parser: Docling
- Hard-doc fallback: DeepSeek-OCR-2
- Audio/video transcription: Whisper large-v3 + WhisperX + pyannote
- Vision-language normalization: Qwen3-VL-32B-Instruct
- Text retrieval: bge-m3
- Text reranking: gte-reranker-modernbert-base
- Optional multimodal retrieval: Qwen3-VL-Embedding-8B + Qwen3-VL-Reranker-2B/8B
- Answer synthesis: keep current Claude flow at first

Why this is the best overall answer:

- it is modular,
- it aligns with the repo's current structure,
- it separates extraction from answering,
- it supports high-quality provenance and fallback logic,
- it can be hosted on AWS without locking the team into one vendor-managed parser.

Budget caveat:

This stack is the highest-quality stack, but it should be run in an on-demand or batch style. It is not the right choice if the team means "leave a `32B` VLM endpoint up all weekend."

### If the team wants the simplest strong AWS-native version

Recommended stack:

- Textract for documents and tables
- Transcribe for audio/video
- Qwen3-VL-32B or Claude/Nova for normalization
- Cohere Embed v4 or Nova Multimodal Embeddings for retrieval
- Bedrock or existing Anthropic path for answer generation

This is simpler operationally, but less open and less flexible than the main recommendation.

### If the team wants the safest low-cost two-day prototype

Recommended stack:

- Parser: `Docling` locally first
- Alternative local parser: `Unstructured` for files where element-style partitioning helps
- Difficult OCR pages only: `Textract` or `Mistral OCR`
- Audio/video: `Transcribe` or local Whisper depending on media volume
- Retrieval: keep `Chroma` short term or move to `Qdrant` if reranking/hybrid experiments begin
- Answer synthesis: keep current Claude flow

Why:

- this path is cheap,
- it still improves data quality materially,
- it does not commit the team to high fixed infra costs,
- it preserves the option to introduce Qwen3-VL later only for the hard cases.

## How To Fit This Into The Current System

### Near-term changes

1. Replace `extract_text(path)` in `ingest.py` with modality-aware extraction that returns normalized records, not just raw text.
2. Write normalized outputs to `data/normalized/sources.json` and `data/normalized/chunks.json`.
3. Add provenance fields and extraction quality fields.
4. Replace random `role_owner` and `last_updated` generation with real metadata capture.
5. Upgrade embeddings from MiniLM to a better retrieval stack.

### Keep stable at first

- Keep `rag_engine.py` as the synthesis layer.
- Keep the UI behavior in `app.py`.
- Keep Chroma initially if speed matters more than perfect retrieval infrastructure.

### Medium-term changes

1. Add reranking before final context assembly.
2. Add hybrid retrieval, not vector-only retrieval.
3. Add role-based filtering before synthesis.
4. Add source freshness, version id, and extraction confidence to the answer card.
5. Add optional visual retrieval for slides, scanned pages, and screenshots.

## Quality Controls That Matter More Than Model Choice

Even the best model stack will fail if the pipeline is weak. These controls matter:

- Keep raw source and derived artifact together.
- Store page/time references for every chunk.
- Track extractor name, version, and confidence.
- Use fallback extraction when quality drops.
- Run low-confidence outputs through human review or a verification queue.
- Prefer structured records over one giant blob of extracted text.
- Rerank before synthesis.
- Make the answering model abstain when evidence is stale, thin, or conflicting.

The biggest quality mistake would be treating ingestion as "convert file to text and embed it."

## GitHub And Public Implementations Worth Studying

### Strong references

- `docling-project/docling`
  - Best reference for structured document conversion across formats.
- `opendatalab/MinerU`
  - Strong document parsing fallback for machine-readable Markdown/JSON.
- `deepseek-ai/DeepSeek-OCR`
  - Strong specialist OCR path and vLLM support.
- `QwenLM/Qwen3-VL`
  - Strong open-weight VLM family for visual normalization.
- `QwenLM/Qwen3-VL-Embedding`
  - Strong multimodal retrieval stack.
- `OpenBMB/VisRAG`
  - Best reference for parsing-free visual retrieval over document pages.
- `neo4j-labs/llm-graph-builder`
  - Strong reference for structured knowledge graph creation from mixed sources including PDFs, web pages, and YouTube videos.
- `vllm-project/vllm`
  - Practical serving layer for open-source multimodal models on AWS GPUs.

## Final Recommendation

If the team wants the best quality-to-practicality balance for this repo:

- do not build "one multimodal LLM that does everything,"
- build a multimodal normalization pipeline,
- host the open-source ingestion models on AWS SageMaker or `vLLM`,
- keep the current answer synthesis flow initially,
- upgrade retrieval quality and metadata fidelity before changing the frontend.

The best concrete first version is:

- Docling first,
- DeepSeek-OCR-2 fallback,
- Whisper large-v3 + WhisperX + pyannote for audio/video,
- Qwen3-VL-32B-Instruct for visual normalization to JSON,
- bge-m3 + gte-reranker-modernbert-base for retrieval quality,
- optional Qwen3-VL retrieval models later for image-heavy sources.

Under the current `100 CHF` AWS-credit constraint, I would slightly refine that:

- start with `Docling` or `Unstructured` locally,
- use `Textract` and `Transcribe` only where local extraction is weak or media-specific,
- keep retrieval simple,
- add Qwen3-VL only as an on-demand normalization tool for hard visual content,
- avoid persistent GPU serving unless the team proves that local and AWS-native specialist extractors are insufficient.

That path is the cleanest way to turn mixed enterprise content into one governed structure that this repo can actually use.

## Sources

- AWS Bedrock multimodal knowledge bases: <https://docs.aws.amazon.com/bedrock/latest/userguide/kb-multimodal.html>
- AWS Bedrock multimodal processing choices: <https://docs.aws.amazon.com/bedrock/latest/userguide/kb-multimodal-choose-approach.html>
- Amazon Nova multimodal embeddings: <https://docs.aws.amazon.com/nova/latest/nova2-userguide/embeddings.html>
- Cohere Embed v4 on Bedrock: <https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-embed-v4.html>
- AWS decision guide, Bedrock vs SageMaker AI: <https://docs.aws.amazon.com/decision-guides/latest/bedrock-or-sagemaker/bedrock-or-sagemaker.html>
- Amazon Textract `AnalyzeDocument`: <https://docs.aws.amazon.com/textract/latest/APIReference/API_AnalyzeDocument.html>
- Amazon Textract pricing: <https://aws.amazon.com/textract/pricing/>
- Amazon Transcribe diarization: <https://docs.aws.amazon.com/transcribe/latest/dg/diarization.html>
- Amazon Transcribe pricing: <https://aws.amazon.com/transcribe/pricing/>
- Amazon OpenSearch Serverless vector search: <https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html>
- Amazon OpenSearch Serverless neural and hybrid search: <https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-configure-neural-search.html>
- Docling overview: <https://docling-project.github.io/docling/>
- Docling supported formats: <https://docling-project.github.io/docling/usage/supported_formats/>
- Docling audio and video processing: <https://docling-project.github.io/docling/usage/processing_audio_media/>
- Unstructured partitioning: <https://docs.unstructured.io/open-source/core-functionality/partitioning>
- Unstructured partition configuration: <https://docs.unstructured.io/open-source/ingestion/ingest-configuration/partition-configuration>
- MinerU: <https://github.com/opendatalab/MinerU>
- MinerU ecosystem / MCP notes: <https://github.com/opendatalab/MinerU-Ecosystem>
- DeepSeek-OCR: <https://github.com/deepseek-ai/DeepSeek-OCR>
- DeepSeek-OCR-2 model card: <https://huggingface.co/deepseek-ai/DeepSeek-OCR-2>
- Mistral OCR docs: <https://docs.mistral.ai/studio-api/document-processing/basic_ocr>
- LlamaParse docs: <https://developers.llamaindex.ai/llamaparse/>
- Whisper large-v3: <https://huggingface.co/openai/whisper-large-v3>
- WhisperX: <https://github.com/m-bain/whisperX>
- pyannote.audio: <https://github.com/pyannote/pyannote-audio>
- Qwen3-VL-32B-Instruct: <https://huggingface.co/Qwen/Qwen3-VL-32B-Instruct>
- Qwen3-VL GitHub: <https://github.com/QwenLM/Qwen3-VL>
- Qwen2.5-VL-32B-Instruct: <https://huggingface.co/Qwen/Qwen2.5-VL-32B-Instruct>
- Qwen2.5-Omni GitHub: <https://github.com/QwenLM/Qwen2.5-Omni>
- Qwen3-VL-Embedding-8B: <https://huggingface.co/Qwen/Qwen3-VL-Embedding-8B>
- Qwen3-VL-Reranker-8B: <https://huggingface.co/Qwen/Qwen3-VL-Reranker-8B>
- Qwen3-VL retrieval paper page: <https://huggingface.co/papers/2601.04720>
- BGE-M3: <https://huggingface.co/BAAI/bge-m3>
- GTE reranker: <https://huggingface.co/Alibaba-NLP/gte-reranker-modernbert-base>
- Voyage multimodal embeddings: <https://docs.voyageai.com/docs/multimodal-embeddings>
- OpenAI file inputs: <https://developers.openai.com/api/docs/guides/file-inputs>
- ColPali paper page: <https://huggingface.co/papers/2407.01449>
- ColQwen2 docs: <https://huggingface.co/docs/transformers/model_doc/colqwen2>
- VisRAG: <https://github.com/OpenBMB/VisRAG>
- Neo4j LLM Graph Builder: <https://github.com/neo4j-labs/llm-graph-builder>
- vLLM supported models: <https://docs.vllm.ai/en/stable/models/supported_models/>
- AWS + vLLM serving on SageMaker / Bedrock blog: <https://aws.amazon.com/blogs/machine-learning/efficiently-serve-dozens-of-fine-tuned-models-with-vllm-on-amazon-sagemaker-ai-and-amazon-bedrock/>
