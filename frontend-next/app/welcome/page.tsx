"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ROLE_CATALOG,
  countDocumentsForRole,
  formatClearanceLabel,
  getAccessMixSummary,
  getDocumentDisplayName,
  getDocumentOwners,
  getDocumentRoleList,
  getDocumentSource,
  getDocumentTypeLabel,
  getDocumentUpdated,
  getDocumentUpdatedLabel,
  getDocumentVisibilitySummary,
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
  const latestDocuments = [...state.documents]
    .sort((left, right) =>
      getDocumentUpdated(right).localeCompare(getDocumentUpdated(left)),
    )
    .slice(0, 4);

  return (
    <main className="pageShell landingShell">
      <section className="landingHero welcomeHeroSimple">
        <div className="heroCopy">
          <p className="eyebrow">Welcome</p>
          <h1>Grounded answers, visible ownership, faster follow-up.</h1>
          <p className="lede">
            This frontend connects the Company Brain backend to a calmer workspace
            for regulatory, tax, ESG, and reference-data questions.
          </p>

          <div className="actionRow">
            <Link className="primaryButton" href="/query">
              Open query workspace
            </Link>
            <Link className="secondaryLink" href="/upload">
              Add new knowledge
            </Link>
          </div>
        </div>
      </section>

      <section className="landingSection catalogSection">
        <div className="sectionHeading catalogHeading">
          <h2>Catalog Overview</h2>
          <p className="supportingCopy">
            Documents flow from the backend registry into the teams responsible
            for maintaining and answering from them.
          </p>
        </div>

        <div className="catalogMap" aria-label="Knowledge map">
          <div className="catalogNode sourceNode">
            <span>Backend document registry</span>
            <strong>{state.documents.length} documents</strong>
          </div>
          <div className="catalogConnector" aria-hidden="true" />
          <div className="catalogNode hubNode">
            <span>Knowledge map</span>
            <strong>Source owners</strong>
          </div>
          <div className="catalogConnector" aria-hidden="true" />
          <div className="catalogNode sourceNode">
            <span>Role catalog</span>
            <strong>{knownRoles.length} teams</strong>
          </div>
        </div>

        <div className="catalogSubheading">
          <div>
            <p className="eyebrow">Source owners</p>
            <h3>Ownership at a glance</h3>
          </div>
          <p>Clean owner cards show responsibility, evidence volume, access, and freshness.</p>
        </div>

        <div className="ownerCardGrid" aria-label="Ownership at a glance">
          {knownRoles.map((role) => {
            const entry = getRoleCatalogEntry(role);
            const roleDocuments = state.documents
              .filter((document) => getDocumentRoleList(document).includes(role))
              .sort((left, right) =>
                getDocumentUpdated(right).localeCompare(getDocumentUpdated(left)),
              );
            const documentCount = countDocumentsForRole(state.documents, role);
            const latestDocument = roleDocuments[0];
            const latestDocumentLabel = latestDocument
              ? getDocumentDisplayName(latestDocument)
              : "No indexed evidence yet";

            return (
              <article className="ownerRoleCard" key={role}>
                <div className="ownerCardTopline">
                  <span className="ownerCardIndex">
                    {String(documentCount).padStart(2, "0")}
                  </span>
                  <span>indexed document{documentCount === 1 ? "" : "s"}</span>
                </div>

                <div className="ownerCardIdentity">
                  <h3>{entry.name}</h3>
                  <div className="ownerCoverageChips" aria-label="Top coverage">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                    {!entry.tags.length ? <span>unclassified</span> : null}
                  </div>
                </div>

                <dl className="ownerCardFacts">
                  <div>
                    <dt>Evidence</dt>
                    <dd title={latestDocumentLabel}>{latestDocumentLabel}</dd>
                  </div>
                  <div>
                    <dt>Access mix</dt>
                    <dd>{getAccessMixSummary(roleDocuments)}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>
                      {latestDocument
                        ? getDocumentUpdatedLabel(latestDocument)
                        : "No indexed files yet"}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landingSection accessDocumentsSection">
        <div className="sectionHeading">
          <h2>Access-Ready Documents</h2>
          <p className="supportingCopy">
            Recent indexed files with their owner and access level.
          </p>
        </div>
        <p className="documentAccessListLabel">Document access list</p>

        {latestDocuments.length ? (
          <div className="documentAccessList" aria-label="Document access list">
            <div className="documentAccessHeader">
              <span>File</span>
              <span>Owner</span>
              <span>Access</span>
              <span>Updated</span>
            </div>
            {latestDocuments.map((document) => (
              <article className="documentAccessRow" key={getDocumentSource(document)}>
                <div className="documentAccessName">
                  <strong title={getDocumentSource(document)}>
                    {getDocumentDisplayName(document)}
                  </strong>
                  <span>{getDocumentTypeLabel(document)}</span>
                </div>
                <span>{getDocumentOwners(document)}</span>
                <span>
                  {getDocumentVisibilitySummary(document)} ·{" "}
                  {formatClearanceLabel(document.min_clearance)}
                </span>
                <span>{getDocumentUpdatedLabel(document)}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <strong>No documents loaded yet</strong>
            <p>{state.documentsError || "The backend has not returned document metadata."}</p>
          </div>
        )}
      </section>
    </main>
  );
}
