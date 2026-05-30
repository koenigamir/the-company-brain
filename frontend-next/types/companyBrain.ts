export type GraphDebug = {
  entities_detected?: string[];
  entities_expanded?: string[];
  relation_paths?: string[];
  graph_added_files?: string[];
  used_graph?: boolean;
};

export type GapSignals = {
  entity_role_counts?: Record<string, number>;
  chunk_role_counts?: Record<string, number>;
  entities_detected?: string[];
  entity_suggested_role?: string;
  max_chunk_role?: string;
  [key: string]: unknown;
};

export type GapRouting = {
  routed_to?: string;
  reason?: string;
  routing_confidence?: string;
  signals?: GapSignals;
  graph_entities?: string[];
};

export type CompanyBrainAnswer = {
  title: string;
  summary: string;
  confidence: "High" | "Medium" | "Low" | string;
  sources: string[];
  role_owner: string;
  last_updated_dates?: string[];
  graph?: GraphDebug;
  gap_routing?: GapRouting;
};

export type HealthResponse = {
  ok: boolean;
  data_dir: string;
  chroma_dir: string;
  graph_path: string;
  data_dir_exists: boolean;
  chroma_dir_exists: boolean;
  graph_exists: boolean;
  collection_name: string;
};

export type CompanyBrainIngestResult = {
  ok: boolean;
  filename: string;
  chunks?: number;
  role_owner?: string;
  entities?: string[];
  error?: string;
};
