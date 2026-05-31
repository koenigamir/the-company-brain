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

export type RoleCatalogEntry = {
  name: string;
  description: string;
  tags: string[];
};

export const ROLE_CATALOG: RoleCatalogEntry[] = [
  {
    name: "ESG Compliance",
    description:
      "Sustainability and ESG disclosure regulation: SFDR, EU Taxonomy, EET templates, sustainability data and disclosures.",
    tags: ["esg", "sfdr", "taxonomy", "eet", "sustainability"],
  },
  {
    name: "Master Data Ops",
    description:
      "Reference and master data: master data opening and mutations, instrument attributes, instrument classification, EMT reference data.",
    tags: [
      "master data",
      "reference data",
      "mutations",
      "attributes",
      "classification",
      "emt",
    ],
  },
  {
    name: "Tax Team",
    description:
      "Tax reporting and withholding: FATCA, qualified intermediary, withholding tax, Tax Navigator.",
    tags: [
      "fatca",
      "tax",
      "withholding",
      "qualified intermediary",
      "tax navigator",
    ],
  },
  {
    name: "Regulatory Services",
    description:
      "Regulatory interpretation and frameworks: MiFID II, MiFIR, product governance, suitability and complexity assessment, Regulatory Navigator.",
    tags: [
      "mifid",
      "mifir",
      "product governance",
      "suitability",
      "complexity",
      "regulatory navigator",
    ],
  },
  {
    name: "Product Coverage & Onboarding",
    description:
      "Instrument and product coverage, classification coverage, and onboarding of new products and instruments.",
    tags: ["product coverage", "coverage", "onboarding", "instruments"],
  },
  {
    name: "Compliance & Sanctions",
    description:
      "Financial crime and market integrity: AML, KYC, sanctions screening, and trade surveillance.",
    tags: ["aml", "kyc", "sanctions", "surveillance", "screening"],
  },
];

const ROLE_CATALOG_BY_NAME = new Map(
  ROLE_CATALOG.map((entry) => [entry.name, entry] as const),
);

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

export function formatClearanceLabel(clearance: string | undefined): string {
  const normalized = (clearance || "").trim().toLowerCase();
  if (!normalized) {
    return "Backend default";
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} clearance`;
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

export function normalizeAnswerText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/\\n/g, "\n")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\$\$?/g, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/\\mathbf\{([^}]*)\}/g, "$1")
    .replace(/\\operatorname\{([^}]*)\}/g, "$1")
    .replace(/\\\\/g, "\n")
    .trim();
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

export function getDocumentRoleList(document: CompanyBrainDocument): string[] {
  if (document.role_owners?.length) {
    return document.role_owners;
  }

  if (document.role_owner) {
    return [document.role_owner];
  }

  if (document.owner) {
    return [document.owner];
  }

  return [];
}

export function getDocumentOwners(document: CompanyBrainDocument): string {
  const roles = getDocumentRoleList(document);
  if (roles.length) {
    return roles.join(", ");
  }

  return "Unassigned";
}

export function getDocumentUpdated(document: CompanyBrainDocument): string {
  return (
    document.updated_at || document.last_updated || document.uploaded_at || "Unknown"
  );
}

export function getDocumentUpdatedLabel(document: CompanyBrainDocument): string {
  const value = getDocumentUpdated(document);
  if (value === "Unknown") {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function getDocumentTypeLabel(document: CompanyBrainDocument): string {
  const explicit = document.modality?.trim().toLowerCase();
  if (explicit && explicit !== "document") {
    return explicit.charAt(0).toUpperCase() + explicit.slice(1);
  }

  const source = getDocumentSource(document).toLowerCase();
  if (source.endsWith(".pdf")) {
    return "PDF";
  }
  if (source.endsWith(".xlsx") || source.endsWith(".xls") || source.endsWith(".csv")) {
    return "Spreadsheet";
  }
  if (source.endsWith(".docx") || source.endsWith(".doc")) {
    return "Document";
  }

  return "Document";
}

export function getDocumentVisibilitySummary(
  document: CompanyBrainDocument,
): string {
  if (document.visibility_roles?.includes("ALL")) {
    return "All roles";
  }

  if (document.visibility_roles?.length) {
    return document.visibility_roles.join(", ");
  }

  return "Backend default";
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

export function getRoleCatalogEntry(roleName: string): RoleCatalogEntry {
  return (
    ROLE_CATALOG_BY_NAME.get(roleName) || {
      name: roleName,
      description: "Role description is not yet available in the frontend catalog.",
      tags: [],
    }
  );
}

export function countDocumentsForRole(
  documents: CompanyBrainDocument[],
  roleName: string,
): number {
  return documents.filter((document) =>
    getDocumentRoleList(document).includes(roleName),
  ).length;
}

export function getPrimaryOwner(answer: CompanyBrainAnswer | null): string {
  return getRoutedRoles(answer)[0] || "Master Data Ops";
}
