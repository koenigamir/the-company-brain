import React from "react";

import {
  describeAnswerMode,
  formatMetadataList,
  getConfidenceTone,
  getGapSignalLines,
  getPrimaryOwner,
  getRoutedRoles,
  normalizeAnswerText,
} from "../lib/companyBrainPresentation";
import type { CompanyBrainAnswer } from "../types/companyBrain";

type QueryAnswerPanelProps = {
  answer: CompanyBrainAnswer;
  question: string;
  showMore: boolean;
  onToggleMore: () => void;
  onCreateTicket: () => void;
  isCreatingTicket: boolean;
  ticketCreated: boolean;
};

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
  const hasMoreInformation = Boolean(
    detailedAnswer ||
      answer.graph ||
      answer.gap_routing ||
      answer.sources?.length ||
      answer.last_updated_dates?.length ||
      answer.role_owner,
  );

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
        {routedRoles.map((role) => (
          <span className="subtleRoleChip" key={role}>
            {role}
          </span>
        ))}
      </div>

      <div className="summaryCard">
        <p className="plainAnswerText">{summary}</p>
      </div>

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
          {detailedAnswer ? (
            <section className="insightPanel">
              <h3>Detailed answer</h3>
              <p className="preWrapText">{detailedAnswer}</p>
            </section>
          ) : null}

          <dl className="detailGrid">
            <div className="detailTile">
              <dt>Owner</dt>
              <dd>{getPrimaryOwner(answer)}</dd>
            </div>
            <div className="detailTile">
              <dt>Sources</dt>
              <dd>{formatMetadataList(answer.sources, "No cited sources")}</dd>
            </div>
            <div className="detailTile">
              <dt>Updated</dt>
              <dd>{formatMetadataList(answer.last_updated_dates, "Unknown")}</dd>
            </div>
          </dl>

          {answer.graph ? (
            <section className="insightPanel">
              <h3>Knowledge graph trace</h3>
              <div className="insightGrid">
                <div>
                  <h4>Entities detected</h4>
                  <p>
                    {formatMetadataList(
                      answer.graph.entities_detected,
                      "No known entities were detected in this question.",
                    )}
                  </p>
                </div>
                <div>
                  <h4>Graph expansion</h4>
                  <p>
                    {formatMetadataList(
                      answer.graph.entities_expanded,
                      "No extra graph entities were added.",
                    )}
                  </p>
                </div>
              </div>

              {answer.graph.relation_paths?.length ? (
                <div className="listPanel">
                  <h4>Relation paths</h4>
                  <ul>
                    {answer.graph.relation_paths.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {answer.graph.graph_added_files?.length ? (
                <div className="listPanel">
                  <h4>Additional files pulled in</h4>
                  <ul>
                    {answer.graph.graph_added_files.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {answer.gap_routing ? (
            <section className="insightPanel warningPanel">
              <h3>Knowledge gap routing</h3>
              <p className="supportingCopy">
                The current corpus could not fully verify this answer, so the most
                likely owning team is suggested below.
              </p>

              <dl className="detailGrid">
                <div className="detailTile">
                  <dt>Route to</dt>
                  <dd>{routedRoles.join(", ")}</dd>
                </div>
                <div className="detailTile">
                  <dt>Reason</dt>
                  <dd>{answer.gap_routing.reason || "No routing reason returned."}</dd>
                </div>
                <div className="detailTile">
                  <dt>Routing confidence</dt>
                  <dd>{answer.gap_routing.routing_confidence || "Low"}</dd>
                </div>
              </dl>

              {gapSignalLines.length ? (
                <div className="listPanel">
                  <h4>Routing signals</h4>
                  <ul>
                    {gapSignalLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="actionRow">
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
