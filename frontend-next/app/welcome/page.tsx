"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SixLogo } from "../../components/brand-mark";
import {
  ROLE_CATALOG,
  countDocumentsForRole,
  getDocumentRoleList,
  getDocumentOwners,
  getDocumentSource,
  getDocumentUpdated,
  getRoleCatalogEntry,
} from "../../lib/companyBrainPresentation";
import type {
  CompanyBrainDocument,
  DocumentsResponse,
  HealthResponse,
  RolesResponse,
} from "../../types/companyBrain";

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
  const [selectedRole, setSelectedRole] = useState("All roles");

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

  const knownRoles = Array.from(
    new Set([
      ...ROLE_CATALOG.map((entry) => entry.name),
      ...state.roles,
      ...state.documents.flatMap((document) => getDocumentRoleList(document)),
    ]),
  );

  const filteredDocuments =
    selectedRole === "All roles"
      ? state.documents
      : state.documents.filter((document) =>
          getDocumentRoleList(document).includes(selectedRole),
        );

  const liveDocuments = filteredDocuments.slice(0, 4);

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

        <div className="heroPanel">
          <p className="heroPanelLabel">Live workspace snapshot</p>
          <div className="heroPanelFooter">
            <span>{state.health?.ok ? "Backend reachable" : "Waiting for backend"}</span>
            <span>{knownRoles.length} known roles</span>
            <span>{state.documents.length} stored documents</span>
          </div>
          <p className="supportingCopy">
            Roles and documents are loaded through the Next proxy routes, so the UI
            stays aligned with the updated backend contract.
          </p>
          <div className="heroSponsorLockup">
            <span className="supportingCopy">created for</span>
            <SixLogo className="panelSixLogo" />
          </div>
        </div>
      </section>

      <section className="landingSection">
        <div className="sectionHeading">
          <p className="eyebrow">Workspace overview</p>
          <h2>Role ownership is now surfaced directly in the frontend.</h2>
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
            <h3>How roles are used</h3>
            <p>
              The frontend now reflects the shared SIX role catalog, multi-role
              document ownership, and the same routed-role language used in gap
              handling and ingest results.
            </p>
            <p className="supportingCopy">
              Current source: {state.rolesBackend || state.rolesError || "repo role catalog"}.
            </p>
          </article>
        </div>

        <div className="sectionHeading roleSectionHeading">
          <p className="eyebrow">Roles</p>
          <h2>Choose a role lens or scan the full catalog.</h2>
        </div>

        <div className="sampleRow" role="tablist" aria-label="Role filters">
          <button
            className={`ghostChip${selectedRole === "All roles" ? " active" : ""}`}
            onClick={() => setSelectedRole("All roles")}
            type="button"
          >
            All roles
          </button>
          {knownRoles.map((role) => (
            <button
              className={`ghostChip${selectedRole === role ? " active" : ""}`}
              key={role}
              onClick={() => setSelectedRole(role)}
              type="button"
            >
              {role}
            </button>
          ))}
        </div>

        <div className="roleCatalogGrid">
          {knownRoles.map((role) => {
            const entry = getRoleCatalogEntry(role);

            return (
              <article className="roleCard" key={role}>
                <div className="roleCardHeader">
                  <div>
                    <p className="eyebrow">Owning role</p>
                    <h3>{entry.name}</h3>
                  </div>
                  <span className="roleCountBadge">
                    {countDocumentsForRole(state.documents, role)} docs
                  </span>
                </div>
                <p>{entry.description}</p>
                <div className="tagRow">
                  {entry.tags.map((tag) => (
                    <span className="tagChip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <div className="sectionHeading roleSectionHeading">
          <p className="eyebrow">Documents</p>
          <h2>
            {selectedRole === "All roles"
              ? "Recent indexed material"
              : `Recent material tagged for ${selectedRole}`}
          </h2>
        </div>

        <div className="documentListCompact">
          {liveDocuments.length ? (
            liveDocuments.map((document) => (
              <article className="compactDocumentCard" key={getDocumentSource(document)}>
                <div className="documentCardHeader">
                  <div>
                    <p className="eyebrow">Indexed document</p>
                    <h3>{getDocumentSource(document)}</h3>
                  </div>
                  <span className="documentModeBadge">
                    {document.modality || "document"}
                  </span>
                </div>
                <p>
                  Owned by {getDocumentOwners(document)} with {document.chunks ?? "unknown"}{" "}
                  chunks.
                </p>
                <div className="tagRow">
                  {getDocumentRoleList(document).length ? (
                    getDocumentRoleList(document).map((role) => (
                      <span className="subtleRoleChip" key={`${getDocumentSource(document)}-${role}`}>
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="subtleRoleChip">Unassigned</span>
                  )}
                </div>
                <div className="documentMetaRow">
                  <span>Updated {getDocumentUpdated(document)}</span>
                </div>
              </article>
            ))
          ) : (
            <article className="emptyState">
              <p className="eyebrow">Documents</p>
              <h3>No document records loaded</h3>
              <p>
                {state.documentsError ||
                  "Upload a file or switch the role lens once document records are available."}
              </p>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
