"use client";

import React from "react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { QueryAnswerPanel } from "../../components/query-answer-panel";
import { buildGapTicketRequest } from "../../lib/companyBrainPresentation";
import type { CompanyBrainAnswer } from "../../types/companyBrain";

const SAMPLE_QUESTION =
  "Which SIX workflow covers MiFID II product governance questions?";

export default function QueryPage() {
  const [question, setQuestion] = useState(SAMPLE_QUESTION);
  const [answer, setAnswer] = useState<CompanyBrainAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [showMore, setShowMore] = useState(false);

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setTicketCreated(false);
    setShowMore(false);

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
      <section className="pageIntro minimalPageIntro">
        <h1>Ask the company knowledge base</h1>
      </section>

      <section className="toolLayout minimalToolLayout">
        <div className="toolCard queryCard minimalToolCard">
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

            <div className="actionRow">
              <button
                className="primaryButton"
                disabled={isLoading || !question.trim()}
                type="submit"
              >
                {isLoading ? "Synthesizing answer..." : "Ask"}
              </button>
            </div>
          </form>

          {error ? (
            <div className="feedbackCard errorCard">
              <strong>Query failed</strong>
              <p>{error}</p>
            </div>
          ) : null}

          {answer ? (
            <QueryAnswerPanel
              answer={answer}
              isCreatingTicket={isCreatingTicket}
              onCreateTicket={async () => {
                setIsCreatingTicket(true);
                setError(null);
                try {
                  const response = await fetch("/api/company-brain/gap-ticket", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(buildGapTicketRequest(question, answer)),
                  });
                  const body = await response.json();
                  if (!response.ok) {
                    throw new Error(body.error ?? "Gap ticket failed.");
                  }
                  setTicketCreated(true);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Gap ticket failed.",
                  );
                } finally {
                  setIsCreatingTicket(false);
                }
              }}
              onToggleMore={() => setShowMore((current) => !current)}
              question={question}
              showMore={showMore}
              ticketCreated={ticketCreated}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
