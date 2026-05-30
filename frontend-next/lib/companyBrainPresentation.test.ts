import assert from "node:assert/strict";
import test from "node:test";

import {
  describeAnswerMode,
  formatMetadataList,
  getConfidenceTone,
  getGapSignalLines,
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
