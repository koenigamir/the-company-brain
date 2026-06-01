"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ROLE_CATALOG,
  countDocumentsForRole,
  getAccessMixSummary,
  getDocumentDisplayName,
  getDocumentRoleList,
  getDocumentUpdated,
  getDocumentUpdatedLabel,
  getRoleCatalogEntry,
} from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainDocument,
  DocumentsResponse,
  RolesResponse,
} from "../../types/companyBrain";

type LoadState = {
  roles: string[];
  rolesBackend: string | null;
  documents: CompanyBrainDocument[];
  rolesError: string | null;
  documentsError: string | null;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed for ${url}.`);
  }
  return body;
}

export default function WelcomePage() {
  const [state, setState] = useState<LoadState>({
    roles: [],
    rolesBackend: null,
    documents: [],
    rolesError: null,
    documentsError: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      const [rolesResult, documentsResult] = await Promise.allSettled([
        readJson<RolesResponse>("/api/company-brain/roles"),
        readJson<DocumentsResponse>("/api/company-brain/documents"),
      ]);

      if (!isMounted) {
        return;
      }

      setState({
        roles: rolesResult.status === "fulfilled" ? rolesResult.value.roles : [],
        rolesBackend:
          rolesResult.status === "fulfilled" ? rolesResult.value.backend : null,
        documents:
          documentsResult.status === "fulfilled"
            ? documentsResult.value.documents
            : [],
        rolesError:
          rolesResult.status === "rejected" ? rolesResult.reason.message : null,
        documentsError:
          documentsResult.status === "rejected"
            ? documentsResult.reason.message
            : null,
      });
    }

    void loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, []);

  const knownRoles = Array.from(
    new Set([
      ...ROLE_CATALOG.map((entry) => entry.name),
      ...state.roles,
      ...state.documents.flatMap((document) => getDocumentRoleList(document)),
    ]),
  );
  const ownerSummaries = knownRoles.map((role) => {
    const entry = getRoleCatalogEntry(role);
    const documents = state.documents
      .filter((document) => getDocumentRoleList(document).includes(role))
      .sort((left, right) =>
        getDocumentUpdated(right).localeCompare(getDocumentUpdated(left)),
      );
    const latestDocument = documents[0];

    return {
      role,
      entry,
      documents,
      documentCount: countDocumentsForRole(state.documents, role),
      latestDocument,
      latestDocumentLabel: latestDocument
        ? getDocumentDisplayName(latestDocument)
        : "No source added yet",
      latestUpdatedLabel: latestDocument
        ? getDocumentUpdatedLabel(latestDocument)
        : "No update yet",
    };
  });
  const topicPills = ownerSummaries
    .flatMap((summary) =>
      summary.entry.tags.slice(0, 2).map((tag) => ({
        tag,
        role: summary.role,
        count: summary.documentCount,
      })),
    )
    .slice(0, 10);
  const sourceLabel = `${state.documents.length} knowledge source${
    state.documents.length === 1 ? "" : "s"
  }`;

  return (
    <main className="pageShell landingShell">
      <section className="landingHero welcomeHeroSimple">
        <div className="heroCopy">
          <p className="eyebrow">Welcome</p>
          <h1>Company Brain helps teams find trusted answers.</h1>
          <p className="lede">
            Ask questions in plain language, see where the answer belongs, and
            send missing knowledge to the right owner when something needs follow-up.
          </p>

          <div className="welcomeValueGrid" aria-label="What Company Brain does">
            <article>
              <strong>Ask questions in plain language</strong>
              <span>Get answers from company knowledge without searching file by file.</span>
            </article>
            <article>
              <strong>See who owns each answer area</strong>
              <span>Understand which team maintains the topic and source material.</span>
            </article>
            <article>
              <strong>Improve knowledge when gaps appear</strong>
              <span>Route unclear or missing answers to the right subject matter team.</span>
            </article>
          </div>

          <div className="actionRow">
            <Link className="primaryButton" href="/query">
              Start asking
            </Link>
            <Link className="secondaryLink" href="/upload">
              Add new knowledge
            </Link>
          </div>
        </div>
      </section>

      <section className="landingSection catalogSection">
        <div className="sectionHeading catalogHeading">
          <h2>How knowledge flows</h2>
          <p className="supportingCopy">
            Company Brain keeps answers connected to the topics and teams that
            maintain them, so users know both what the answer is and who can
            improve it.
          </p>
        </div>

        <div className="catalogMap" aria-label="Knowledge map">
          <div className="catalogNode sourceNode">
            <span>Company knowledge</span>
            <strong>{sourceLabel}</strong>
          </div>
          <div className="catalogConnector" aria-hidden="true" />
          <div className="catalogNode hubNode">
            <span>Answer topics</span>
            <strong>Knowledge map</strong>
          </div>
          <div className="catalogConnector" aria-hidden="true" />
          <div className="catalogNode sourceNode">
            <span>Owning teams</span>
            <strong>{knownRoles.length} teams</strong>
          </div>
        </div>

        <div className="catalogGraph" aria-label="Knowledge flow">
          <div className="catalogGraphSource">
            <p className="eyebrow">Company knowledge</p>
            <strong>Source material</strong>
            <span>{sourceLabel}</span>
          </div>

          <div className="catalogGraphConnector" aria-hidden="true" />

          <div className="catalogTopicCluster">
            <div className="catalogGraphHeader">
              <span>Topic coverage</span>
              <strong>{topicPills.length || ROLE_CATALOG.length} signals</strong>
            </div>
            <div className="catalogTopicCloud">
              {(topicPills.length
                ? topicPills
                : ROLE_CATALOG.flatMap((entry) =>
                    entry.tags.slice(0, 2).map((tag) => ({
                      tag,
                      role: entry.name,
                      count: 0,
                    })),
                  )
              ).map((topic) => (
                <span
                  className="catalogTopicPill"
                  key={`${topic.role}-${topic.tag}`}
                  title={`${topic.role}: ${topic.count} knowledge sources`}
                >
                  {topic.tag}
                </span>
              ))}
            </div>
          </div>

          <div className="catalogGraphConnector" aria-hidden="true" />

          <div className="catalogOwnerCluster">
            <div className="catalogGraphHeader">
              <span>Source owners</span>
              <strong>Owning teams</strong>
            </div>
            <div className="catalogOwnerGrid">
              {ownerSummaries.map((summary) => (
                <article className="catalogOwnerNode" key={summary.role}>
                  <div>
                    <h3>{summary.role}</h3>
                    <span>
                      {summary.documentCount} knowledge source
                      {summary.documentCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p title={summary.latestDocumentLabel}>
                    {summary.latestDocumentLabel}
                  </p>
                  <dl>
                    <div>
                      <dt>Access</dt>
                      <dd>
                        {summary.documents.length
                          ? getAccessMixSummary(summary.documents)
                          : "No sources yet"}
                      </dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{summary.latestUpdatedLabel}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
