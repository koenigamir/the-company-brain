"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  describeAnswerMode,
  formatMetadataList,
  getConfidenceTone,
  getGapSignalLines,
  getPrimaryOwner,
} from "../../lib/companyBrainPresentation";
import type { CompanyBrainAnswer } from "../../types/companyBrain";

const sampleQuestions = [
  "Which SIX workflow covers MiFID II product governance questions?",
  "How do FATCA and Tax Navigator appear in the indexed knowledge?",
  "What source trail explains SFDR or ESG-linked product coverage?",
];

export default function QueryPage() {
  const [question, setQuestion] = useState(sampleQuestions[0]);
  const [answer, setAnswer] = useState<CompanyBrainAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);

  const answerMode = describeAnswerMode(answer?.graph);
  const confidenceTone = getConfidenceTone(answer?.confidence);
  const gapSignalLines = getGapSignalLines(answer?.gap_routing);

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setTicketCreated(false);

    try {
      const response = await fetch("/api/company-brain/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Query failed.");
      }

      setAnswer(body as CompanyBrainAnswer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="pageShell">
      <section className="pageIntro">
        <p className="eyebrow">Query Workspace</p>
        <h1>Ask Seven about the company knowledge base</h1>
        <p className="lede">
          Search across the indexed regulatory, tax, ESG, and reference-data corpus.
          Every answer stays tied to retrieved material, ownership, and routing logic.
        </p>
      </section>

      <section className="toolLayout">
        <div className="toolCard queryCard">
          <form className="stackForm" onSubmit={submitQuery}>
            <label className="fieldLabel" htmlFor="question">
              Your question
            </label>
            <textarea
              className="fieldInput fieldTextarea"
              id="question"
              onChange={(event) => setQuestion(event.target.value)}
              rows={5}
              value={question}
            />

            <div className="sampleRow">
              {sampleQuestions.map((sample) => (
                <button
                  className="ghostChip"
                  key={sample}
                  onClick={() => setQuestion(sample)}
                  type="button"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="actionRow">
              <button
                className="primaryButton"
                disabled={isLoading || !question.trim()}
                type="submit"
              >
                {isLoading ? "Synthesizing answer..." : "Ask Seven"}
              </button>
              <Link className="secondaryLink" href="/upload">
                Add a missing document
              </Link>
            </div>
          </form>

          {error ? (
            <div className="feedbackCard errorCard">
              <strong>Query failed</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {!answer && !error ? (
            <div className="emptyState">
              <p className="eyebrow">Ready</p>
              <h2>Start with a real compliance question</h2>
              <p>
                Seven is best at questions tied to the current indexed challenge
                material, especially MiFID, SFDR, FATCA, tax, and reference-data
                workflows.
              </p>
            </div>
          ) : null}

          {answer ? (
            <article className="answerStack">
              <div className="answerHero">
                <div>
                  <p className="eyebrow">{answerMode.label}</p>
                  <h2>{answer.title}</h2>
                  <p className="supportingCopy">{answerMode.detail}</p>
                </div>
                <span className={`confidencePill ${confidenceTone}`}>
                  {answer.confidence}
                </span>
              </div>

              <div className="summaryCard">
                <p>{answer.short_answer || answer.summary}</p>
              </div>

              {answer.detailed_answer ? (
                <section className="insightPanel">
                  <h3>Detailed answer</h3>
                  <p className="preWrapText">{answer.detailed_answer}</p>
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
                  <dd>
                    {formatMetadataList(answer.last_updated_dates, "Unknown")}
                  </dd>
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
                    Seven could not fully verify the answer from the indexed corpus, so
                    it suggested the most likely owning team.
                  </p>

                  <dl className="detailGrid">
                    <div className="detailTile">
                      <dt>Route to</dt>
                      <dd>{answer.gap_routing.routed_to || "Master Data Ops"}</dd>
                    </div>
                    <div className="detailTile">
                      <dt>Reason</dt>
                      <dd>{answer.gap_routing.reason || "No routing reason returned."}</dd>
                    </div>
                    <div className="detailTile">
                      <dt>Routing confidence</dt>
                      <dd>
                        {answer.gap_routing.routing_confidence || "Low"}
                      </dd>
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
                      onClick={async () => {
                        setIsCreatingTicket(true);
                        setError(null);
                        try {
                          const response = await fetch(
                            "/api/company-brain/gap-ticket",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                question,
                                gap:
                                  answer.gap_ticket_draft ||
                                  answer.missing_topics?.join(", ") ||
                                  answer.gap_routing?.reason ||
                                  "Knowledge gap review requested.",
                                body:
                                  answer.gap_ticket_draft ||
                                  answer.gap_routing?.reason ||
                                  "Knowledge gap review requested.",
                                missing_topics: answer.missing_topics || [],
                              }),
                            },
                          );
                          const body = await response.json();
                          if (!response.ok) {
                            throw new Error(body.error ?? "Gap ticket failed.");
                          }
                          setTicketCreated(true);
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Gap ticket failed.",
                          );
                        } finally {
                          setIsCreatingTicket(false);
                        }
                      }}
                      type="button"
                    >
                      {isCreatingTicket
                        ? "Routing..."
                        : "Route to subject matter expert"}
                    </button>
                    {ticketCreated ? (
                      <span className="inlineSuccess">
                        Demo ticket created for {getPrimaryOwner(answer)}.
                      </span>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}
