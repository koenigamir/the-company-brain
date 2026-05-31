"use client";

import React from "react";
import { FormEvent, useEffect, useState } from "react";

import { QueryAnswerPanel } from "../../components/query-answer-panel";
import { formatClearanceLabel } from "../../lib/companyBrainPresentation";
import { buildGapTicketRequest } from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainAnswer,
  DemoAccount,
  DemoAccountsResponse,
} from "../../types/companyBrain";

const SAMPLE_QUESTION =
  "Which SIX workflow covers MiFID II product governance questions?";
const FALLBACK_ACCOUNT: DemoAccount = {
  id: "standard-employee",
  label: "Standard Employee",
  department_role: null,
  clearance: "standard",
  global_access: false,
};

export default function QueryPage() {
  const [question, setQuestion] = useState(SAMPLE_QUESTION);
  const [answer, setAnswer] = useState<CompanyBrainAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([FALLBACK_ACCOUNT]);
  const [viewerAccountId, setViewerAccountId] = useState(FALLBACK_ACCOUNT.id);

  useEffect(() => {
    let isMounted = true;

    async function loadDemoAccounts() {
      try {
        const response = await fetch("/api/company-brain/demo-accounts", {
          cache: "no-store",
        });
        const body = (await response.json()) as DemoAccountsResponse & {
          error?: string;
        };
        if (!response.ok || !body.accounts?.length) {
          return;
        }

        if (isMounted) {
          setDemoAccounts(body.accounts);
          setViewerAccountId((current) =>
            body.accounts.some((account) => account.id === current)
              ? current
              : body.accounts[0].id,
          );
        }
      } catch {
        // Keep the fallback demo account if the access-profile route is unavailable.
      }
    }

    void loadDemoAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

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
        body: JSON.stringify({ question, viewer_account_id: viewerAccountId }),
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

  const selectedAccount =
    demoAccounts.find((account) => account.id === viewerAccountId) || FALLBACK_ACCOUNT;
  const selectedAccessMode = selectedAccount.global_access
    ? "Global access"
    : selectedAccount.department_role
      ? `Role-based access for ${selectedAccount.department_role}`
      : "Clearance-only access";
  const selectedRole = selectedAccount.department_role || "No team scope";

  return (
    <main className="pageShell">
      <section className="pageIntro minimalPageIntro">
        <h1>Ask the company knowledge base</h1>
      </section>

      <section className="toolLayout minimalToolLayout">
        <div className="toolCard queryCard minimalToolCard">
          <form className="stackForm" onSubmit={submitQuery}>
            <div className="agentBar" aria-label="Agent profile">
              <div className="agentIdentity">
                <span className="agentLabel">Agent profile</span>
                <select
                  className="agentSelect"
                  id="viewerAccount"
                  onChange={(event) => setViewerAccountId(event.target.value)}
                  value={viewerAccountId}
                >
                  {demoAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="agentMeta" aria-label="Active access context">
                <span>{selectedRole}</span>
                <span>{formatClearanceLabel(selectedAccount.clearance)}</span>
                <span>{selectedAccessMode}</span>
              </div>
            </div>

            <label className="fieldLabel" htmlFor="question">
              Your question
            </label>
            <textarea
              className="fieldInput fieldTextarea queryTextarea"
              id="question"
              onChange={(event) => setQuestion(event.target.value)}
              rows={5}
              value={question}
            />

            <div className="actionRow queryActionRow">
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
