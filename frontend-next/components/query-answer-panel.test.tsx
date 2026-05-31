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

test("QueryAnswerPanel hides content details when all relevant sources are restricted", () => {
  const markup = renderToStaticMarkup(
    <QueryAnswerPanel
      answer={{
        ...answer,
        short_answer: "No accessible company answer was found.",
        detailed_answer: "Hidden confidential details should not render.",
        sources: [],
        last_updated_dates: [],
        graph: {
          used_graph: true,
          entities_detected: ["Confidential tax workflow"],
          entities_expanded: ["Restricted filing"],
        },
        access_notice:
          "Relevant company information exists but is restricted for this demo account.",
        restricted_source_count: 1,
        viewer_account: {
          id: "intern-general",
          label: "Intern",
          department_role: null,
          clearance: "intern",
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

  assert.match(markup, /Relevant company information exists but is restricted/);
  assert.match(markup, /Viewer account/);
  assert.match(markup, /Intern/);
  assert.doesNotMatch(markup, /Hidden confidential details should not render/);
  assert.doesNotMatch(markup, /Knowledge graph trace/);
  assert.doesNotMatch(markup, /<dt>Owner<\/dt>/);
  assert.doesNotMatch(markup, /<dt>Sources<\/dt>/);
  assert.doesNotMatch(markup, /<dt>Updated<\/dt>/);
});
