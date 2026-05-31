import assert from "node:assert/strict";
import test from "node:test";

import type { CompanyBrainDocument } from "../types/companyBrain";
import {
  buildGapTicketRequest,
  describeAnswerMode,
  formatMetadataList,
  countDocumentsForRole,
  getConfidenceTone,
  getDocumentRoleList,
  getDocumentOwners,
  getDocumentSource,
  getGapSignalLines,
  normalizeAnswerText,
  getRoutedRoles,
} from "./companyBrainPresentation";

test("describeAnswerMode reports graph expansion when graph context was used", () => {
  assert.deepEqual(
    describeAnswerMode({
      used_graph: true,
      graph_added_files: ["sfdr-guide.pdf"],
    }),
    {
      label: "Graph-expanded answer",
      detail: "Cross-document context was added from connected knowledge.",
    },
  );
});

test("document access helpers summarize visibility scope and clearance", async () => {
  const presentationExports = (await import("./companyBrainPresentation")) as Record<
    string,
    unknown
  >;
  const getDocumentVisibilitySummary = presentationExports.getDocumentVisibilitySummary as
    | ((document: CompanyBrainDocument) => string)
    | undefined;
  const formatClearanceLabel = presentationExports.formatClearanceLabel as
    | ((clearance: string | undefined) => string)
    | undefined;

  assert.equal(typeof getDocumentVisibilitySummary, "function");
  assert.equal(typeof formatClearanceLabel, "function");
  assert.equal(
    getDocumentVisibilitySummary?.({
      source_file: "governance.pdf",
      visibility_roles: ["ALL"],
    }),
    "All roles",
  );
  assert.equal(
    getDocumentVisibilitySummary?.({
      source_file: "tax.pdf",
      visibility_roles: ["Tax Team", "Regulatory Services"],
    }),
    "Tax Team, Regulatory Services",
  );
  assert.equal(formatClearanceLabel?.("senior"), "Senior clearance");
});

test("describeAnswerMode falls back to vector mode when no graph expansion happened", () => {
  assert.deepEqual(describeAnswerMode(), {
    label: "Vector answer",
    detail: "The answer was synthesized from directly retrieved source chunks.",
  });
});

test("getConfidenceTone normalizes known and unknown confidence values", () => {
  assert.equal(getConfidenceTone("High"), "high");
  assert.equal(getConfidenceTone("Medium"), "medium");
  assert.equal(getConfidenceTone("Low"), "low");
  assert.equal(getConfidenceTone("Unknown"), "low");
});

test("formatMetadataList joins values and preserves fallback text", () => {
  assert.equal(formatMetadataList(["FATCA.pdf", "SFDR.docx"]), "FATCA.pdf, SFDR.docx");
  assert.equal(formatMetadataList([], "No sources yet"), "No sources yet");
  assert.equal(formatMetadataList(undefined, "Unknown"), "Unknown");
});

test("getGapSignalLines summarizes routing signals for the UI", () => {
  assert.deepEqual(
    getGapSignalLines({
      signals: {
        entity_role_counts: { "ESG Compliance": 2 },
        chunk_role_counts: { "Master Data Ops": 3 },
      },
    }),
    [
      "Question signals: ESG Compliance 2",
      "Retrieved chunk owners: Master Data Ops 3",
    ],
  );
});

test("getRoutedRoles prefers explicit routed roles before falling back", () => {
  assert.deepEqual(
    getRoutedRoles({
      title: "Gap",
      short_answer: "Missing coverage.",
      confidence: "Low",
      sources: [],
      role_owner: "Master Data Ops",
      gap_routing: {
        routed_to: "Regulatory Services",
        routed_roles: ["Regulatory Services", "Tax Team"],
      },
    }),
    ["Regulatory Services", "Tax Team"],
  );

  assert.deepEqual(
    getRoutedRoles({
      title: "Fallback",
      short_answer: "Fallback coverage.",
      confidence: "Low",
      sources: [],
      role_owner: "Master Data Ops",
    }),
    ["Master Data Ops"],
  );
});

test("document helpers favor canonical backend document fields", () => {
  assert.equal(
    getDocumentSource({
      source_file: "sfdr-guide.pdf",
      filename: "ignored.pdf",
    }),
    "sfdr-guide.pdf",
  );

  assert.equal(
    getDocumentOwners({
      role_owners: ["ESG Compliance", "Regulatory Services"],
      role_owner: "Master Data Ops",
    }),
    "ESG Compliance, Regulatory Services",
  );

  assert.deepEqual(
    getDocumentRoleList({
      role_owners: ["ESG Compliance", "Regulatory Services"],
    }),
    ["ESG Compliance", "Regulatory Services"],
  );
});

test("buildGapTicketRequest preserves the backend gap object", () => {
  const request = buildGapTicketRequest(
    "What is missing?",
    {
      title: "Gap",
      short_answer: "Coverage is incomplete.",
      confidence: "Low",
      sources: [],
      role_owner: "Master Data Ops",
      missing_topics: ["Bangladesh framework"],
      gap_ticket_draft: "Drafted ticket body",
      gap_routing: {
        routed_to: "Regulatory Services",
        routed_roles: ["Regulatory Services"],
        reason: "The missing topic is regulatory.",
        routing_confidence: "High",
      },
    },
  );

  assert.equal(request.question, "What is missing?");
  assert.deepEqual(request.gap, {
    routed_to: "Regulatory Services",
    routed_roles: ["Regulatory Services"],
    reason: "The missing topic is regulatory.",
    routing_confidence: "High",
  });
  assert.equal(request.body, "Drafted ticket body");
  assert.deepEqual(request.missing_topics, ["Bangladesh framework"]);
});

test("normalizeAnswerText removes common latex wrappers for plain display", () => {
  assert.equal(
    normalizeAnswerText("\\text{Coverage is } $High$ \\n\\(reviewed\\)"),
    "Coverage is  High \nreviewed",
  );
});

test("countDocumentsForRole handles multi-owner documents", () => {
  assert.equal(
    countDocumentsForRole(
      [
        { source_file: "a.pdf", role_owners: ["ESG Compliance", "Tax Team"] },
        { source_file: "b.pdf", role_owner: "Tax Team" },
        { source_file: "c.pdf", role_owner: "Master Data Ops" },
      ],
      "Tax Team",
    ),
    2,
  );
});
