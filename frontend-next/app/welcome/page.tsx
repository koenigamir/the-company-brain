"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SixLogo } from "../../components/brand-mark";
import {
  ROLE_CATALOG,
  countDocumentsForRole,
  formatClearanceLabel,
  getDocumentOwners,
  getDocumentRoleList,
  getDocumentSource,
  getDocumentUpdated,
  getDocumentVisibilitySummary,
  getRoleCatalogEntry,
} from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainDocument,
  DemoAccountsResponse,
  DocumentsResponse,
  HealthResponse,
  RolesResponse,
} from "../../types/companyBrain";

type LoadState = {
  health: HealthResponse | null;
  roles: string[];
  rolesBackend: string | null;
  demoAccountCount: number;
  accountsBackend: string | null;
  documents: CompanyBrainDocument[];
  healthError: string | null;
  rolesError: string | null;
  accountsError: string | null;
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
    health: null,
    roles: [],
    rolesBackend: null,
    demoAccountCount: 0,
    accountsBackend: null,
    documents: [],
    healthError: null,
    rolesError: null,
    accountsError: null,
    documentsError: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      const [healthResult, rolesResult, accountsResult, documentsResult] = await Promise.allSettled([
        readJson<HealthResponse>("/api/company-brain/health"),
        readJson<RolesResponse>("/api/company-brain/roles"),
        readJson<DemoAccountsResponse>("/api/company-brain/demo-accounts"),
        readJson<DocumentsResponse>("/api/company-brain/documents"),
      ]);

      if (!isMounted) {
        return;
      }

      setState({
        health:
          healthResult.status === "fulfilled" ? healthResult.value : null,
        roles: rolesResult.status === "fulfilled" ? rolesResult.value.roles : [],
        rolesBackend:
          rolesResult.status === "fulfilled" ? rolesResult.value.backend : null,
        demoAccountCount:
          accountsResult.status === "fulfilled"
            ? accountsResult.value.accounts.length
            : 0,
        accountsBackend:
          accountsResult.status === "fulfilled"
            ? accountsResult.value.backend
            : null,
        documents:
          documentsResult.status === "fulfilled"
            ? documentsResult.value.documents
            : [],
        healthError:
          healthResult.status === "rejected" ? healthResult.reason.message : null,
        rolesError:
          rolesResult.status === "rejected" ? rolesResult.reason.message : null,
        accountsError:
          accountsResult.status === "rejected"
            ? accountsResult.reason.message
            : null,
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
      <section className="landingHero">
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

        <div className="heroPanel cleanHeroPanel">
          <p className="heroPanelLabel">Live workspace snapshot</p>

          <div className="heroSnapshotGrid">
            <article className="snapshotMetric">
              <span className="snapshotValue">
                {state.health?.ok ? "Backend reachable" : "Waiting for backend"}
              </span>
              <span className="snapshotLabel">Status</span>
            </article>

            <article className="snapshotMetric">
              <span className="snapshotValue">{knownRoles.length}</span>
              <span className="snapshotLabel">Known roles</span>
            </article>

            <article className="snapshotMetric">
              <span className="snapshotValue">{state.demoAccountCount}</span>
              <span className="snapshotLabel">Demo accounts</span>
            </article>

            <article className="snapshotMetric">
              <span className="snapshotValue">{state.documents.length}</span>
              <span className="snapshotLabel">Stored documents</span>
            </article>
          </div>

          <p className="snapshotBody">
            Catalog source: {state.rolesBackend || state.rolesError || "local proxy"}.
            {" "}Access profiles:{" "}
            {state.accountsBackend || state.accountsError || "local proxy"}.
          </p>

          <div className="heroSponsorLockup cleanSponsorLockup">
            <span className="supportingCopy">created for</span>
            <SixLogo className="panelSixLogo" />
          </div>
        </div>
      </section>

      <section className="landingSection catalogSection">
        <div className="sectionHeading catalogHeading">
          <h2>Catalog Overview</h2>
        </div>

        <div className="roleCatalogGrid cleanCatalogGrid">
          {knownRoles.map((role) => {
            const entry = getRoleCatalogEntry(role);
            const documentCount = countDocumentsForRole(state.documents, role);

            return (
              <article className="roleCard cleanRoleCard" key={role}>
                <div className="roleCardHeader">
                  <h3>{entry.name}</h3>
                  <span className="roleCountBadge">
                    {documentCount} indexed document{documentCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p>{entry.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeading">
          <h2>Access-Ready Documents</h2>
          <p className="supportingCopy">
            Ownership, visibility, and clearance are pulled directly from the live
            backend document registry.
          </p>
        </div>

        {latestDocuments.length ? (
          <div className="documentListCompact">
            {latestDocuments.map((document) => (
              <article className="compactDocumentCard" key={getDocumentSource(document)}>
                <div className="documentCardHeader">
                  <h3>{getDocumentSource(document)}</h3>
                  <span className="documentModeBadge">
                    {document.modality || "document"}
                  </span>
                </div>
                <p className="documentMetaRow">
                  Owners: {getDocumentOwners(document)}
                </p>
                <dl className="detailGrid compactDetailGrid">
                  <div className="detailTile">
                    <dt>Visibility</dt>
                    <dd>{getDocumentVisibilitySummary(document)}</dd>
                  </div>
                  <div className="detailTile">
                    <dt>Clearance</dt>
                    <dd>{formatClearanceLabel(document.min_clearance)}</dd>
                  </div>
                  <div className="detailTile">
                    <dt>Updated</dt>
                    <dd>{getDocumentUpdated(document)}</dd>
                  </div>
                </dl>
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
