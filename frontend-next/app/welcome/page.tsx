"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SixLogo } from "../../components/brand-mark";
import {
  getDocumentOwners,
  getDocumentSource,
  getDocumentUpdated,
} from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainDocument,
  DocumentsResponse,
  HealthResponse,
  RolesResponse,
} from "../../types/companyBrain";

const coreTopics = [
  "MiFID II and MiFIR workflow coverage",
  "SFDR, ESG, and sustainability disclosure context",
  "FATCA, tax, and reference-data ownership trails",
];

const valuePoints = [
  {
    title: "Grounded answers",
    copy:
      "Every response is tied back to indexed material instead of acting like a generic chatbot.",
  },
  {
    title: "Transparent ownership",
    copy:
      "Seven surfaces likely owners, source files, update dates, and routing clues around each answer.",
  },
  {
    title: "Living knowledge base",
    copy:
      "Users can grow the system by uploading new documents directly from the product experience.",
  },
];

type LoadState = {
  health: HealthResponse | null;
  roles: string[];
  rolesBackend: string | null;
  documents: CompanyBrainDocument[];
  healthError: string | null;
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
    health: null,
    roles: [],
    rolesBackend: null,
    documents: [],
    healthError: null,
    rolesError: null,
    documentsError: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      const [healthResult, rolesResult, documentsResult] = await Promise.allSettled([
        readJson<HealthResponse>("/api/company-brain/health"),
        readJson<RolesResponse>("/api/company-brain/roles"),
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
        documents:
          documentsResult.status === "fulfilled"
            ? documentsResult.value.documents
            : [],
        healthError:
          healthResult.status === "rejected" ? healthResult.reason.message : null,
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

  const liveDocuments = state.documents.slice(0, 6);

  return (
    <main className="pageShell landingShell">
      <section className="landingHero">
        <div className="heroCopy">
          <p className="eyebrow">Welcome to Seven</p>
          <h1>
            The modern interface for company knowledge that should not stay
            trapped in inboxes and experts.
          </h1>
          <p className="lede">
            Seven turns regulatory, tax, ESG, and reference-data material into a
            searchable, source-aware workspace built on the Company Brain backend.
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

        <div className="heroPanel">
          <p className="heroPanelLabel">Live workspace snapshot</p>
          <div className="heroPanelFooter">
            <span>{state.health?.ok ? "Backend reachable" : "Waiting for backend"}</span>
            <span>{state.roles.length} known roles</span>
            <span>{state.documents.length} stored documents</span>
          </div>
          <ul className="heroTopicList">
            {coreTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
          <div className="heroSponsorLockup">
            <span className="supportingCopy">Seven created for</span>
            <SixLogo className="panelSixLogo" />
          </div>
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeading">
          <p className="eyebrow">Why it matters</p>
          <h2>Seven helps teams reuse expertise instead of re-hunting for it.</h2>
        </div>
        <div className="featureGrid">
          {valuePoints.map((point) => (
            <article className="featureCard" key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeading">
          <p className="eyebrow">Live backend overview</p>
          <h2>See what the current Company Brain instance exposes right now.</h2>
        </div>

        <div className="workspaceOverviewGrid">
          <article className="infoTile">
            <h3>Persistence and health</h3>
            {state.health ? (
              <dl className="detailGrid compactDetailGrid">
                <div className="detailTile">
                  <dt>Data</dt>
                  <dd>{state.health.data_dir_exists ? "Ready" : "Missing"}</dd>
                </div>
                <div className="detailTile">
                  <dt>Vectors</dt>
                  <dd>{state.health.chroma_dir_exists ? "Ready" : "Missing"}</dd>
                </div>
                <div className="detailTile">
                  <dt>Graph</dt>
                  <dd>{state.health.graph_exists ? "Ready" : "Missing"}</dd>
                </div>
              </dl>
            ) : (
              <p>{state.healthError || "Health status is loading."}</p>
            )}
          </article>

          <article className="infoTile">
            <h3>Owning role catalog</h3>
            {state.roles.length ? (
              <>
                <p className="supportingCopy">
                  Current source: {state.rolesBackend || "unknown backend"}.
                </p>
                <div className="roleGrid">
                  {state.roles.map((role) => (
                    <span className="roleChip" key={role}>
                      {role}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p>{state.rolesError || "No roles were returned yet."}</p>
            )}
          </article>
        </div>

        <div className="documentGrid">
          {liveDocuments.length ? (
            liveDocuments.map((document) => (
              <article className="documentCard" key={getDocumentSource(document)}>
                <p className="eyebrow">Indexed document</p>
                <h3>{getDocumentSource(document)}</h3>
                <p>
                  Owned by {getDocumentOwners(document)} with{" "}
                  {document.chunks ?? "unknown"} chunks in {document.modality || "document"} mode.
                </p>
                <div className="documentMetaRow">
                  <span>Updated {getDocumentUpdated(document)}</span>
                </div>
              </article>
            ))
          ) : (
            <article className="emptyState">
              <p className="eyebrow">Documents</p>
              <h3>No document records loaded</h3>
              <p>{state.documentsError || "Upload a file to populate this view."}</p>
            </article>
          )}
        </div>
      </section>

      <section className="landingSection ctaSection">
        <div className="sectionHeading">
          <p className="eyebrow">Get started</p>
          <h2>Choose the part of Seven you want to enter.</h2>
        </div>
        <div className="ctaGrid">
          <article className="ctaCard">
            <h3>Go to the query page</h3>
            <p>
              Ask the backend what it already knows and inspect the answer trail in
              the dedicated workspace.
            </p>
            <Link className="primaryButton" href="/query">
              Open query workspace
            </Link>
          </article>
          <article className="ctaCard subtle">
            <h3>Go to the upload page</h3>
            <p>
              Add new source documents so Seven can expand what it can answer next.
            </p>
            <Link className="secondaryButton" href="/upload">
              Open upload workspace
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
