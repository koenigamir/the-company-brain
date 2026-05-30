"use client";

import { FormEvent, useMemo, useState } from "react";

import type { CompanyBrainAnswer } from "@/types/companyBrain";

const sampleQuestions = [
  "What is FATCA?",
  "What data templates support SFDR and who maintains them?",
  "How do FATCA and the tax navigator relate?",
];

export default function Home() {
  const [question, setQuestion] = useState(sampleQuestions[0]);
  const [answer, setAnswer] = useState<CompanyBrainAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphUsed = useMemo(() => {
    return answer?.graph?.used_graph ? "Graph context used" : "Vector context";
  }, [answer]);

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnswer(null);

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
    <main className="shell">
      <section className="workspace">
        <aside className="sidebar">
          <div>
            <p className="eyebrow">Company Brain</p>
            <h1>Regulatory knowledge</h1>
          </div>

          <div className="sampleList">
            {sampleQuestions.map((sample) => (
              <button
                className="sampleButton"
                key={sample}
                onClick={() => setQuestion(sample)}
                type="button"
              >
                {sample}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <form className="queryForm" onSubmit={submitQuery}>
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              value={question}
            />
            <button disabled={isLoading || !question.trim()} type="submit">
              {isLoading ? "Synthesizing..." : "Ask Company Brain"}
            </button>
          </form>

          {error ? <div className="error">{error}</div> : null}

          {answer ? (
            <article className="answer">
              <div className="answerHeader">
                <div>
                  <p className="eyebrow">{graphUsed}</p>
                  <h2>{answer.title}</h2>
                </div>
                <span className={`confidence ${answer.confidence.toLowerCase()}`}>
                  {answer.confidence}
                </span>
              </div>

              <div className="summary">{answer.summary}</div>

              <dl className="metadata">
                <div>
                  <dt>Owner</dt>
                  <dd>{answer.role_owner}</dd>
                </div>
                <div>
                  <dt>Sources</dt>
                  <dd>{answer.sources.join(", ")}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{answer.last_updated_dates?.join(", ") || "Unknown"}</dd>
                </div>
              </dl>

              {answer.graph?.relation_paths?.length ? (
                <div className="graphPanel">
                  <h3>Knowledge graph path</h3>
                  <ul>
                    {answer.graph.relation_paths.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ) : null}
        </section>
      </section>
    </main>
  );
}
