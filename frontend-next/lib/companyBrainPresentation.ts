import type {
  CompanyBrainAnswer,
  GapRouting,
  GapSignals,
  GraphDebug,
} from "../types/companyBrain";

type AnswerMode = {
  label: string;
  detail: string;
};

function formatSignalCounts(counts: Record<string, unknown>): string {
  return Object.entries(counts)
    .map(([label, value]) => `${label} ${String(value)}`)
    .join(", ");
}

export function getConfidenceTone(confidence: string | undefined): "high" | "medium" | "low" {
  const normalized = confidence?.toLowerCase();
  if (normalized === "high") {
    return "high";
  }
  if (normalized === "medium") {
    return "medium";
  }
  return "low";
}

export function describeAnswerMode(graph?: GraphDebug): AnswerMode {
  if (graph?.used_graph) {
    return {
      label: "Graph-expanded answer",
      detail: "Cross-document context was added from connected knowledge.",
    };
  }

  return {
    label: "Vector answer",
    detail: "The answer was synthesized from directly retrieved source chunks.",
  };
}

export function formatMetadataList(
  values: string[] | undefined,
  fallback = "Unknown",
): string {
  if (!values?.length) {
    return fallback;
  }
  return values.join(", ");
}

export function getGapSignalLines(
  gap?: Pick<GapRouting, "signals"> | null,
): string[] {
  const signals = gap?.signals as GapSignals | undefined;
  const lines: string[] = [];

  if (signals?.entity_role_counts && Object.keys(signals.entity_role_counts).length) {
    lines.push(
      `Question signals: ${formatSignalCounts(signals.entity_role_counts)}`,
    );
  }

  if (signals?.chunk_role_counts && Object.keys(signals.chunk_role_counts).length) {
    lines.push(
      `Retrieved chunk owners: ${formatSignalCounts(signals.chunk_role_counts)}`,
    );
  }

  return lines;
}

export function getPrimaryOwner(answer: CompanyBrainAnswer | null): string {
  return answer?.gap_routing?.routed_to || answer?.role_owner || "Master Data Ops";
}
