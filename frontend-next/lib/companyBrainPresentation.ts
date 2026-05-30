import type {
  CompanyBrainAnswer,
  CompanyBrainDocument,
  GapTicketRequest,
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

export function getRoutedRoles(answer: CompanyBrainAnswer | null): string[] {
  const routedRoles = answer?.gap_routing?.routed_roles;
  if (routedRoles?.length) {
    return routedRoles;
  }

  if (answer?.gap_routing?.routed_to) {
    return [answer.gap_routing.routed_to];
  }

  if (answer?.role_owner) {
    return [answer.role_owner];
  }

  return ["Master Data Ops"];
}

export function getDocumentSource(document: CompanyBrainDocument): string {
  return (
    document.source_file ||
    document.filename ||
    document.source ||
    document.id ||
    "Unknown source"
  );
}

export function getDocumentOwners(document: CompanyBrainDocument): string {
  if (document.role_owners?.length) {
    return document.role_owners.join(", ");
  }

  return document.role_owner || document.owner || "Unassigned";
}

export function getDocumentUpdated(document: CompanyBrainDocument): string {
  return (
    document.updated_at || document.last_updated || document.uploaded_at || "Unknown"
  );
}

export function buildGapTicketRequest(
  question: string,
  answer: CompanyBrainAnswer,
): GapTicketRequest {
  const routedRoles = getRoutedRoles(answer);
  const gap = answer.gap_routing
    ? {
        ...answer.gap_routing,
        routed_roles:
          answer.gap_routing.routed_roles?.length
            ? answer.gap_routing.routed_roles
            : routedRoles,
        routed_to: answer.gap_routing.routed_to || routedRoles[0],
      }
    : {
        routed_to: routedRoles[0],
        routed_roles: routedRoles,
        reason:
          answer.missing_topics?.length
            ? `Missing company coverage for: ${answer.missing_topics.join(", ")}.`
            : "Knowledge gap review requested.",
        routing_confidence: answer.confidence,
      };

  return {
    question: question.trim(),
    gap,
    body:
      answer.gap_ticket_draft ||
      gap.reason ||
      "Knowledge gap review requested.",
    missing_topics: answer.missing_topics || [],
  };
}

export function getPrimaryOwner(answer: CompanyBrainAnswer | null): string {
  return getRoutedRoles(answer)[0] || "Master Data Ops";
}
