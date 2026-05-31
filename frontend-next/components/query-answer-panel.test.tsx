import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { CompanyBrainAnswer } from "../types/companyBrain";
import { QueryAnswerPanel } from "./query-answer-panel";

const answer: CompanyBrainAnswer = {
  title: "Coverage answer",
  short_answer: "\\text{Coverage is } $High$",
  detailed_answer: "\\text{Detailed review} \\\\ second line",
  confidence: "High",
  sources: ["sfdr-guide.pdf"],
  role_owner: "ESG Compliance",
  last_updated_dates: ["2026-05-30"],
  graph: {
    used_graph: true,
    entities_detected: ["SFDR"],
    entities_expanded: ["ESG"],
    relation_paths: ["SFDR -> ESG"],
  },
  gap_routing: {
    routed_to: "Regulatory Services",
    reason: "Need follow-up with the owning team.",
    routing_confidence: "Medium",
  },
};

test("QueryAnswerPanel hides extended details behind a More information button", () => {
  const markup = renderToStaticMarkup(
    <QueryAnswerPanel
      answer={answer}
      isCreatingTicket={false}
      onCreateTicket={() => {}}
      onToggleMore={() => {}}
      question="What is covered?"
      showMore={false}
      ticketCreated={false}
    />,
  );

  assert.match(markup, /Coverage is\s+High/);
  assert.match(markup, /More information/);
  assert.doesNotMatch(markup, /Detailed answer/);
  assert.doesNotMatch(markup, /Knowledge graph trace/);
});

test("QueryAnswerPanel reveals the full answer trail when expanded", () => {
  const markup = renderToStaticMarkup(
    <QueryAnswerPanel
      answer={answer}
      isCreatingTicket={false}
      onCreateTicket={() => {}}
      onToggleMore={() => {}}
      question="What is covered?"
      showMore
      ticketCreated={false}
    />,
  );

  assert.match(markup, /Hide more information/);
  assert.match(markup, /Detailed answer/);
  assert.match(markup, /Knowledge graph trace/);
  assert.match(markup, /Need follow-up with the owning team/);
});

test("QueryAnswerPanel surfaces access restrictions and viewer context", () => {
  const markup = renderToStaticMarkup(
    <QueryAnswerPanel
      answer={{
        ...answer,
        access_notice:
          "Some relevant sources were hidden because the selected viewer does not have access.",
        restricted_source_count: 2,
        viewer_account: {
          id: "standard-employee",
          label: "Standard employee",
          department_role: "Regulatory Services",
          clearance: "standard",
          global_access: false,
        },
      }}
      isCreatingTicket={false}
      onCreateTicket={() => {}}
      onToggleMore={() => {}}
      question="What is covered?"
      showMore
      ticketCreated={false}
    />,
  );

  assert.match(markup, /Some relevant sources were hidden/);
  assert.match(markup, /Viewer account/);
  assert.match(markup, /Standard employee/);
  assert.match(markup, /Restricted sources/);
  assert.match(markup, />2</);
});
