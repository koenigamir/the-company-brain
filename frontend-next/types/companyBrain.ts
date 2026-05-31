export type GraphDebug = {
  entities_detected?: string[];
  entities_expanded?: string[];
  relation_paths?: string[];
  graph_added_files?: string[];
  used_graph?: boolean;
};

export type GapRouting = {
  routed_to?: string;
  routed_roles?: string[];
  reason?: string;
  routing_confidence?: string;
  signals?: Record<string, unknown>;
  graph_entities?: string[];
  [key: string]: unknown;
};

export type GapSignals = {
  entity_role_counts?: Record<string, number>;
  chunk_role_counts?: Record<string, number>;
};

export type CompanyBrainAnswer = {
  title: string;
  short_answer: string;
  detailed_answer?: string;
  summary?: string;
  confidence: "High" | "Medium" | "Low" | string;
  used_llm_knowledge?: boolean;
  sources: string[];
  role_owner: string;
  gap_required?: boolean;
  missing_topics?: string[];
  gap_ticket_draft?: string;
  last_updated_dates?: string[];
  graph?: GraphDebug;
  gap_routing?: GapRouting;
};

export type HealthResponse = {
  ok: boolean;
  data_dir: string;
  chroma_dir: string;
  graph_path: string;
  store_dir: string;
  data_dir_exists: boolean;
  chroma_dir_exists: boolean;
  graph_exists: boolean;
  store_dir_exists: boolean;
  collection_name: string;
};

export type RolesResponse = {
  roles: string[];
  backend: "local" | "supabase" | string;
};

export type CompanyBrainDocument = {
  id?: string;
  source_file?: string;
  filename?: string;
  source?: string;
  role_owners?: string[];
  role_owner?: string;
  owner?: string;
  uploaded_at?: string;
  last_updated?: string;
  updated_at?: string;
  chunks?: number;
  modality?: string;
  status?: string;
  [key: string]: unknown;
};

export type DocumentsResponse = {
  documents: CompanyBrainDocument[];
};

export type GapTicketRequest = {
  question: string;
  gap: GapRouting | Record<string, unknown>;
  body?: string;
  missing_topics?: string[];
};

export type GapTicketResponse = {
  ok?: boolean;
  ticket?: Record<string, unknown>;
  tickets?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type QueryRequest = {
  question: string;
  history?: Array<Record<string, string>>;
};

export type CompanyBrainIngestResult = {
  ok?: boolean;
  filename?: string;
  source_file?: string;
  chunks?: number;
  role_owners?: string[];
  role_owner?: string;
  role_reason?: string;
  owner?: string;
  entities?: string[];
  modality?: string;
  extractor?: string;
  extraction_confidence?: number | null;
  updated_at?: string;
  last_updated?: string;
  message?: string;
  [key: string]: unknown;
};
