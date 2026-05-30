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
  data_dir_exists: boolean;
  chroma_dir_exists: boolean;
  graph_exists: boolean;
  store_dir?: string;
  store_dir_exists?: boolean;
  collection_name: string;
};
