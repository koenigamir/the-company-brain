import React from "react";

import {
  describeAnswerMode,
  formatClearanceLabel,
  formatMetadataList,
  getConfidenceTone,
  getGapSignalLines,
  getPrimaryOwner,
  getRoutedRoles,
  normalizeAnswerText,
} from "../lib/companyBrainPresentation";
import type { CompanyBrainAnswer, GraphDebug } from "../types/companyBrain";

type QueryAnswerPanelProps = {
  answer: CompanyBrainAnswer;
  question: string;
  showMore: boolean;
  onToggleMore: () => void;
  onCreateTicket: () => void;
  isCreatingTicket: boolean;
  ticketCreated: boolean;
};

type GraphTraceNode = {
  id: string;
  tone: "detected" | "expanded" | "context";
};

type GraphTraceEdge = {
  from: string;
  label: string;
  to: string;
};

function uniqueValues(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  );
}

function parseRelationPath(path: string): GraphTraceEdge[] {
  const parts = path
    .split(/\s*(?:->|→)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return [];
  }

  if (parts.length === 2) {
    return [{ from: parts[0], label: "connected to", to: parts[1] }];
  }

  const edges: GraphTraceEdge[] = [];
  for (let index = 0; index < parts.length - 2; index += 2) {
    edges.push({
      from: parts[index],
      label: parts[index + 1],
      to: parts[index + 2],
    });
  }
  return edges;
}

function buildGraphTrace(graph: GraphDebug | undefined): {
  nodes: GraphTraceNode[];
  edges: GraphTraceEdge[];
} {
  if (!graph) {
    return { nodes: [], edges: [] };
  }

  const detected = uniqueValues(graph.entities_detected || []);
  const expanded = uniqueValues(graph.entities_expanded || []);
  const edges = (graph.relation_paths || []).flatMap(parseRelationPath);

  if (!edges.length && detected.length && expanded.length) {
    edges.push({ from: detected[0], label: "expanded to", to: expanded[0] });
  }

  const nodeNames = uniqueValues([
    ...detected,
    ...expanded,
    ...edges.flatMap((edge) => [edge.from, edge.to]),
  ]);

  const nodes = nodeNames.map((id) => ({
    id,
    tone: detected.includes(id)
      ? "detected"
      : expanded.includes(id)
        ? "expanded"
        : "context",
  })) satisfies GraphTraceNode[];

  return { nodes, edges };
}

export function QueryAnswerPanel({
  answer,
  question,
  showMore,
  onToggleMore,
  onCreateTicket,
  isCreatingTicket,
  ticketCreated,
}: QueryAnswerPanelProps) {
  const answerMode = describeAnswerMode(answer.graph);
  const confidenceTone = getConfidenceTone(answer.confidence);
  const gapSignalLines = getGapSignalLines(answer.gap_routing);
  const routedRoles = getRoutedRoles(answer);
  const summary = normalizeAnswerText(answer.short_answer || answer.summary);
  const detailedAnswer = normalizeAnswerText(answer.detailed_answer);
  const isFullyRestricted =
    (answer.restricted_source_count ?? 0) > 0 && !(answer.sources?.length);
  const hasMoreInformation = Boolean(
    detailedAnswer ||
      answer.graph ||
      answer.gap_routing ||
      answer.sources?.length ||
      answer.last_updated_dates?.length ||
      answer.role_owner ||
      answer.viewer_account ||
      typeof answer.restricted_source_count === "number",
  );
  const viewerAccount = answer.viewer_account;
  const accessMode = viewerAccount?.global_access
    ? "Global access"
    : viewerAccount?.department_role
      ? `Role-based access for ${viewerAccount.department_role}`
      : "Clearance-only access";
  const topChips = isFullyRestricted ? ["Restricted access"] : routedRoles;
  const graphTrace = buildGraphTrace(answer.graph);

  return (
    <article aria-label={`Answer for ${question}`} className="answerStack">
      <div className="answerHero">
        <div>
          <p className="eyebrow">{answerMode.label}</p>
          <h2>{answer.title}</h2>
          <p className="supportingCopy">{answerMode.detail}</p>
        </div>
        <span className={`confidencePill ${confidenceTone}`}>{answer.confidence}</span>
      </div>

      <div className="answerMetaRow">
        {topChips.map((role) => (
          <span className="subtleRoleChip" key={role}>
            {role}
          </span>
        ))}
      </div>

      <div className="summaryCard">
        <p className="plainAnswerText">{summary}</p>
      </div>

      {answer.access_notice ? (
        <div className="feedbackCard warningCard">
          <strong>Access notice</strong>
          <p>{answer.access_notice}</p>
        </div>
      ) : null}

      {hasMoreInformation ? (
        <button
          className="secondaryButton queryDetailsToggle"
          onClick={onToggleMore}
          type="button"
        >
          {showMore ? "Hide more information" : "More information"}
        </button>
      ) : null}

      {showMore ? (
        <div className="stackDetails">
          {detailedAnswer && !isFullyRestricted ? (
            <section className="insightPanel">
              <h3>Detailed answer</h3>
              <p className="preWrapText">{detailedAnswer}</p>
            </section>
          ) : null}

          <dl className="detailGrid">
            {!isFullyRestricted ? (
              <div className="detailTile">
                <dt>Owner</dt>
                <dd>{getPrimaryOwner(answer)}</dd>
              </div>
            ) : null}
            <div className="detailTile">
              <dt>Viewer account</dt>
              <dd>{viewerAccount?.label || "Standard Employee"}</dd>
            </div>
            <div className="detailTile">
              <dt>Restricted sources</dt>
              <dd>{answer.restricted_source_count ?? 0}</dd>
            </div>
            {!isFullyRestricted ? (
              <div className="detailTile">
                <dt>Sources</dt>
                <dd>{formatMetadataList(answer.sources, "No cited sources")}</dd>
              </div>
            ) : null}
            {!isFullyRestricted ? (
              <div className="detailTile">
                <dt>Updated</dt>
                <dd>{formatMetadataList(answer.last_updated_dates, "Unknown")}</dd>
              </div>
            ) : null}
            <div className="detailTile">
              <dt>Clearance</dt>
              <dd>{formatClearanceLabel(viewerAccount?.clearance)}</dd>
            </div>
            <div className="detailTile">
              <dt>Access scope</dt>
              <dd>{accessMode}</dd>
            </div>
          </dl>

          {answer.graph && !isFullyRestricted ? (
            <section className="insightPanel graphTracePanel">
              <h3>Knowledge graph trace</h3>
              <div className="graphTraceCanvas" aria-label="Knowledge graph">
                <div className="graphNodeRail">
                  {graphTrace.nodes.length ? (
                    graphTrace.nodes.map((node) => (
                      <span className={`graphNode ${node.tone}`} key={node.id}>
                        {node.id}
                      </span>
                    ))
                  ) : (
                    <span className="graphNode context">No graph entities returned</span>
                  )}
                </div>

                {graphTrace.edges.length ? (
                  <div className="graphEdgeRail">
                    {graphTrace.edges.map((edge) => (
                      <div
                        className="graphEdge"
                        key={`${edge.from}-${edge.label}-${edge.to}`}
                      >
                        <span>{edge.from}</span>
                        <span className="graphEdgeLine" aria-hidden="true" />
                        <span className="graphEdgeLabel">{edge.label}</span>
                        <span className="graphEdgeLine" aria-hidden="true" />
                        <span>{edge.to}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="graphLegend">
                <span>
                  Detected:{" "}
                  {formatMetadataList(
                    answer.graph.entities_detected,
                    "No known entities",
                  )}
                </span>
                <span>
                  Expanded:{" "}
                  {formatMetadataList(answer.graph.entities_expanded, "No additions")}
                </span>
              </div>

              {answer.graph.graph_added_files?.length ? (
                <div className="graphEvidence">
                  <h4>Evidence added</h4>
                  <div className="graphEvidenceChips">
                    {answer.graph.graph_added_files.map((path) => (
                      <span key={path}>{path}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {answer.gap_routing && !isFullyRestricted ? (
            <section className="insightPanel gapRoutingPanel">
              <div className="gapRouteHeader">
                <div>
                  <p className="eyebrow">Knowledge gap routing</p>
                  <h3>Route recommendation</h3>
                </div>
                <span className="gapConfidenceBadge">
                  {answer.gap_routing.routing_confidence || "Low"} confidence
                </span>
              </div>

              <div className="gapRouteCard">
                <div>
                  <span className="gapLabel">Route to</span>
                  <div className="gapRouteTeams">
                    {routedRoles.map((role) => (
                      <span key={role}>{role}</span>
                    ))}
                  </div>
                </div>
                <p className="gapReason">
                  {answer.gap_routing.reason || "No routing reason returned."}
                </p>
              </div>

              {gapSignalLines.length ? (
                <div className="gapSignalPanel">
                  <h4>Routing signals</h4>
                  <div className="gapSignalChips">
                    {gapSignalLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="gapActionRow">
                <button
                  className="primaryButton"
                  disabled={isCreatingTicket}
                  onClick={onCreateTicket}
                  type="button"
                >
                  {isCreatingTicket ? "Routing..." : "Route to subject matter expert"}
                </button>
                {ticketCreated ? (
                  <span className="inlineSuccess">
                    Demo ticket created for {routedRoles.join(", ")}.
                  </span>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
